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
import { logger } from '@salto-io/logging'
import { values as lowerDashValues } from '@salto-io/lowerdash'
import {
  PrimitiveType, ObjectType, ElemID, Field, ListType, BuiltinTypes, TypeElement,
  ReferenceExpression,
  isListType,
} from '@salto-io/adapter-api'
import { naclCase, pathNaclCase } from '@salto-io/adapter-utils'
import { isIDRefDef, normalizeFieldName, toPrimitiveType } from './transformer'
import { TypeMapper, ClientOperationMessageTypes, isIDReferenceType, IDReferenceTypeFields } from '../client/types'
import {
  TYPES_PATH, WORKDAY, SUBTYPES_PATH, ENDPOINTS_PATH, WORKDAY_ID_FIELDNAME, PUT_API_PREFIX,
  REQUEST_FOR_PUT_ENDPOINT_ANNOTATION, PUT_REQUEST_SCHEMA_ANNOTATION,
} from '../constants'

const { isDefined } = lowerDashValues
const log = logger(module)

const findDataField = (type: ObjectType): Field | undefined => {
  // TODON handle edge cases
  const dataFields = Object.values(type.fields).filter(field =>
    !isIDReferenceType(field.type))

  if (dataFields.length > 1) {
    log.error('Found too many fields in PUT request schema %s: %s',
      type.elemID.name,
      dataFields.map(f => f.name))
    return dataFields.find(field => field.name.endsWith('_Data'))
  }
  return dataFields[0]
}

export const generateTypes = (
  { types, fieldLookup }: TypeMapper,
  typesByClientAndEndpoint: ClientOperationMessageTypes,
): Record<string, TypeElement> => {
  const definedTypes: Record<string, ObjectType> = {}

  const toType = (
    typeName: string,
    isEndpointRoot = false,
    pathRoot = [TYPES_PATH],
  ): PrimitiveType | ObjectType | undefined => {
    const createObjectType = (
      objName: string,
      isEndpointRootObj: boolean,
    ): ObjectType => {
      if (definedTypes[objName] === undefined) {
        const typeDef = types[objName] ?? {}
        const naclObjName = naclCase(objName)
        if (isIDRefDef(typeDef)) {
          definedTypes[objName] = new ObjectType({
            elemID: new ElemID(WORKDAY, naclObjName),
            fields: IDReferenceTypeFields,
            path: [WORKDAY, ...pathRoot, SUBTYPES_PATH, 'WID_Reference'],
            annotationTypes: {
              [REQUEST_FOR_PUT_ENDPOINT_ANNOTATION]: BuiltinTypes.STRING,
            },
          })
        } else {
          // first add an empty type, to avoid endless recursion in cyclic references from fields
          definedTypes[objName] = new ObjectType({
            elemID: new ElemID(WORKDAY, naclObjName),
            // TODON organize better in folders
            path: isEndpointRootObj
              ? [WORKDAY, ...pathRoot,
                pathNaclCase(naclObjName)]
              // TODON move '_' to constant (in naclCase impl)
              : [WORKDAY, ...pathRoot, SUBTYPES_PATH,
                pathNaclCase(naclObjName).split('_')[0], pathNaclCase(naclObjName)],
            annotationTypes: {
              [PUT_REQUEST_SCHEMA_ANNOTATION]: BuiltinTypes.STRING,
            },
          })
          const fieldMap = fieldLookup[objName]
          const listFields = new Set(Object.keys(typeDef)
            .map(fieldName => normalizeFieldName(fieldName))
            .filter(f => f.isList)
            .map(f => f.name))

          Object.assign(
            definedTypes[objName].fields,
            _.pickBy(
              Object.fromEntries(Object.entries(fieldMap).map(([fieldName, fieldTypeName]) => {
                // The rest goes to Types - objects referenced directly from endpoints
                // will be at the root
                const fieldType = toType(fieldTypeName, pathRoot[0] === ENDPOINTS_PATH)
                if (fieldType === undefined) {
                  // shouldn't happen
                  // TODON verify
                  log.error(`Could not determine field type for ${objName}.${fieldName}. Omitting the field`)
                  return [fieldName, undefined]
                }
                return [fieldName, new Field(
                  definedTypes[objName],
                  fieldName,
                  listFields.has(fieldName) ? new ListType(fieldType) : fieldType,
                )]
              })),
              isDefined,
            ),
            pathRoot[0] === ENDPOINTS_PATH
              ? {}
              // TODON don't add for endpoint objects
              : {
                // Everything has a globally-unique WID (may be inconsistent between tenants)
                [WORKDAY_ID_FIELDNAME]: new Field(
                  definedTypes[objName],
                  WORKDAY_ID_FIELDNAME,
                  BuiltinTypes.SERVICE_ID,
                  // TODON decide if should be hidden / visible with some handling for multienv
                ),
              },
          )
        }
      }
      return definedTypes[objName]
    }
    if (fieldLookup[typeName] !== undefined) {
      return createObjectType(typeName, isEndpointRoot)
    }
    return toPrimitiveType(typeName)
  }

  Object.entries(typesByClientAndEndpoint).forEach(([cliName, endpointMessages]) => {
    const messageNames = (Object.values(endpointMessages)
      .flatMap(endpointDef => [endpointDef.input, endpointDef.output])
      .flat()
      .filter(isDefined))

    messageNames.forEach(messageName => {
      toType(messageName, true, [ENDPOINTS_PATH, cliName])
    })

    // add references back to the relevant PUT endpoint, to simplify deployments
    const putEndpoints = Object.keys(endpointMessages).filter(name =>
      name.startsWith(PUT_API_PREFIX))

    putEndpoints.forEach(endpointName => {
      const requestSchemaName = typesByClientAndEndpoint[cliName][endpointName]?.input
      const requestType = definedTypes[requestSchemaName]
      // TODON add handling for non-unique cases + log
      requestType.annotate({
        [REQUEST_FOR_PUT_ENDPOINT_ANNOTATION]: `${cliName}.${endpointName}`,
      })

      const dataField = findDataField(requestType)
      if (dataField === undefined) {
        log.error('Could not find data field for PUT request schema %s', requestType.elemID.name)
      } else {
        const dataType = isListType(dataField.type) ? dataField.type.innerType : dataField.type
        if (dataType.annotations[PUT_REQUEST_SCHEMA_ANNOTATION] !== undefined) {
          // TODON improve handling
          log.error('Type %s is already associated with a put request, not setting to %s',
            dataType.elemID.name,
            requestType.elemID.name)
        } else {
          dataType.annotate({
            [PUT_REQUEST_SCHEMA_ANNOTATION]: new ReferenceExpression(requestType.elemID),
          })
        }
      }
    })
  })

  return definedTypes
}
