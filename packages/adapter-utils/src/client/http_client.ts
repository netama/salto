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
import _ from 'lodash'
import { collections, values as lowerfashValues } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS, DEFAULT_RETRY_OPTS, DEFAULT_PAGE_SIZE } from './constants'
import { ClientOptsBase, ClientGetParams } from './types'
import { Connection, APIConnection, ConnectionCreator, Credentials, createRetryOptions, createClientConnection } from './http_connection'
import { safeJsonStringify } from '../utils'
import { AdapterClientBase } from './base'

const { isDefined } = lowerfashValues
const { makeArray } = collections.array
const log = logger(module)

type ClientOpts<TCred extends Credentials> = ClientOptsBase & {
  connection?: Connection
  credentials: TCred
}

export const loginFromCredentials = async <TCred>(conn: Connection, creds: TCred):
    Promise<APIConnection> => (
  conn.login(creds)
)

export abstract class AdapterHTTPClient<TCred extends Credentials> extends AdapterClientBase {
  protected readonly conn: Connection
  private readonly credentials: Credentials

  constructor(
    { credentials, connection, config, api }: ClientOpts<TCred>,
    createConnection: ConnectionCreator,
    defaults = {
      retry: DEFAULT_RETRY_OPTS,
      rateLimit: DEFAULT_MAX_CONCURRENT_API_REQUESTS,
      pageSize: DEFAULT_PAGE_SIZE,
    },
  ) {
    super(
      { config, api },
      defaults,
    )
    this.conn = createClientConnection({
      connection,
      apiConfig: this.apiConfig,
      retryOptions: createRetryOptions(_.defaults({}, this.config?.retry, defaults.retry)),
      createConnection,
    })
    this.credentials = credentials
  }

  protected async ensureLoggedIn(): Promise<void> {
    if (!this.isLoggedIn) {
      if (this.loginPromise === undefined) {
        this.loginPromise = loginFromCredentials(this.conn, this.credentials)
      }
      const apiClient = await this.loginPromise
      if (this.apiClient === undefined) {
        this.apiClient = apiClient
        this.isLoggedIn = true
      }
    }
  }

  /**
   * Fetch instances of a specific type
   */
  @AdapterHTTPClient.throttle('get', ['endpointName', 'queryArgs', 'recursiveQueryArgs'])
  @AdapterHTTPClient.logDecorator(['endpointName', 'queryArgs', 'recursiveQueryArgs'])
  @AdapterHTTPClient.requiresLogin
  public async get({
    endpointName,
    queryArgs,
    recursiveQueryArgs,
    paginationField,
  }: ClientGetParams): Promise<{ result: Values[]; errors: string[]}> {
    if (this.apiClient === undefined) {
      throw new Error('uninitialized api client')
    }

    const requestQueryArgs: Record<string, string>[] = [{}]

    const allResults = []

    const usedParams = new Set<string>()

    try {
      // TODON extract to nextPageFunc so can reuse including zuora
      while (requestQueryArgs.length > 0) {
        const additionalArgs = requestQueryArgs.pop() as Record<string, string>
        const serializedArgs = safeJsonStringify(additionalArgs)
        if (usedParams.has(serializedArgs)) {
          // eslint-disable-next-line no-continue
          continue
        }
        usedParams.add(serializedArgs)
        const params = { ...queryArgs, ...additionalArgs }
        // eslint-disable-next-line no-await-in-loop
        const response = await this.apiClient.get(
          endpointName,
          Object.keys(params).length > 0 ? { params } : undefined
        )
        log.info(`Full HTTP response for ${endpointName} ${safeJsonStringify(params)}: ${safeJsonStringify(response.data)}`)

        const results: Values[] = (
          (_.isObjectLike(response.data) && Array.isArray(response.data.items))
            ? response.data.items
            : makeArray(response.data)
        )

        allResults.push(...results)

        // TODON support getting page size from config
        if (paginationField !== undefined && results.length >= this.getPageSize) {
          requestQueryArgs.unshift({
            ...additionalArgs,
            [paginationField]: (additionalArgs[paginationField] ?? 1) + 1,
          })
        }

        // TODON decide if want to include
        if (recursiveQueryArgs !== undefined && Object.keys(recursiveQueryArgs).length > 0) {
          const newArgs = (results
            .map(res => _.pickBy(
              _.mapValues(
                recursiveQueryArgs,
                mapper => mapper(res),
              ),
              isDefined,
            ))
            .filter(args => Object.keys(args).length > 0)
          )
          requestQueryArgs.unshift(...newArgs)
        }
      }

      return {
        result: allResults,
        errors: [],
      }
    } catch (e) {
      log.error(`failed to get ${endpointName}: ${e}, stack: ${e.stack}`)
      return {
        result: [],
        errors: [e],
      }
    }
  }
}
