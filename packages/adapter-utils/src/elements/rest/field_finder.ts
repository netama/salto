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
import { ObjectType, isListType, isObjectType } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'

const log = logger(module)

export const findDataField = (
  type: ObjectType,
  topLevelIndicatorFields?: string[],
  fieldsToIgnore?: string[],
): string | undefined => {
  if (Object.keys(type.fields).some(
    fieldName => topLevelIndicatorFields?.includes(fieldName)
  )) {
    // the entire object should be used
    return undefined
  }
  const potentialDataFields = _.pickBy(
    type.fields,
    field => (
      !(fieldsToIgnore ?? []).includes(field.name)
      && (isObjectType(field.type)
        || (isListType(field.type) && isObjectType(field.type.innerType)))
    )
  )
  if (!_.isEmpty(potentialDataFields)) {
    const potentialFieldNames = Object.keys(potentialDataFields)
    if (potentialFieldNames.length === 1) {
      return Object.keys(potentialDataFields)[0]
    }
    log.warn(`found too many data fields for ${type.elemID.getFullName()} (${potentialFieldNames}) - returning full element`)
  } else {
    log.error(`could not find data field for ${type.elemID.getFullName()}`)
  }
  return undefined
}
