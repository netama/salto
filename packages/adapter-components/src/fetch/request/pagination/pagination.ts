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
import { collections } from '@salto-io/lowerdash'
import { HTTPReadClientInterface, HTTPWriteClientInterface, ResponseValue } from '../../../client'
import { HTTPEndpointIdentifier, ContextParams, PaginationDefinitions } from '../../../definitions'
import { RequestQueue, ClientRequest } from './queue'
import { RequestArgs } from '../../../definitions/system/requests/endpoint'
import { replaceAllArgs } from '../utils'

type PagesWithContext = {
  context: ContextParams
  pages: ResponseValue[]
}
// TODON add return type later
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const traversePages = async ({ client, endpointIdentifier, paginationDef, contexts, callArgs }: {
  client: HTTPReadClientInterface & HTTPWriteClientInterface
  paginationDef: PaginationDefinitions
  endpointIdentifier: HTTPEndpointIdentifier
  contexts: ContextParams[]
  callArgs: RequestArgs
}): Promise<PagesWithContext[]> => {
  // TODON decide on merge order - pagination trumps context?
  const initialArgs = (_.isEmpty(contexts) ? [{}] : contexts).map(
    context => ({
      callArgs: replaceAllArgs({
        value: _.merge({}, callArgs, paginationDef.clientArgs),
        context,
      }),
      context,
    })
  )

  const pagesWithContext: PagesWithContext[] = []
  await Promise.all(initialArgs.map(async callArgsWithContext => {
    const pages: ResponseValue[] = []
    const finalEndpointIdentifier = replaceAllArgs({ value: endpointIdentifier, context: callArgsWithContext.context })

    const processPage: ClientRequest = async args => {
      // TODON ensure placeholders have all been replaced
      const page = await client[finalEndpointIdentifier.method]({
        url: finalEndpointIdentifier.path,
        ...args,
      })
      pages.push(...collections.array.makeArray(page.data))
      return page
    }

    const getNextPages = paginationDef.funcCreator({
      client,
      endpointIdentifier: finalEndpointIdentifier,
      params: callArgsWithContext.context,
    })
    const queue = new RequestQueue({
      paginationFunc: getNextPages,
      requestPage: processPage,
      endpointIdentifier: finalEndpointIdentifier,
    })

    // TODON temp until interfaces are aligned
    const alignedArgs = {
      queryParams: callArgsWithContext.callArgs.queryArgs,
      ..._.omit(callArgsWithContext.callArgs, 'queryArgs'),
    }
    queue.enqueue(alignedArgs)
    await queue.awaitCompletion()
    pagesWithContext.push({ context: callArgsWithContext.context, pages })
  }))

  return pagesWithContext
}