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
import Bottleneck from 'bottleneck'
import { collections, decorators } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS } from '../constants'
import {
  Credentials, ZuoraClientConfig, ClientRateLimitConfig, ClientRetryConfig,
} from '../types'
import Connection, { ZuoraAPI, realConnection, RetryOptions } from './connection'

const { makeArray } = collections.array
const log = logger(module)

const DEFAULT_RETRY_OPTS: Required<ClientRetryConfig> = {
  maxAttempts: 5, // try 5 times
  retryDelay: 5000, // wait for 5s before trying again
  // retryStrategy: 'NetworkError', // retry on network errors
}

type RateLimitBucketName = keyof ClientRateLimitConfig

type ClientOpts = {
  credentials: Credentials
  connection?: Connection
  config?: ZuoraClientConfig
}

export type ClientGetParams = {
  endpointName: string
  queryArgs?: Record<string, string>
}

export class ApiLimitsTooLowError extends Error {}

const createRetryOptions = (retryOptions: Required<ClientRetryConfig>): RetryOptions => ({
  retries: retryOptions.maxAttempts,
  retryDelay: (retryCount, err) => {
    log.error('Failed to run Zuora call to %s for reason: %s (%s). Retrying in %ds (attempt %d).',
      err.config.url,
      err.code,
      err.message,
      retryOptions.retryDelay / 1000,
      retryCount)
    return retryOptions.retryDelay
  },
})

const createConnectionForModules = (
  retryOptions: RetryOptions,
): Connection => (
  realConnection(retryOptions)
)

const createRateLimitersFromConfig = (
  rateLimit: ClientRateLimitConfig,
): Record<RateLimitBucketName, Bottleneck> => {
  const toLimit = (
    num: number | undefined
  // 0 is an invalid value (blocked in configuration)
  ): number | undefined => (num && num < 0 ? undefined : num)
  const rateLimitConfig = _.mapValues(rateLimit, toLimit)
  log.debug('Zuora rate limit config: %o', rateLimitConfig)
  return {
    total: new Bottleneck({ maxConcurrent: rateLimitConfig.total }),
    get: new Bottleneck({ maxConcurrent: rateLimitConfig.get }),
    put: new Bottleneck({ maxConcurrent: rateLimitConfig.put }),
  }
}

export const loginFromCredentials = async (conn: Connection, creds: Credentials):
    Promise<ZuoraAPI> => (
  conn.login(creds)
)

type LogDescFunc = (origCall: decorators.OriginalCall) => string
const logDecorator = (keys?: string[]): LogDescFunc => ((
  { name, args }: decorators.OriginalCall,
) => {
  const printableArgs = args
    .map(arg => {
      const keysValues = (keys ?? [])
        .map(key => _.get(arg, key))
        .filter(_.isString)
      return _.isEmpty(keysValues) ? arg : keysValues.join(', ')
    })
    .filter(_.isString)
    .join(', ')
  return `client.${name}(${printableArgs})`
})

export default class ZuoraClient {
  private readonly conn: Connection
  private isLoggedIn = false
  private readonly credentials: Credentials
  private readonly config?: ZuoraClientConfig
  private readonly rateLimiters: Record<RateLimitBucketName, Bottleneck>
  private apiClient?: ZuoraAPI
  private loginPromise?: Promise<ZuoraAPI>

  constructor(
    { credentials, connection, config }: ClientOpts
  ) {
    this.credentials = credentials
    this.config = config
    this.conn = connection ?? createConnectionForModules(
      createRetryOptions(_.defaults({}, this.config?.retry, DEFAULT_RETRY_OPTS)),
    )
    this.rateLimiters = createRateLimitersFromConfig(
      _.defaults({}, config?.rateLimit, DEFAULT_MAX_CONCURRENT_API_REQUESTS)
    )
  }

  private async ensureLoggedIn(): Promise<void> {
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

  protected static requiresLogin = decorators.wrapMethodWith(
    async function withLogin(
      this: ZuoraClient,
      originalMethod: decorators.OriginalCall
    ): Promise<unknown> {
      await this.ensureLoggedIn()
      return originalMethod.call()
    }
  )

  private static throttle = (
    bucketName?: RateLimitBucketName,
    keys?: string[],
  ): decorators.InstanceMethodDecorator =>
    decorators.wrapMethodWith(
      async function withRateLimit(
        this: ZuoraClient,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        log.debug('%s enqueued', logDecorator(keys)(originalMethod))
        const wrappedCall = this.rateLimiters.total.wrap(async () => originalMethod.call())
        if (bucketName !== undefined && bucketName !== 'total') {
          return this.rateLimiters[bucketName].wrap(async () => wrappedCall())()
        }
        return wrappedCall()
      }
    )

  private static logDecorator = (keys?: string[]): decorators.InstanceMethodDecorator =>
    decorators.wrapMethodWith(
      // eslint-disable-next-line prefer-arrow-callback
      async function logFailure(
        this: ZuoraClient,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        const desc = logDecorator(keys)(originalMethod)
        try {
          return await log.time(originalMethod.call, desc)
        } catch (e) {
          log.error('failed to run Zuora client call %s: %s', desc, e.message)
          throw e
        }
      }
    )

  /**
   * Fetch instances of a specific type
   */
  @ZuoraClient.throttle('get', ['endpointName', 'queryArgs'])
  @ZuoraClient.logDecorator(['endpointName', 'queryArgs'])
  @ZuoraClient.requiresLogin
  public async get({
    endpointName,
    queryArgs,
  }: ClientGetParams): Promise<{ result: Values[]; errors: string[]}> {
    if (this.apiClient === undefined) {
      throw new Error('unitialized client')
    }
    const client = this.apiClient

    // TODON convert to generator?
    const getAllResponseData = async (): Promise<Values[]> => {
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
        log.info(`Full HTTP response for ${endpointName} ${params}: ${JSON.stringify(response.data)}`)

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
