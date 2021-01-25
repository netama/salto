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
import { decorators } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { ClientBaseConfig, ClientRateLimitConfig } from '../config'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS, DEFAULT_RETRY_OPTS, DEFAULT_PAGE_SIZE } from './constants'
import {
  ApiConnectionBaseConfig, ClientOptsBase,
} from './types'
import { APIConnection } from './http_connection'

const log = logger(module)

type RateLimitBucketName = keyof ClientRateLimitConfig

// TODO generalize to more buckets when needed
const createRateLimitersFromConfig = (
  rateLimit: ClientRateLimitConfig,
  clientName: string,
): Record<RateLimitBucketName, Bottleneck> => {
  const toLimit = (
    num: number | undefined
  // 0 is an invalid value (blocked in configuration)
  ): number | undefined => (num && num < 0 ? undefined : num)
  const rateLimitConfig = _.mapValues(rateLimit, toLimit)
  log.debug('%s client rate limit config: %o', clientName, rateLimitConfig)
  return {
    total: new Bottleneck({ maxConcurrent: rateLimitConfig.total }),
    get: new Bottleneck({ maxConcurrent: rateLimitConfig.get }),
    put: new Bottleneck({ maxConcurrent: rateLimitConfig.put }),
  }
}

type LogDescFunc = (origCall: decorators.OriginalCall) => string
const logOperationDecorator = (clientName: string, keys?: string[]): LogDescFunc => ((
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
  return `${clientName}:client.${name}(${printableArgs})`
})

export abstract class AdapterClientBase {
  protected isLoggedIn = false
  protected readonly config?: ClientBaseConfig
  protected readonly apiConfig: ApiConnectionBaseConfig
  protected readonly rateLimiters: Record<RateLimitBucketName, Bottleneck>
  protected getPageSize: number
  protected apiClient?: APIConnection
  protected loginPromise?: Promise<APIConnection>

  constructor(
    { config, api }: ClientOptsBase,
    defaults = {
      retry: DEFAULT_RETRY_OPTS,
      rateLimit: DEFAULT_MAX_CONCURRENT_API_REQUESTS,
      pageSize: DEFAULT_PAGE_SIZE,
    },
  ) {
    this.config = config
    this.apiConfig = api
    this.rateLimiters = createRateLimitersFromConfig(
      _.defaults({}, config?.rateLimit, defaults.rateLimit),
      this.clientName(),
    )
    this.getPageSize = (
      this.config?.pageSize?.get
      ?? defaults.pageSize.get
      ?? DEFAULT_PAGE_SIZE.get
    )
  }

  protected abstract clientName(): string

  protected abstract async ensureLoggedIn(): Promise<void>

  protected static requiresLogin = decorators.wrapMethodWith(
    async function withLogin(
      this: AdapterClientBase,
      originalMethod: decorators.OriginalCall
    ): Promise<unknown> {
      await this.ensureLoggedIn()
      return originalMethod.call()
    }
  )

  protected static throttle = (
    bucketName?: RateLimitBucketName,
    keys?: string[],
  ): decorators.InstanceMethodDecorator =>
    decorators.wrapMethodWith(
      async function withRateLimit(
        this: AdapterClientBase,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        log.debug('%s enqueued', logOperationDecorator(this.clientName(), keys)(originalMethod))
        const wrappedCall = this.rateLimiters.total.wrap(async () => originalMethod.call())
        if (bucketName !== undefined && bucketName !== 'total') {
          return this.rateLimiters[bucketName].wrap(async () => wrappedCall())()
        }
        return wrappedCall()
      }
    )

  protected static logDecorator = (keys?: string[]): decorators.InstanceMethodDecorator =>
    decorators.wrapMethodWith(
      // eslint-disable-next-line prefer-arrow-callback
      async function logFailure(
        this: AdapterClientBase,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        const desc = logOperationDecorator(this.clientName(), keys)(originalMethod)
        try {
          return await log.time(originalMethod.call, desc)
        } catch (e) {
          log.error('failed to run client call %s: %s', desc, e.message)
          throw e
        }
      }
    )
}
