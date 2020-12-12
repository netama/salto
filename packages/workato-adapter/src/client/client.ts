/*
*                      Copyright 2020 Salto Labs Ltd.
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
import { RequestRetryOptions, RetryStrategies } from 'requestretry'
import Bottleneck from 'bottleneck'
import { decorators, collections } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS } from '../constants'
import {
  Credentials, WorkatoClientConfig, ClientRateLimitConfig, ClientRetryConfig,
  WorkatoApiConfig,
} from '../types'
import Connection, { WorkatoAPI, realConnection } from './connection'

const { makeArray } = collections.array
const log = logger(module)

const DEFAULT_RETRY_OPTS: Required<ClientRetryConfig> = {
  maxAttempts: 5, // try 5 times
  retryDelay: 5000, // wait for 5s before trying again
  retryStrategy: 'NetworkError', // retry on network errors
}

type RateLimitBucketName = keyof ClientRateLimitConfig

type ClientOpts = {
  credentials: Credentials
  connection?: Connection
  config?: WorkatoClientConfig
  api: WorkatoApiConfig
}

export class ApiLimitsTooLowError extends Error {}

const createRetryOptions = (retryOptions: Required<ClientRetryConfig>): RequestRetryOptions => ({
  maxAttempts: retryOptions.maxAttempts,
  retryStrategy: RetryStrategies[retryOptions.retryStrategy],
  delayStrategy: (err, response) => {
    log.error('Failed to run Workato call for reason: %s. Retrying in %ds (attempt %d).',
      err.message, retryOptions.retryDelay / 1000,
      _.get(response, 'attempts') || _.get(err, 'attempts'))
    return retryOptions.retryDelay
  },
})

const createConnection = (
  config: WorkatoApiConfig,
  _options: RequestRetryOptions,
): Connection => (
  realConnection(config)
)

const createRateLimitersFromConfig = (
  rateLimit: ClientRateLimitConfig,
): Record<RateLimitBucketName, Bottleneck> => {
  const toLimit = (
    num: number | undefined
  // 0 is an invalid value (blocked in configuration)
  ): number | undefined => (num && num < 0 ? undefined : num)
  const rateLimitConfig = _.mapValues(rateLimit, toLimit)
  log.debug('Workato rate limit config: %o', rateLimitConfig)
  return {
    total: new Bottleneck({ maxConcurrent: rateLimitConfig.total }),
    get: new Bottleneck({ maxConcurrent: rateLimitConfig.get }),
    put: new Bottleneck({ maxConcurrent: rateLimitConfig.put }),
  }
}

export const loginFromCredentials = async (conn: Connection, creds: Credentials):
    Promise<WorkatoAPI> => (
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

export default class WorkatoClient {
  private readonly conn: Connection
  private isLoggedIn = false
  private readonly credentials: Credentials
  private readonly config?: WorkatoClientConfig
  private readonly apiConfig: WorkatoApiConfig
  private readonly rateLimiters: Record<RateLimitBucketName, Bottleneck>
  private apiClient?: WorkatoAPI
  private loginPromise?: Promise<WorkatoAPI>

  constructor(
    { credentials, connection, config, api }: ClientOpts
  ) {
    this.credentials = credentials
    this.config = config
    this.apiConfig = api
    this.conn = connection ?? createConnection(
      this.apiConfig,
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
      this: WorkatoClient,
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
        this: WorkatoClient,
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
        this: WorkatoClient,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        const desc = logDecorator(keys)(originalMethod)
        try {
          return await log.time(originalMethod.call, desc)
        } catch (e) {
          log.error('failed to run Workato client call %s: %s', desc, e.message)
          throw e
        }
      }
    )

  /**
   * Fetch instances of a specific type
   */
  @WorkatoClient.throttle('get')
  @WorkatoClient.logDecorator()
  @WorkatoClient.requiresLogin
  public async get(
    endpointName: string,
    queryParams?: Record<string, string>,
  ): Promise<{ result: Values[]; errors: string[]}> {
    if (this.apiClient === undefined) {
      throw new Error('uninitialized api client')
    }
    // TODON support pagination if can be an issue in the workato api (not clear from doc)
    const response = await this.apiClient.get(
      endpointName,
      queryParams ? { params: queryParams } : undefined
    )

    log.info(`Full HTTP response for ${endpointName} ${queryParams}: ${JSON.stringify(response.data)}`)

    // TODON check if there are other variants
    const results = ((_.isObjectLike(response.data) && Array.isArray(response.data.items))
      ? response.data.items
      : makeArray(response.data))

    return {
      result: results,
      errors: [],
    }
  }
}
