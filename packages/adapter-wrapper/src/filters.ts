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
import { Element } from '@salto-io/adapter-api'
import {
  definitions as definitionUtils,
  filters,
  filterUtils,
  references as referenceUtils,
} from '@salto-io/adapter-components'
import { ApiDefinitions } from '@salto-io/adapter-components/src/definitions'
import { collections } from '@salto-io/lowerdash'

const { makeArray } = collections.array

/**
 * Filter creators of all the common filters
 */
// TODON upgrade!
export const createCommonFilters = <
  Co extends definitionUtils.UserConfig,
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string,
>({
  definitions,
  referenceRules,
}: {
  referenceRules?: referenceUtils.FieldReferenceDefinition<never>[]
  config: Co
  definitions: ApiDefinitions<ClientOptions, PaginationOptions, Action>
}): Record<
  string,
  filterUtils.AdapterFilterCreator<
    definitionUtils.UserConfig,
    filterUtils.FilterResult,
    {},
    ClientOptions,
    PaginationOptions,
    Action
  >
> => ({
  // TODON upgrade filters to new def structure
  hideTypes: filters.hideTypesFilterCreator(),
  // fieldReferencesFilter should run after all elements were created
  fieldReferencesFilter: () => ({
    name: 'fieldReferencesFilter',
    onFetch: async (elements: Element[]) => {
      // TODON get rules from arg (not necessarily from config) + allow overriding from config
      await referenceUtils.addReferences({
        elements,
        defs: makeArray(referenceRules).concat(makeArray(definitions.references?.rules)),
      })
    },
  }),
  // referencedInstanceNames: filters.referencedInstanceNamesFilterCreator(), // TODON upgrade
  query: filters.queryFilterCreator({}),
})
