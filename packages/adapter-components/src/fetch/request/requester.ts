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
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ResponseValue } from '../../client'
import { ContextParams, GeneratedItem } from '../../definitions/system/shared'
import { ApiDefinitions, HTTPEndpointIdentifier, mergeWithDefault } from '../../definitions'
import { TypeEndpointRelations } from '../dependencies'
import { ResourceIdentifier, IdentifiedItem } from '../types'
import { FetchExtractionDefinition } from '../../definitions/system/requests/endpoint'
import { createValueTransformer } from '../utils'
import { traversePages } from './pagination/pagination'
import { noPagination } from './pagination'

const log = logger(module)

export type Requester = {
  // TODON see if can turn into a generator
  request: (args: {
    endpointIdentifier: HTTPEndpointIdentifier
    contexts: ContextParams[]
    callerIdentifier: ResourceIdentifier
  // TODON improve to make this return partial errors as the return value
  }) => Promise<IdentifiedItem[]> // TODON decide if should convert to generator
  // TODON if want to return errors -
  // }) => Generator<IdentifiedItem, { errors?: Record<string, string[]> }>
}

type ItemExtractor = (pages: ResponseValue[]) => GeneratedItem[]

const createExtractor = (extractorDef: FetchExtractionDefinition): ItemExtractor => {
  if (extractorDef.custom !== undefined) {
    return extractorDef.custom(extractorDef)
  }
  const transform = createValueTransformer(extractorDef.transformValue)
  const { toType, context } = extractorDef
  // TODON in order to aggregate, assuming got all pages - see if we want to change this to a stream
  return pages => (
    pages.flatMap(page => collections.array.makeArray(transform({
      value: page,
      typeName: toType,
      context: context ?? {},
    })))
  )
}


// TODON action won't be needed once narrowing the definitions type?
export const getRequester = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  TAdditionalClientArgs extends Record<string, unknown>,
  Action extends string
>({
    adapterName,
    clients,
    pagination,
    endpointToClient, // TODON calculate inside?
    // requestCache, // TODON move to client? or keep here?
  }: {
  adapterName: string
  clients: ApiDefinitions<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>['clients']
  pagination: ApiDefinitions<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>['pagination']
  endpointToClient: TypeEndpointRelations<ClientOptions>['endpointToClient']
  // requestCache?: Record<string, unknown>
}): Requester => {
  const clientDefs = _.mapValues(
    clients.options,
    ({ endpoints, ...def }) => ({
      endpoints: mergeWithDefault(endpoints),
      ...def,
    })
  )

  const request: Requester['request'] = async ({ callerIdentifier, contexts, endpointIdentifier }) => {
    if (endpointToClient[endpointIdentifier.path] === undefined) {
      if (clients.options[clients.default].strict) {
        throw new Error(`Could not find client for endpoint ${endpointIdentifier.path}`)
      }
      // TODON make this a pattern of how to use adapter/client?
      log.error('[%s] Could not find client for endpoint %s, falling back to default client (%s)', adapterName, endpointIdentifier.path, clients.default)
    }
    const clientName = endpointToClient[endpointIdentifier.path] ?? clients.default
    const clientDef = clientDefs[clientName]
    const endpointDef = clientDef.endpoints[endpointIdentifier.path]?.[endpointIdentifier.method]
    if (endpointDef === undefined && clientDef.strict) {
      throw new Error(`Could not find endpoint definition ${endpointIdentifier.path} in client ${clientName}`)
    }
    const paginationOption = endpointDef?.pagination
    const paginationDef = paginationOption !== undefined
      ? pagination[paginationOption]
      : { funcCreator: noPagination, clientArgs: undefined }
    // TODON extend to "full" client
    const { clientArgs } = paginationDef
    const mergedDef = _.merge({}, clientArgs, endpointDef)
    const extractors = (mergedDef.responseExtractors ?? [])
      // only extract items of the requested type -
      // TODON make sure ok (+ cache response in the requester by context to avoid calling client again!)
      .filter(def => def.toType === callerIdentifier.typeName) // TODON avoid filtering + instead route to correct one?
      .map(createExtractor)
    if (extractors.length === 0) {
      log.error('unexpected 0 extractors for endpoint %s:%s', endpointIdentifier.path, endpointIdentifier.method)
      return []
    }
    const callArgs = _.pick(mergedDef, ['queryArgs', 'headers', 'body'])

    // TODON use context, cache request+response including callerIdentifier
    // TODON extract items + use correct ids (fake temp code for testing!!! should continue)
    // TODON replace args in endpoint and initial args
    const pagesWithContext = await traversePages({
      client: clientDef.httpClient,
      paginationDef,
      endpointIdentifier,
      contexts,
      callArgs,
    })

    const itemsWithContext = extractors
      .flatMap(extractor => pagesWithContext.map(({ context, pages }) => ({
        items: extractor(pages),
        context,
      })))
      .flatMap(({ items, context }) => items.flatMap(item => ({ ...item, context })))
    return itemsWithContext
      .map(item => ({
        callerIdentifier,
        ...item,
        // TODON taking from item - make sure ok
        // typeName: callerIdentifier.typeName,
        // value: item,
        // context: item.context, // TODON ??? not sure accurate
      }))
      .filter(item => {
        if (!lowerdashValues.isPlainRecord(item.value)) {
          log.warn('extracted invalid item for caller %s %s', callerIdentifier.typeName, callerIdentifier.identifier)
          return false
        }
        return true
      }) as IdentifiedItem[]
  }

  return { request }

  // TODON find correct client, paginate, transform returned values and generate all items
  // TODON cache requests and results (at the client level)
}
