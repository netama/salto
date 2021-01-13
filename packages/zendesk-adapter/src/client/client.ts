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
import { RequestRetryOptions, RetryStrategies } from 'requestretry'
import Bottleneck from 'bottleneck'
import { decorators, collections, values as lowerfashValues } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS } from '../constants'
import {
  Credentials, ZendeskClientConfig, ClientRateLimitConfig, ClientRetryConfig,
  ZendeskApiConfig,
} from '../types'
import Connection, { ZendeskAPI, realConnection } from './connection'

const { isDefined } = lowerfashValues
const { makeArray } = collections.array
const log = logger(module)

const DEFAULT_RETRY_OPTS: Required<ClientRetryConfig> = {
  maxAttempts: 5, // try 5 times
  retryDelay: 5000, // wait for 5s before trying again
  retryStrategy: 'NetworkError', // retry on network errors
}

// TODON make configurable?
const ZENDESK_DEFAULT_PAGE_SIZE = 100

type RateLimitBucketName = keyof ClientRateLimitConfig

type ClientOpts = {
  credentials: Credentials
  connection?: Connection
  config?: ZendeskClientConfig
  api: ZendeskApiConfig
}

export type ClientGetParams = {
  endpointName: string
  queryArgs: Record<string, string> | undefined
  recursiveQueryArgs: Record<string, (entry: Values) => string> | undefined
  paginationField?: string
}

export class ApiLimitsTooLowError extends Error {}

const createRetryOptions = (retryOptions: Required<ClientRetryConfig>): RequestRetryOptions => ({
  maxAttempts: retryOptions.maxAttempts,
  retryStrategy: RetryStrategies[retryOptions.retryStrategy],
  delayStrategy: (err, response) => {
    log.error('Failed to run Zendesk call for reason: %s. Retrying in %ds (attempt %d).',
      err.message, retryOptions.retryDelay / 1000,
      _.get(response, 'attempts') || _.get(err, 'attempts'))
    return retryOptions.retryDelay
  },
})

const createConnection = (
  // config: ZendeskApiConfig,
  _options: RequestRetryOptions,
): Connection => (
  realConnection()
)


const createRateLimitersFromConfig = (
  rateLimit: ClientRateLimitConfig,
): Record<RateLimitBucketName, Bottleneck> => {
  const toLimit = (
    num: number | undefined
  // 0 is an invalid value (blocked in configuration)
  ): number | undefined => (num && num < 0 ? undefined : num)
  const rateLimitConfig = _.mapValues(rateLimit, toLimit)
  log.debug('Zendesk rate limit config: %o', rateLimitConfig)
  return {
    total: new Bottleneck({ maxConcurrent: rateLimitConfig.total }),
    get: new Bottleneck({ maxConcurrent: rateLimitConfig.get }),
    put: new Bottleneck({ maxConcurrent: rateLimitConfig.put }),
  }
}

export const loginFromCredentials = async (conn: Connection, creds: Credentials):
    Promise<ZendeskAPI> => (
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

export default class ZendeskClient {
  private readonly conn: Connection
  private isLoggedIn = false
  private readonly credentials: Credentials
  private readonly config?: ZendeskClientConfig
  // private readonly apiConfig: ZendeskApiConfig
  private readonly rateLimiters: Record<RateLimitBucketName, Bottleneck>
  private apiClient?: ZendeskAPI
  private loginPromise?: Promise<ZendeskAPI>

  constructor(
    // { credentials, connection, config, api }: ClientOpts
    { credentials, connection, config }: ClientOpts
  ) {
    this.credentials = credentials
    this.config = config
    // this.apiConfig = api
    this.conn = connection ?? createConnection(
      // this.apiConfig,
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
      this: ZendeskClient,
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
        this: ZendeskClient,
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
        this: ZendeskClient,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        const desc = logDecorator(keys)(originalMethod)
        try {
          return await log.time(originalMethod.call, desc)
        } catch (e) {
          log.error('failed to run Zendesk client call %s: %s', desc, e.message)
          throw e
        }
      }
    )

  /**
   * Fetch instances of a specific type
   */
  @ZendeskClient.throttle('get', ['endpointName', 'queryArgs', 'recursiveQueryArgs'])
  @ZendeskClient.logDecorator(['endpointName', 'queryArgs', 'recursiveQueryArgs'])
  @ZendeskClient.requiresLogin
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
      while (requestQueryArgs.length > 0) {
        const additionalArgs = requestQueryArgs.pop() as Record<string, string>
        const serializedArgs = JSON.stringify(additionalArgs)
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
        log.info(`Full HTTP response for ${endpointName} ${JSON.stringify(params)}: ${JSON.stringify(response.data)}`)

        const results: Values[] = (
          (_.isObjectLike(response.data) && Array.isArray(response.data.items))
            ? response.data.items
            : makeArray(response.data)
        )

        allResults.push(...results)

        if (paginationField !== undefined && results.length >= ZENDESK_DEFAULT_PAGE_SIZE) {
          requestQueryArgs.unshift({
            ...additionalArgs,
            [paginationField]: (additionalArgs[paginationField] ?? 1) + 1,
          })
        }

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
        errors: [e], // TODON to string
      }
    }
  }
}
