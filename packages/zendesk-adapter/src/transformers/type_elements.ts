/*
*                      Copyright 2021 Salto Labs Ltd.
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
  ObjectType, ElemID, BuiltinTypes, Values, MapType, PrimitiveType, ListType, isObjectType,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase } from '@salto-io/adapter-utils'
import { ZENDESK, TYPES_PATH, SUBTYPES_PATH, NAMESPACE_SEPARATOR, GET_ENDPOINT_SCHEMA_ANNOTATION, GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION } from '../constants'

type ObjectTypeWithNestedTypes = {
  type: ObjectType
  nestedTypes: ObjectType[]
}

type NestedTypeWithNestedTypes = {
  type: ObjectType | ListType | PrimitiveType
  nestedTypes: ObjectType[]
}

const generateNestedType = ({ typeName, parentName, entries, hasDynamicKeys }: {
  typeName: string
  parentName: string
  entries: Values[]
  hasDynamicKeys: boolean
}): NestedTypeWithNestedTypes => {
  const name = `${parentName}${NAMESPACE_SEPARATOR}${typeName}`
  if (entries.length > 0) {
    if (entries.every(entry => Array.isArray(entry))) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const nestedType = generateNestedType({
        typeName,
        parentName,
        entries: entries.flat(),
        hasDynamicKeys,
      })
      return {
        type: new ListType(nestedType.type),
        nestedTypes: (isObjectType(nestedType.type)
          ? [nestedType.type, ...nestedType.nestedTypes]
          : nestedType.nestedTypes),
      }
    }

    if (entries.every(entry => _.isObjectLike(entry))) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return generateType(name, entries, hasDynamicKeys, true)
    }

    // primitive types
    if (entries.every(entry => _.isString(entry))) {
      return {
        type: BuiltinTypes.STRING,
        nestedTypes: [],
      }
    }
    if (entries.every(entry => _.isFinite(entry))) {
      return {
        type: BuiltinTypes.NUMBER,
        nestedTypes: [],
      }
    }
    if (entries.every(entry => _.isBoolean(entry))) {
      return {
        type: BuiltinTypes.BOOLEAN,
        nestedTypes: [],
      }
    }
  }

  return {
    type: BuiltinTypes.UNKNOWN,
    nestedTypes: [],
  }
}

export const generateType = (
  name: string, entries: Values[], hasDynamicKeys: boolean, isSubType = false,
): ObjectTypeWithNestedTypes => {
  const naclName = naclCase(name)
  const path = (isSubType
    ? [ZENDESK, TYPES_PATH, SUBTYPES_PATH, ...naclName.split(NAMESPACE_SEPARATOR).map(pathNaclCase)]
    : [ZENDESK, TYPES_PATH, pathNaclCase(naclName)])

  const nestedTypes: ObjectType[] = []
  const addNestedType = (
    typeWithNested: NestedTypeWithNestedTypes
  ): ObjectType | ListType | PrimitiveType => {
    if (isObjectType(typeWithNested.type)) {
      nestedTypes.push(typeWithNested.type)
    }
    nestedTypes.push(...typeWithNested.nestedTypes)
    return typeWithNested.type
  }

  const fields = hasDynamicKeys
    ? { value: { type: new MapType(BuiltinTypes.UNKNOWN) } } // TODON improve nested structure
    : Object.fromEntries(
      _.uniq(entries.flatMap(e => Object.keys(e)))
        .map(fieldName => [
          fieldName,
          {
            type: addNestedType(generateNestedType({
              typeName: fieldName,
              parentName: name,
              entries: entries.map(entry => entry[fieldName]).filter(entry => entry !== undefined),
              hasDynamicKeys: false,
            })),
          },
        ])
    )

  const type = new ObjectType({
    elemID: new ElemID(ZENDESK, naclName),
    fields,
    path,
  })

  return { type, nestedTypes }
}

export const addGetEndpointAnnotations = (
  type: ObjectType,
  apiEndpoint: string,
  dataField?: string,
): void => {
  type.annotationTypes[GET_ENDPOINT_SCHEMA_ANNOTATION] = new ListType(BuiltinTypes.STRING)
  type.annotationTypes[GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION] = BuiltinTypes.STRING
  type.annotations[GET_ENDPOINT_SCHEMA_ANNOTATION] = [apiEndpoint]
  if (dataField !== undefined) {
    type.annotations[GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION] = dataField
  }
}
