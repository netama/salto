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
import { DAG } from '@salto-io/dag'
import { logger } from '@salto-io/logging'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { ElementGenerator } from '../element/element'
import { ElementQuery } from '../query'
// TODON move to types.ts so can define in a better place?
import { Requester } from '../request/requester'
import { DefQuery } from '../../definitions'
import { createTypeResourceFetcher } from './type_fetcher'
import { FetchResourceDefinition } from '../../definitions/system/fetch/resource'
import { TypeFetcherCreator } from '../types'

const log = logger(module)

export type ResourceManager = {
  // orchestrate all requests and transformations needed to fetch all entries matching the specified query,
  // and pass them to the element generator that will turn them into elements
  fetch: (query: ElementQuery) => Promise<void>
}

/*
 * Create a graph with dependencies between resources based on the dependsOn definitions
 */
const createDependencyGraph = (defs: Record<string, FetchResourceDefinition>): DAG<undefined> => {
  const graph = new DAG<undefined>()
  Object.entries(_.pickBy(defs, def => def.directFetch)).forEach(([typeName, resource]) => {
    if (resource?.context?.dependsOn === undefined) {
      graph.addNode(typeName, [], undefined)
      return
    }
    // TODON make sure we handle custom - this should use a default function that can be overwritten
    // (and same everywhere else where a function can customize this)
    const dependsOnTypes = _.uniq(Object.values(resource.context.dependsOn).map(arg => arg.parentTypeName))
    graph.addNode(typeName, dependsOnTypes, undefined)
  })

  // TODON make sure throws on cycles (and see if can catch all potential ones earlier)
  return graph
}

export const createResourceManager = <ClientOptions extends string>({
  adapterName,
  resourceDefQuery,
  requester,
  elementGenerator,
  initialRequestContext,
  isErrorTurnToConfigSuggestion,
}: {
  adapterName: string
  resourceDefQuery: DefQuery<FetchResourceDefinition>
  requester: Requester<ClientOptions>
  elementGenerator: ElementGenerator
  initialRequestContext?: Record<string, unknown>
  isErrorTurnToConfigSuggestion?: (error: Error) => boolean
}): ResourceManager => ({
    fetch: log.time(() => async query => {
      // TODON simplify?
      const createTypeFetcher: TypeFetcherCreator = ({ typeName, context }) => (createTypeResourceFetcher({
        adapterName,
        typeName,
        resourceDefQuery,
        query,
        requester,
        initialRequestContext: _.defaults({}, initialRequestContext, context),
      }))
      const directFetchResourceDefs = _.pickBy(resourceDefQuery.getAll(), def => def.directFetch)
      const resourceFetchers = _.pickBy(
        _.mapValues(
          directFetchResourceDefs,
          (_def, typeName) => createTypeFetcher({ typeName })
        ),
        lowerdashValues.isDefined,
      )
      const graph = createDependencyGraph(resourceDefQuery.getAll())
      await graph.walkAsync(async typeName => {
        const resourceFetcher = resourceFetchers[typeName]
        if (resourceFetcher === undefined) {
          log.debug('no resource fetcher defined for type %s:%s', adapterName, typeName)
          return
        }
        // TODON improve performance - only get the context from the dependsOn types
        const availableResources = _.mapValues(
          _.pickBy(resourceFetchers, fetcher => fetcher.done()),
          fetcher => fetcher.getItems()
        )
        try {
          const res = await resourceFetcher.fetch({
            availableResources,
            typeFetcherCreator: createTypeFetcher,
          }) // TODON handle context
          if (!res.success) {
            // TODON need a way to pass the errors back - by passing to the element generator?
            // TODON when entering a type, should check again if there was success on dependent types - and if not, exit
            log.warn('failed to fetch type %s:%s: %s', adapterName, typeName)
            return
          }
          // TODON pass errers to the generator so that it produces them at the end?
          elementGenerator.pushEntries({
            typeName: String(typeName), // TDOON avoid conversion?
            entries: resourceFetcher.getItems()?.map(item => item.value) ?? [],
          })
        } catch (e) {
          if (isErrorTurnToConfigSuggestion?.(e)) {
            log.error('TODO turn into config suggestion') // TODON
          }
          throw e
        }
      })
    }, '[%s] fetching resources for account', adapterName),
  })
