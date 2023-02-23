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
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { definitions } from '@salto-io/adapter-components'
import { Values } from '@salto-io/adapter-api'

type OrderInstanceTransform = (args: {
  activeFieldName?: string
  sortByFields: string[]
}) => definitions.fetch.ResourceTransformFunc

// TODON enforce string-or-number?
const toId = (value: Values): unknown => value.id

/**
 * Return a "response" split into "active" and "inactive" ids of the relevant type.
 * Assumptions:
 * - Sorting already happened earlier (using sortBy)
 * - the ids will be converted to references in the reference filter
 * @param activeFieldName The field determining whether an item is active or not in the type
 */
export const toOrderValue: OrderInstanceTransform = ({ activeFieldName, sortByFields }) => ({ context }) => {
  // TODON add typeguard - pair with each extractor/transform function, and then list them for "easy" use?
  // can have an empty schema in order to skip validation, but require adding something?
  const { fragments } = context // TODON continue

  const items = fragments
    .map(f => f.value)
    .filter(lowerdashValues.isPlainRecord)
    .flatMap(entry => entry.items)
    .filter(lowerdashValues.isPlainRecord)

  const sortedItems = _.sortBy(items, sortByFields)
  if (activeFieldName === undefined) {
    return {
      value: {
        active: sortedItems.map(toId),
      },
    }
  }
  const [active, inactive] = _.partition(items, val => val[activeFieldName]).map(group => group.map(toId))

  return {
    value: {
      active,
      inactive,
    },
  }
}

// const toTriggersByCategory = ({ value }: { value: Values }): Values => { // TODON switch to using fragments
//   // TODON add typeguard, make sure category_id is always defined
//   const { items } = value // TODON adjust, didn't update
//   const triggersByCategory = _.groupBy(items, ref => ref.value.category_id)
//   // TODON passing empty fragments is a bit of a hack, decide if ok
//   return _.mapValues(
//     triggersByCategory,
//     group => toOrderValue({ activeFieldName: 'active', sortByFields: ['position', 'title'] })({
//       typeName: 'trigger_order', // TODON not really, but doesn't matter
//       value: { items: group },
//       context: { fragments: [] },
//     }),
//   )
// }

// TODON continue, not working yet
// TODON alternatively - expose the fetcher + element generator to the filters, and have them create the type
// correctly (+ elem ids)
export const toTriggerOrderValue: definitions.fetch.ResourceTransformFunc = ({
  /* context, */ value,
// eslint-disable-next-line arrow-body-style
}) => { // TODON switch to fragments
  // TODON add typeguard!
  return { value: value as Values }
  // const { fragments } = context // TODON continue
  // const fragmentValues = fragments.map(f => f.value).filter(lowerdashValues.isPlainRecord)

  // const categories = fragmentValues
  //   .flatMap(entry => entry.categories)
  //   .filter(lowerdashValues.isPlainRecord)

  // const triggers = fragmentValues
  //   .flatMap(entry => entry.triggers)
  //   .filter(lowerdashValues.isPlainRecord)

  // const sortedItems = _.sortBy(items, sortByFields)

  // const triggersByCategory = toTriggersByCategory({ value }) // TODON categories?
  // return {
  //   value: {
  //     order: categories.map(category => ({
  //       category,
  //       ...triggersByCategory[category],
  //     })),
  //   },
  // }
}
