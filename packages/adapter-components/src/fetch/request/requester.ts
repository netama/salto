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
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ResponseValue } from '../../client'
import { ContextParams, GeneratedItem } from '../../definitions/system/shared'
import { ApiDefinitions, DefQuery, queryWithDefault } from '../../definitions'
import { ResourceIdentifier, ValueGeneratedItem } from '../types'
import { findAllUnresolvedArgs } from './utils'
import { createValueTransformer } from '../utils'
import { traversePages } from './pagination/pagination'
import { noPagination } from './pagination'
import { FetchRequestDefinition } from '../../definitions/system/fetch/fetch'
import { computeArgCombinations } from '../resource/request_parameters'

const log = logger(module)

export type Requester<ClientOptions extends string> = {
  request: (args: {
    requestDef: FetchRequestDefinition<ClientOptions>
    contexts: ContextParams[]
    typeName: string
  // TODON improve to make this return partial errors as the return value
  }) => Promise<ValueGeneratedItem[]>

  requestAllForResource: (args: { // TODON see if needed
    contextPossibleArgs: Record<string, unknown[]>
    callerIdentifier: ResourceIdentifier
  // TODON improve to make this return partial errors as the return value
  }) => Promise<ValueGeneratedItem[]>
}

type ItemExtractor = (pages: ResponseValue[]) => GeneratedItem[]

const createExtractor = <ClientOptions extends string>(
  extractorDef: FetchRequestDefinition<ClientOptions>,
  typeName: string,
): ItemExtractor => {
  const transform = createValueTransformer(extractorDef.transformation)
  // TODON in order to aggregate, assuming got all pages - see if we want to change this to a stream
  return pages => (
    pages.flatMap(page => collections.array.makeArray(transform({
      value: page,
      typeName,
      context: extractorDef.context ?? {},
    })))
  )
}


// TODON action won't be needed once narrowing the definitions type?
export const getRequester = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
>({
    // adapterName,
    clients,
    pagination,
    requestDefQuery,
    // responseCache, // TODON move to client? or keep here? make optional
  }: {
  adapterName: string
  clients: ApiDefinitions<ClientOptions, PaginationOptions>['clients']
  pagination: ApiDefinitions<ClientOptions, PaginationOptions>['pagination']
  requestDefQuery: DefQuery<FetchRequestDefinition<ClientOptions>[]>
  // responseCache?: Record<string, unknown>
}): Requester<ClientOptions> => {
  const clientDefs = _.mapValues(
    clients.options,
    ({ endpoints, ...def }) => ({
      endpoints: queryWithDefault(endpoints),
      ...def,
    })
  )

  const request: Requester<ClientOptions>['request'] = async ({ contexts, requestDef, typeName }) => {
    // TODON optimization - cache only the "unconsumed" extracted items by request hash,
    // and keep them available until consumed
    // TODON another optimization - add promises for in-flight requests, to avoid making the same request
    // multiple times in parallel
    const { endpoint: requestEndpoint } = requestDef
    const clientName = requestEndpoint.client ?? clients.default
    const clientDef = clientDefs[clientName]
    const endpointDef = clientDef.endpoints.query(requestEndpoint.path)?.[requestEndpoint.method ?? 'get']
    if (!endpointDef?.readonly) {
      throw new Error(`Endpoint ${clientName}.${requestEndpoint.path}:${requestEndpoint.method} is not marked as readonly, cannot use in fetch`)
    }
    // TODON check if there are any remaining args that have not been replaced!!!
    const paginationOption = endpointDef?.pagination
    const paginationDef = paginationOption !== undefined
      ? pagination[paginationOption]
      : { funcCreator: noPagination, clientArgs: undefined }

    const { clientArgs } = paginationDef
    // order of precedence in case of overlaps: pagination defaults < endpoint < resource-specific request
    const mergedDef = _.merge({}, clientArgs, endpointDef, requestEndpoint)

    const extractor = createExtractor(requestDef, typeName)

    const callArgs = (mergedDef.omitBody
      ? _.pick(mergedDef, ['queryArgs', 'headers'])
      : _.pick(mergedDef, ['queryArgs', 'headers', 'body']))

    const pagesWithContext = await traversePages({
      client: clientDef.httpClient,
      paginationDef,
      endpointIdentifier: requestEndpoint,
      contexts,
      callArgs,
    })

    const itemsWithContext = pagesWithContext
      .map(({ context, pages }) => ({ items: extractor(pages), context }))
      .flatMap(({ items, context }) => items.flatMap(item => ({ ...item, context })))
    return itemsWithContext
      .filter(item => {
        if (!lowerdashValues.isPlainRecord(item.value)) {
          log.warn('extracted invalid item for endpoint %s.%s:%s %s',
            clientName, requestEndpoint.path, requestEndpoint.method ?? 'get', typeName)
          return false
        }
        return true
      }) as ValueGeneratedItem[]
  }

  const requestAllForResource: Requester<ClientOptions>['requestAllForResource'] = async ({
    callerIdentifier, contextPossibleArgs,
  }) => (
    (await Promise.all((requestDefQuery.query(callerIdentifier.typeName) ?? []).map(requestDef => {
      // TODON get and replace args in all parts of the definition!
      const allArgs = findAllUnresolvedArgs(requestDef.endpoint.path)
      const relevantArgRoots = _.uniq(allArgs.map(arg => arg.split('.')[0]).filter(arg => arg.length > 0))
      const contexts = computeArgCombinations(contextPossibleArgs, relevantArgRoots)
      return request({
        contexts,
        requestDef,
        typeName: callerIdentifier.typeName,
      })
    }))).flat()
  )

  return { request, requestAllForResource }
}
