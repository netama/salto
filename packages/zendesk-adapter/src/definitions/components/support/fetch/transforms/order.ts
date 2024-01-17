/*
*                      Copyright 2023 Salto Labs Ltd.
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
import { definitions } from '@salto-io/adapter-components'

type OrderInstanceTransform = (activeFieldName?: string) => definitions.fetch.TransformValueFunc

const toId = (value: { id: string | number }): string | number => value.id

/**
 * Return a "response" split into "active" and "inactive" ids of the relevant type.
 * Assumptions:
 * - Sorting already happened earlier (using sortBy)
 * - the ids will be converted to references in the reference filter
 * @param activeFieldName The field determining whether an item is active or not in the type
 */
export const toOrderValue: OrderInstanceTransform = activeFieldName => value => {
  // TODON add typeguard - pair with each extractor/transform function, and then list them for "easy" use?
  // can have an empty schema in order to skip validation, but require adding something?
  const { items } = value
  if (activeFieldName === undefined) {
    return {
      value: {
        active: items.map(toId),
      },
    }
  }
  const [active, inactive] = _.partition(items, val => val[activeFieldName]).map(group => group.map(toId))

  return {
    active,
    inactive,
  }
}

// TODON improve types
const toTriggersByCategory: definitions.fetch.TransformValueFunc = value => {
  // TODON add typeguard, make sure category_id is always defined
  const { items } = value
  const triggersByCategory = _.groupBy(items, ref => ref.value.category_id)
  return _.mapValues(triggersByCategory, group => toOrderValue('active')({ items: group }))
}

export const toTriggerOrderValue: definitions.fetch.TransformValueFunc = value => {
  // TODON add typeguard!
  const { triggers } = value
  const categories = toTriggersByCategory(value)
  return {
    order: categories.map(category => ({
      category,
      ...triggers[category],
    })),
  }
}
