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
import { ResponseValue, Response } from '../client'
import { ContextParams, GeneratedItem } from '../definitions/system/shared'
import { ApiDefinitions, HTTPEndpointIdentifier, mergeWithDefault } from '../definitions'
import { TypeEndpointRelations } from './dependencies'
import { ResourceIdentifier, IdentifiedItem } from './types'
// import { createPaginator } from '../client'
import { noPagination } from '../client/pagination/pagination'
import { DATA_FIELD_ENTIRE_OBJECT } from '../config'
import { FetchExtractionDefinition } from '../definitions/system/requests/endpoint'
import { replaceArgs } from './resource/request_parameters'

const log = logger(module)

export type Requester = {
  // TODON see if can turn into a generator
  request: (args: {
    endpointIdentifier: HTTPEndpointIdentifier
    contexts: ContextParams[]
    callerIdentifier: ResourceIdentifier
  // TODON improve to make this return partial errors as the return value
  }) => AsyncIterable<IdentifiedItem>
  // TODON if want to return errors -
  // }) => Generator<IdentifiedItem, { errors?: Record<string, string[]> }>
}

type ItemExtractor = (pages: Response<ResponseValue | ResponseValue[]>[]) => GeneratedItem[]

export const createExtractor = (extractorDef: FetchExtractionDefinition): ItemExtractor => {
  if (extractorDef.custom !== undefined) {
    return extractorDef.custom(extractorDef)
  }
  const { toType, /* aggregate, */context,  nestUnderField, omit, pick, root, transform } = extractorDef
  // TODON in order to aggregate, assuming got all pages - see if we want to change this to a stream
  return pages => {
    const items = pages
      .flatMap(page => (root === undefined || root === DATA_FIELD_ENTIRE_OBJECT) ? page : _.get(page, root))
      .map(item => pick !== undefined ? _.pick(item, pick) : item)
      .map(item => omit !== undefined ? _.omit(item, omit) : item)
      .map(item => nestUnderField !== undefined
        ? { [nestUnderField]: item }
        : item)
    
    return items
      .map(item => ({ typeName: toType, value: item, context: context ?? {} }))
      .map(generatedItem => transform !== undefined
        ? _.defaults({}, transform(generatedItem), generatedItem)
        : generatedItem)
  }
}

export const getRequester = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string // TODON won't be needed once narrowing the definitions type
>({
  // adapterName,
  // accountName,
  clients,
  pagination,
  endpointToClient,
  // requestCache,
}: {
  adapterName: string
  accountName: string
  clients: ApiDefinitions<ClientOptions, PaginationOptions, Action>['clients']
  pagination: ApiDefinitions<ClientOptions, PaginationOptions, Action>['pagination']
  endpointToClient: TypeEndpointRelations<ClientOptions>['endpointToClient']
  requestCache?: Record<string, unknown>
}): Requester => {

  const clientDefs = _.mapValues(
    clients.options,
    ({ endpoints, ...def }) => ({
      endpoints: mergeWithDefault(endpoints),
      ...def,
    })
  )

  const request: Requester['request'] = async function *({ callerIdentifier, contexts, endpointIdentifier }) {
    if (endpointToClient[endpointIdentifier.path] === undefined) {
      if (clients.options[clients.default].strict) {
        throw new Error(`Could not find client for endpoint ${endpointIdentifier.path}`)
      }
      log.error('Could not find client for endpoint %s, falling back to default client (%s)', endpointIdentifier.path, clients.default)
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
      : { funcCreator: noPagination }
    // TODON extend to "full" client
    const { clientArgs } = paginationDef
    const mergedDef = _.merge({}, clientArgs, endpointDef)
    const extractors = (mergedDef.responseExtractors ?? [])
      // only extract items of the requested type -
      // TODON make sure ok (+ cache response in the requester by context to avoid calling client again!)
      .filter(def => def.toType === callerIdentifier.typeName)
      .map(createExtractor)
    if (extractors.length === 0) {
      log.error('unexpected 0 extractors for endpoint %s:%s', endpointIdentifier.path, endpointIdentifier.method)
      return
    }

    // TODON pass contexts to paginator
    // const paginator = createPaginator({
    //   client: clientDef.httpClient,
    //   paginationFuncCreator: paginationDef.funcCreator,
    //   asyncRun: true, // TODON confirm ok
    // })

    // TODON use context, cache request+response including callerIdentifier
    // TODON refactor paginator and use it here
    // TODON replace args recursively instead!

    const replaceAllArgs = (context: ContextParams) => ({
      // TODON rename to path
      url: replaceArgs(endpointIdentifier.path, context),
      // TODON use body if not only GET?
      headers: mergedDef.headers !== undefined
        ? _.mapValues(mergedDef.headers, val => replaceArgs(val, context))
        : undefined,
      queryParams: mergedDef.queryArgs !== undefined
        ? _.mapValues(mergedDef.queryArgs, val => replaceArgs(val, context))
        : undefined,
    })
    const pagesWithContext = await Promise.all(contexts.map(async args => ({
      context: args,
      // TODON replace with paginator and flatten
      pages: [await clientDef.httpClient[endpointIdentifier.method](replaceAllArgs(args))],
    })))
    // TODON extract items + use correct ids (fake temp code for testing!!! should continue)
    const itemsWithContext = extractors
      .flatMap(extractor => pagesWithContext.map(({ context, pages }) => ({
        items: extractor(pages),
        context,
      })))
      .flatMap(({ items, context }) => items.flatMap(item => ({ ...item, context })))
    yield *itemsWithContext.map(item => ({
      callerIdentifier,
      typeName: callerIdentifier.typeName,
      value: item,
    }))
  }

  return { request }

  // TODON find correct client, paginate, transform returned values and generate all items
  // TODON cache requests and results (at the client level)
}
