/*
*                      Copyright 2024 Salto Labs Ltd.
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
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { PageEntriesExtractor } from '../../client'
import { getAllElements } from '../ducktype' // TODON move to shared location

const { makeArray } = collections.array
const { isPlainRecord } = lowerdashValues
const log = logger(module)

// TODON might lost performance optimizations for jira!!! check

// TODON used for special case - make sure covered...
// const isAdditionalPropertiesOnlyObjectType = (type: ObjectType): boolean => (
//   _.isEqual(Object.keys(type.fields), [ADDITIONAL_PROPERTIES_FIELD])
// )

// TODON dead code - but need to adjust tests before removing
export const extractPageEntriesByNestedField = (fieldName?: string): PageEntriesExtractor => (
  page => {
    const allEntries = (fieldName !== undefined
      ? makeArray(_.get(page, fieldName))
      : makeArray(page))
    const [validEntries, invalidEntries] = _.partition(allEntries, isPlainRecord)
    if (invalidEntries.length > 0) {
      log.error('omitted %d invalid entries: %s', invalidEntries.length, safeJsonStringify(invalidEntries))
    }
    return validEntries
  }
)

/**
 * Get all instances from all types included in the fetch configuration.
 */
export const getAllInstances = getAllElements // TODON consolidate better
