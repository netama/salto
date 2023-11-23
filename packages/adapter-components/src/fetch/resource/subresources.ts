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
import { logger } from '@salto-io/logging'
import { FetchResourceDefinition } from '../../definitions/system/fetch/resource'
import { TypeFetcherCreator, ValueGeneratedItem } from '../types'
import { shouldRecurseIntoEntry } from '../../elements/instance_elements' // TODON move

const log = logger(module)

type NestedResourceFetcher = (item: ValueGeneratedItem) => Promise<Record<string, ValueGeneratedItem[]>>

// TODON remove the old code when possible - originally called getExtraFieldValues
export const recurseIntoSubresources = ({ def, typeFetcherCreator, availableResources }: {
  def: FetchResourceDefinition
  typeFetcherCreator: TypeFetcherCreator
  availableResources: Record<string, ValueGeneratedItem[] | undefined>
}): NestedResourceFetcher => async item => (
  Object.fromEntries((await Promise.all(
    Object.entries(def.recurseInto ?? {})
      .filter(([_fieldName, { conditions }]) => shouldRecurseIntoEntry(
        item.value, item.context, conditions
      ))
      .map(async ([fieldName, recurseDef]) => {
        // TODON handle customizer
        const nestedRequestContext = _.mapValues(
          recurseDef.context.args,
          contextDef => _.get(item.value, contextDef.fromField)
        )
        // TODON avoid crashing if fails on sub-element (copy from swagger)!
        const typeFetcher = typeFetcherCreator({
          typeName: recurseDef.typeName,
          context: nestedRequestContext,
        })
        if (typeFetcher === undefined) {
          log.debug('no resource fetcher defined for type %s, cannot recurse into resource', recurseDef.typeName)
          return []
        }
        const recurseRes = await typeFetcher.fetch({ availableResources, typeFetcherCreator })
        if (!recurseRes.success) {
          // TODON throw error
          return []
        }
        return [fieldName, typeFetcher.getItems()]
      })
  )).filter(([_fieldName, nestedEntries]) => !_.isEmpty(nestedEntries)))
)
