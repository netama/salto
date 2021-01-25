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

import { ObjectType, Field, isListType, isObjectType } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'

const log = logger(module)

export const findNesteField = (type: ObjectType, adapterPaginationFields: string[]): {
  field: Field
  type: ObjectType
} | undefined => {
  const potentialFields = (Object.values(type.fields)
    .filter(field => !adapterPaginationFields.includes(field.name)))

  if (potentialFields.length > 1) {
    log.info('found more than one nested field for type %s: %s, extracting full entry',
      type.elemID.name, potentialFields.map(f => f.name))
    return undefined
  }
  if (potentialFields.length === 0) {
    log.info('could not find nested fields for type %s, extracting full entry',
      type.elemID.name)
    return undefined
  }
  const nestedField = potentialFields[0]
  const nestedType = (isListType(nestedField.type)
    ? nestedField.type.innerType
    : nestedField.type)

  if (!isObjectType(nestedType)) {
    log.info('unexpected field type for type %s field %s (%s), extracting full entry',
      type.elemID.name, nestedField.name, nestedType.elemID.getFullName())
    return undefined
  }

  return {
    field: nestedField,
    type: nestedType,
  }
}
