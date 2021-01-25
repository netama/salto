/*
*                      Copyright 2021 Salto Labs Ltd.
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
import { collections } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { safeJsonStringify, client as clientUtils } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { Credentials } from '../types'
import { ZUORA } from '../constants'

const { makeArray } = collections.array
const log = logger(module)

export class UnauthorizedError extends Error {}

export default class ZuoraClient extends clientUtils.AdapterHTTPClient<Credentials> {
  // eslint-disable-next-line class-methods-use-this
  clientName(): string {
    return ZUORA
  }

  /**
   * Fetch instances of a specific type
   */
  @ZuoraClient.throttle('get', ['endpointName', 'queryArgs'])
  @ZuoraClient.logDecorator(['endpointName', 'queryArgs'])
  @ZuoraClient.requiresLogin
  public async get({
    endpointName,
    queryArgs,
  }: clientUtils.ClientGetParams): Promise<{ result: Values[]; errors: string[]}> {
    if (this.apiClient === undefined) {
      throw new Error('unitialized client')
    }
    const client = this.apiClient

    // TODON convert to generator?
    const getAllResponseData = async (): Promise<Values[]> => { // TODON nextPageFunc?
      const entries = []
      let nextPageArgs: Values = {}
      while (true) {
        const params = {
          ...queryArgs,
          ...nextPageArgs,
        }
        // eslint-disable-next-line no-await-in-loop
        const response = await client.get(
          endpointName,
          {
            params,
          },
        )
        // TODO remove
        log.info(`Full HTTP response for ${endpointName} ${safeJsonStringify(params)}: ${safeJsonStringify(response.data)}`)

        // TODON check if need the 2nd condition. the success field doesn't always exist
        if (response.status !== 200 || response.data.success === false) {
          // TODON check if can get actual error
          log.error(`error getting result for ${endpointName}`)
          break
        }
        entries.push(...makeArray(response.data))
        // TODON support other types of pagination too
        if (response.data.nextPage === undefined) {
          break
        }
        const nextPage = new URL(response.data.nextPage, 'http://localhost')
        // TODON verify pathname is the same
        nextPageArgs = Object.fromEntries(nextPage.searchParams.entries())
      }
      log.info('Received %d results for endpoint %s', // TODON inaccurate when not extracting nested field
        entries.length, endpointName)
      return entries
    }

    const result = await getAllResponseData()
    return {
      result,
      errors: [],
    }
  }
}
