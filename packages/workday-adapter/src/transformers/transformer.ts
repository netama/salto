/*
*                      Copyright 2020 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import _ from 'lodash'
import {
  PrimitiveType, BuiltinTypes, Values, ObjectType, isListType, isObjectType, isInstanceElement,
  InstanceElement, isEqualElements, Field,
} from '@salto-io/adapter-api'
import { values as lowerDashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { GetLookupNameFunc, transformElement } from '@salto-io/adapter-utils'
import { WORKDAY_ID_FIELDNAME, ALL_IDS_FIELDNAME } from '../constants'
import { APIReferenceIDType, SaltoReferenceIDType, isReferenceIDFieldType } from '../client/types'

const { isDefined } = lowerDashValues
const log = logger(module)

export const toPrimitiveType = (val: string): PrimitiveType => {
  // TODON extend? is there a json type?
  const xsdTypeMap: Record<string, PrimitiveType> = {
    'xsd:string': BuiltinTypes.STRING,
    'xsd:boolean': BuiltinTypes.BOOLEAN,
    'xsd:double': BuiltinTypes.NUMBER,
    'xsd:float': BuiltinTypes.NUMBER,
    'xsd:int': BuiltinTypes.NUMBER,
    'xsd:long': BuiltinTypes.NUMBER,
    'xsd:decimal': BuiltinTypes.NUMBER,
    // TODON add dedicated types?
    'xsd:date': BuiltinTypes.STRING,
    'xsd:dateTime': BuiltinTypes.STRING,
    'xsd:time': BuiltinTypes.STRING,
    RichText: BuiltinTypes.STRING,
    'xsd:base64Binary': BuiltinTypes.STRING,
  }
  // TODON check if should use the other parts for restrictions, restrict enums
  const type = (val.split('|')
    .map(typeName => (typeName.endsWith('Enumeration') ? 'xsd:string' : typeName))
    .map(typeName => xsdTypeMap[typeName])
    .find(isDefined))
  if (type !== undefined) {
    return type
  }
  log.error(`Could not find primitive type ${val}, falling back to string`)
  return BuiltinTypes.STRING
}

const REF_TYPE_FIELDS = new Set(['ID[]', 'targetNSAlias', 'targetNamespace'])
export const isIDRefDef = (field: Values): boolean => (
  // TODON check more carefully
  _.isEqual(new Set(Object.keys(field)), REF_TYPE_FIELDS)
)

export const fromIDRefDef = (
  value: { ID?: APIReferenceIDType[] }
): SaltoReferenceIDType[] | undefined => (
  value.ID?.map(id => ({
    value: id.$value,
    attributes: (id.attributes['wd:parent_id'] !== undefined
      ? {
        type: id.attributes['wd:type'],
        parentID: id.attributes['wd:parent_id'],
        parentType: id.attributes['wd:parent_type'],
      }
      : { type: id.attributes['wd:type'] }),
  }))
)

export const toIDRefDef = (ids?: SaltoReferenceIDType[]):
    { ID: APIReferenceIDType[] } | undefined => (
  ids !== undefined
    ? {
      ID: ids.map(id => ({
        $value: id.value,
        attributes: (id.attributes.parentID !== undefined
          ? {
            'wd:type': id.attributes.type,
            'wd:parent_id': id.attributes.parentID,
            'wd:parent_type': id.attributes.parentType,
          }
          : { 'wd:type': id.attributes.type }),
      })),
    }
    : undefined
)

export const normalizeFieldName = (fieldName: string): { name: string; isList: boolean} => ({
  name: _.trimEnd(fieldName, '[]'),
  isList: fieldName.endsWith('[]'),
})

export const findResponseType = (apiName: string, outputSchema: ObjectType): {
  fieldName: string
  objType: ObjectType
 } => {
  const findDataField = (dataType: ObjectType): string => {
    const nonWIDFields = _.omit(dataType.fields, WORKDAY_ID_FIELDNAME)
    if (Object.keys(nonWIDFields).length === 1) {
      return Object.keys(nonWIDFields)[0]
    }
    const potentialDataFields = _.pickBy(
      dataType.fields,
      // TODON still ugly - move to config as well?
      (f, name) => isListType(f.type) || apiName.includes(name.slice(0, 5).slice(0, -3))
    )
    if (Object.keys(potentialDataFields).length > 0) {
      return Object.keys(potentialDataFields)[0]
    }
    throw new Error(`Could not find response field for api ${apiName}`)
  }

  const responseDataType = outputSchema.fields.Response_Data?.type
  if (!isObjectType(responseDataType)) {
    // TODON ensure always there, add exceptions to config
    throw new Error(`Unexpected type for Response_Data: ${outputSchema.fields.Response_Data?.type.elemID.getFullName()}`)
  }

  const fieldName = findDataField(responseDataType)
  const field = responseDataType.fields[fieldName]
  const objType = isListType(field.type) ? field.type.innerType : field.type
  if (!isObjectType(objType)) {
    throw new Error(`Unexpected type for field ${fieldName}: ${field.type.elemID.getFullName()}`)
  }
  return { fieldName, objType }
}

export const findFields = (objType: ObjectType, dataType?: ObjectType): {
  dataFieldName: string
  dataFieldType: ObjectType
  referenceFieldName?: string
} => {
  const findFieldWithSuffix = (inType: ObjectType, suffix: string): string | undefined => (
    Object.keys(inType.fields).find(name => name.endsWith(suffix))
  )
  const isFieldOfType = (field: Field, type: ObjectType): boolean => {
    const fieldType = isListType(field.type) ? field.type.innerType : field.type
    return isEqualElements(fieldType, type)
  }

  const dataFieldName = (
    (dataType !== undefined
      && Object.values(objType.fields).find(f => isFieldOfType(f, dataType))?.name)
    || findFieldWithSuffix(objType, '_Data'))
  if (dataFieldName === undefined) {
    throw new Error(`Could not find data field in type ${objType.elemID.getFullName()}`)
  }
  const dataField = objType.fields[dataFieldName]
  const dataFieldType = (isListType(dataField.type)
    ? dataField.type.innerType
    : dataField.type) as ObjectType

  const referenceFieldName = (Object.values(objType.fields)
    .filter(f => isReferenceIDFieldType(f.type))
    .find(f => f.name.endsWith('_Reference'))
    ?.name)

  return {
    dataFieldName,
    dataFieldType,
    referenceFieldName,
  }
}

export const getLookUpName: GetLookupNameFunc = ({ ref }) => {
  const { value } = ref
  if (isInstanceElement(value)) {
    return value.value.WID
  }
  if (isObjectType(value)) {
    // TODON needed for the back-references - should replace with an API_NAME annotation
    return value.elemID.name
  }
  return value
}

export const toPutRequest = (
  instance: InstanceElement, dataFieldName: string, referenceFieldName?: string,
): Values => {
  const deployableInstance = transformElement({
    element: instance,
    transformFunc: ({ value, field }) => {
      if (field && isReferenceIDFieldType(field.type)) {
        return toIDRefDef(value.ID)
      }
      return value
    },
    strict: false,
  })
  const deployableValue = _.omit(
    deployableInstance.value,
    [WORKDAY_ID_FIELDNAME, ALL_IDS_FIELDNAME]
  )
  // TODON decide when to include the WID
  const ref = toIDRefDef(instance.value[ALL_IDS_FIELDNAME])
  log.info('PUT request for %s: dataFieldName=%s, referenceFieldName=%s, ref=%o',
    instance.elemID.getFullName(), dataFieldName, referenceFieldName, ref)
  return {
    [dataFieldName]: deployableValue,
    ...(referenceFieldName !== undefined && ref !== undefined
      ? { [referenceFieldName]: ref }
      : {}),
  }
}
