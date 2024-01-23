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
import { DAG } from '@salto-io/dag'
import { logger } from '@salto-io/logging'
import { isDependsOnDefinition } from '../../definitions/system/fetch'
import { ElementGenerator } from '../element'
import { ElementQuery } from '../query'
// TODON move to types.ts so can define in a better place?
import { Requester } from '../requester'
import { HTTPEndpointIdentifier } from '../../definitions'
import { createTypeResourceFetcher } from './type_fetcher'
import { FetchResourceDefinition } from '../../definitions/system/fetch/resource'
import { TypeFetcherCreator } from '../types'

const log = logger(module)

export type ResourceManager = {
  // orchestrate all requests and transformations needed to fetch all entries matching the specified query,
  // and pass them to the element generator that will turn them into elements
  fetch: (query: ElementQuery) => Promise<void>
}


// // type name -> identifier -> value
// export type ResourceAggregator = {
//   // process an incoming fragment and aggregate under the specified identifier
//   process: (fragment: IdentifiedItem) => void
//   // wait until all requests related to the specified type have completed
//   waitForResourcesOfType(typeName: string): Promise<void>
//   // TODON improve to make this return partial errors as the return value
//   getAllResources: (query: ElementQuery, typeName?: string) => FetchItemGenerator
// }


/*
 * Create a graph with instance ids as nodes and parent annotations+fields as edges
 */
const createDependencyGraph = (defs: Record<string, FetchResourceDefinition>): DAG<undefined> => {
  const graph = new DAG<undefined>()
  Object.entries(_.pickBy(defs, def => def.directFetch)).forEach(([typeName, resource]) => {
    if (resource?.context === undefined) {
      graph.addNode(typeName, [], undefined)
      return
    }
    // TODON make sure we handle custom - this should use a default function that can be overwritten
    // (and same everywhere else where a function can customize this)
    const dependsOnTypes = _.uniq(Object.values(resource.context.args)
      .filter(isDependsOnDefinition).map(arg => arg.typeName))
    graph.addNode(typeName, dependsOnTypes, undefined)
  })

  // TODON make sure throws on cycles (and see if can catch all potential ones earlier)
  return graph
}

export const createResourceManager = ({
  adapterName,
  accountName,
  resourceDefs,
  typeToEndpoints,
  requester,
  elementGenerator,
  initialRequestContext,
}: {
  adapterName: string
  accountName: string
  resourceDefs: Record<string, FetchResourceDefinition>
  typeToEndpoints: Record<string, HTTPEndpointIdentifier[]>
  requester: Requester
  elementGenerator: ElementGenerator
  initialRequestContext?: Record<string, unknown>
}): ResourceManager => ({
  fetch: log.time(() => async query => {
    // TODON simplify?
    const createTypeFetcher: TypeFetcherCreator = ({ typeName, context }) => (createTypeResourceFetcher({
      adapterName,
      accountName,
      typeName,
      defs: resourceDefs,
      typeToEndpoints,
      query,
      requester,
      initialRequestContext: _.defaults({}, initialRequestContext, context),
    }))
    const directFetchResourceDefs = _.pickBy(resourceDefs, def => def.directFetch)
    const resourceFetchers = _.mapValues(
      directFetchResourceDefs,
      (_def, typeName) => createTypeFetcher({ typeName })
    )
    const graph = createDependencyGraph(resourceDefs)
    await graph.walkAsync(async typeName => {
      const resourceFetcher = resourceFetchers[typeName]
      // TODON improve performance - only get the context from the dependsOn types
      const availableResources = _.mapValues(
        _.pickBy(resourceFetchers, fetcher => fetcher.done),
        fetcher => fetcher.getItems()
      )
      const res = await resourceFetcher.fetch({
        availableResources,
        typeFetcherCreator: createTypeFetcher,
      }) // TODON handle context
      if (!res.success) {
        // TODON need a way to pass the errors back - by passing to the element generator?
        // TODON when entering a type, should check again if there was success on dependent types - and if not, exit
        return
      }
      // TODON pass errers to the generator so that it produces them at the end?
      elementGenerator.processEntries({
        typeName: String(typeName),
        entries: resourceFetcher.getItems()?.map(item => item.value) ?? [],
      })
    })
  }, 'fetching resources for account %s (%s)', accountName, adapterName),
})

/*
TODON then -
V 1. get all top-level types, excluding the recurseInto types
V 2. create a dependency graph between them, and traverse from the roots (starting as BFS but async...)
3. child types wait for all their parents to return, then use MACHPELA CARTEZIT on context args
-- before making a request, make sure all context args are there - if not, fail
4. inside each type - first fetch "main" resource, then recurseInto (recursively...)
4. resource fetcher makes the typeToEndpoints calls, providing the "requester" context and awaiting completion +
    add a place to return by request context
5. requesters provide a request() interface that yields events per generated type + cache requests made?
*/
