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
  PrimitiveType, BuiltinTypes, isObjectType, isInstanceElement,
} from '@salto-io/adapter-api'
import { values as lowerDashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { GetLookupNameFunc } from '@salto-io/adapter-utils'
import { ZuoraConfig, API_MODULES_CONFIG, DEFAULT_NAME_FIELD } from '../types'

const { isDefined } = lowerDashValues
const log = logger(module)

export const toPrimitiveType = (val: string[]): PrimitiveType => {
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
  const types = (val
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

export const getNameField = (
  config: ZuoraConfig,
  moduleName: string,
  endpointFieldName?: string,
): string => (
  endpointFieldName
  ?? config[API_MODULES_CONFIG][moduleName].defaultNameField
  ?? config[DEFAULT_NAME_FIELD]
)
