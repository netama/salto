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
import {
  PrimitiveType, BuiltinTypes, isInstanceElement, Element, InstanceElement,
  isObjectType, isField, ObjectType, Field,
} from '@salto-io/adapter-api'
import { collections, values as lowerDashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { CUSTOMIZATIONS } from './customizations'
import {
  API_NAME, METADATA_TYPE, CUSTOM_FIELD, CUSTOM_OBJECT, CUSTOM_OBJECT_DEFINITION_TYPE, INSTANCE_ID,
  ZUORA_CUSTOM_SUFFIX,
} from '../constants'

const { makeArray } = collections.array
const { isDefined } = lowerDashValues
const log = logger(module)

export const toPrimitiveType = (val: string | string[] | undefined): PrimitiveType => {
  const swaggerTypeMap: Record<string, PrimitiveType> = {
    // TODON also support restrictions?
    // openapi3
    string: BuiltinTypes.STRING,
    boolean: BuiltinTypes.BOOLEAN,
    number: BuiltinTypes.NUMBER,
    integer: BuiltinTypes.NUMBER,
    // openapi2
    long: BuiltinTypes.NUMBER,
    float: BuiltinTypes.NUMBER,
    double: BuiltinTypes.NUMBER,
    byte: BuiltinTypes.STRING,
    binary: BuiltinTypes.STRING,
    password: BuiltinTypes.STRING,
    // TODON add dedicated type
    date: BuiltinTypes.STRING,
    dateTime: BuiltinTypes.STRING,
  }
  const types = (makeArray(val)
    .map(typeName => swaggerTypeMap[typeName])
    .filter(isDefined))
  if (types.length > 1) {
    log.warn(`Found too many types for ${val} - using first one`)
  }
  if (types[0] !== undefined) {
    return types[0]
  }
  log.error(`Could not find primitive type ${val}, falling back to unknown`)
  return BuiltinTypes.UNKNOWN
}

export const getNameField = (typeName: string): string => (
  CUSTOMIZATIONS.nameFieldOverrides[typeName] ?? CUSTOMIZATIONS.defaultNameField
)

export const getPathField = (typeName: string): string => (
  CUSTOMIZATIONS.pathFieldOverrides[typeName] ?? getNameField(typeName)
)

export const apiName = (elem: Element): string => {
  if (isInstanceElement(elem)) {
    // TODON is fallback needed?
    return elem.annotations[INSTANCE_ID] ?? elem.value[INSTANCE_ID]
  }
  return elem.annotations[API_NAME] ?? elem.annotations[METADATA_TYPE]
}

export const metadataType = (element: Element): string => {
  if (isInstanceElement(element)) {
    return metadataType(element.type)
  }
  if (isField(element)) {
    // We expect to reach to this place only with fields of CustomObject
    return CUSTOM_FIELD
  }
  return element.annotations[METADATA_TYPE] || 'unknown'
}

export const isCustomObject = (element: Element): element is ObjectType => (
  isObjectType(element)
  && metadataType(element) === CUSTOM_OBJECT
)

export const isInstanceOfType = (type: string) => (
  (elem: Element): elem is InstanceElement => (
    isInstanceElement(elem) && apiName(elem.type) === type
  )
)

// This function checks whether an element is an instance of any custom object type.
// It is only relevant before the custom_object filter is run.
export const isInstanceOfCustomObjectDef = (element: Element): element is InstanceElement => (
  isInstanceElement(element) && metadataType(element) === CUSTOM_OBJECT_DEFINITION_TYPE
)

export const isCustomField = (field: Field): boolean => (
  // using the suffix as well because custom fields of standard objects don't always have origin
  field.annotations.origin === 'custom' || field.name.endsWith(ZUORA_CUSTOM_SUFFIX)
)
