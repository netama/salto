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
import { ElemIdGetter, isObjectType } from '@salto-io/adapter-api'
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { types } from '@salto-io/lowerdash'
import { ElementQuery } from './query'
import { ApiDefinitions, mergeNestedWithDefault, mergeWithDefault, queryWithDefault } from '../definitions'
import { getUniqueConfigSuggestions } from '../elements/ducktype' // TODON move
import { ProcessedSources } from './source'
import { getRequester } from './request/requester'
import { createResourceManager } from './resource/resource_manager'
import { getElementGenerator } from './element/element'
import { FetchElements } from '../elements'

const log = logger(module)

/**
 * Helper function for the adapter fetch implementation:
 * Given api definitions and a fetch query, make the relevant API calls and convert the
 * response data into a list of instances and types.
 *
 * Flow:
 * - resource fetchers use requesters to generate resource fragmets
 * - resources are aggregated by service id, and when ready sent to the element generator
 * - once all resources have been produced, the element generator generates all instances and types
 */
export const getElements = async <
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
>({
  adapterName,
  fetchQuery,
  definitions,
  processedSources,
  getElemIdFunc,
  isErrorTurnToConfigSuggestion,
  additionalRequestContext,
}: {
  adapterName: string
  fetchQuery: ElementQuery
  definitions: types.PickyRequired<ApiDefinitions<ClientOptions, PaginationOptions>, 'clients' | 'pagination' | 'fetch'>
  processedSources?: ProcessedSources<ClientOptions, PaginationOptions>
  getElemIdFunc?: ElemIdGetter
  isErrorTurnToConfigSuggestion?: (error: Error) => boolean
  additionalRequestContext? : Record<string, unknown>
}): Promise<FetchElements> => {
  const { predefinedTypes, additionalDefs } = processedSources ?? {}
  const mergedDefs = _.merge(
    additionalDefs,
    definitions,
  )
  const { clients, fetch, pagination } = mergedDefs

  const instanceDefs = mergeWithDefault(fetch.instances)

  log.debug('original config: %s', safeJsonStringify(fetch.instances))
  log.debug('merged config: %s', safeJsonStringify(instanceDefs))

  const requester = getRequester<ClientOptions, PaginationOptions>({
    adapterName,
    clients,
    pagination,
    requestDefQuery: queryWithDefault(mergeNestedWithDefault(fetch.instances, 'requests')),
  })

  // TODON make sure the "omit" part of the field adjustments happens *only* when creating the final intsance,
  // so that it can be used up to that point
  const elementGenerator = getElementGenerator({
    adapterName,
    // TODON ensure some values are there? e.g. elemID, by requiring them in the default
    defQuery: queryWithDefault(fetch.instances),
    // TODON decide if want openAPI to have generated object types, or only populated the config
    // TODON when extending to primitives as well, will need to adjust
    predefinedTypes: _.pickBy(predefinedTypes, isObjectType),
    fetchQuery,
    getElemIdFunc,
    isErrorTurnToConfigSuggestion,
  })

  const resourceManager = createResourceManager({
    adapterName,
    resourceDefQuery: queryWithDefault(mergeNestedWithDefault(fetch.instances, 'resource')),
    requester,
    elementGenerator,
    initialRequestContext: additionalRequestContext,
    isErrorTurnToConfigSuggestion,
  })

  await resourceManager.fetch(fetchQuery)

  // only after all queries have completed and all events have been processed we should generate the instances and types
  const { elements, errors, configChanges } = elementGenerator.generate()

  // instance filtering based on the fetch query will be done in the query common filter

  return {
    elements,
    configChanges: getUniqueConfigSuggestions(configChanges ?? []),
    errors,
  }
}
