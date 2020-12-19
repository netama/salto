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
import { Client, WSDL } from 'soap'
import { ElementElement } from 'soap/lib/wsdl/elements'
import { collections, decorators, values as lowerDashValues } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { promisify } from 'util'
import { DEFAULT_MAX_CONCURRENT_API_REQUESTS } from '../constants'
import {
  Credentials, WorkdayClientConfig, ClientRateLimitConfig, ClientRetryConfig,
  WorkdayApiModuleConfig,
} from '../types'
import Connection, { WorkdayAPI, realConnection } from './connection'
import { TypeMapper, ClientOperationMessageTypes } from './types'

const { makeArray } = collections.array
const { isDefined } = lowerDashValues
const log = logger(module)

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const instanceOfSoapElementElement = (e: any): e is ElementElement => (
  e instanceof ElementElement
)

// TODON enforce api version when loading wsdls
export const API_VERSION = '36.0'

const DEFAULT_RETRY_OPTS: Required<ClientRetryConfig> = {
  maxAttempts: 5, // try 5 times
  retryDelay: 5000, // wait for 5s before trying again
  retryStrategy: 'NetworkError', // retry on network errors
}

type RateLimitBucketName = keyof ClientRateLimitConfig

type WorkdayClientOpts = {
  credentials: Credentials
  connection?: Connection
  config?: WorkdayClientConfig
  apiModules?: Record<string, WorkdayApiModuleConfig>
}

export class ApiLimitsTooLowError extends Error {}

const createRetryOptions = (retryOptions: Required<ClientRetryConfig>): RequestRetryOptions => ({
  maxAttempts: retryOptions.maxAttempts,
  retryStrategy: RetryStrategies[retryOptions.retryStrategy],
  delayStrategy: (err, response) => {
    log.error('Failed to run Workday call for reason: %s. Retrying in %ds (attempt %d).',
      err.message, retryOptions.retryDelay / 1000,
      _.get(response, 'attempts') || _.get(err, 'attempts'))
    return retryOptions.retryDelay
  },
})

const createConnectionForModules = (
  config: Record<string, WorkdayApiModuleConfig>,
  options: RequestRetryOptions,
): Connection => (
  realConnection(config, options)
)

const createRateLimitersFromConfig = (
  rateLimit: ClientRateLimitConfig,
): Record<RateLimitBucketName, Bottleneck> => {
  const toLimit = (
    num: number | undefined
  // 0 is an invalid value (blocked in configuration)
  ): number | undefined => (num && num < 0 ? undefined : num)
  const rateLimitConfig = _.mapValues(rateLimit, toLimit)
  log.debug('Workday rate limit config: %o', rateLimitConfig)
  return {
    total: new Bottleneck({ maxConcurrent: rateLimitConfig.total }),
    get: new Bottleneck({ maxConcurrent: rateLimitConfig.get }),
    put: new Bottleneck({ maxConcurrent: rateLimitConfig.put }),
  }
}

// TODON validateCredentials
export const loginFromCredentials = async (conn: Connection, creds: Credentials):
    Promise<WorkdayAPI> => (
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

export default class WorkdayClient {
  private readonly conn: Connection
  private isLoggedIn = false
  private readonly credentials: Credentials
  private readonly config?: WorkdayClientConfig
  private readonly apiModulesConfig?: Record<string, WorkdayApiModuleConfig>
  private readonly rateLimiters: Record<RateLimitBucketName, Bottleneck>
  private apiClients?: WorkdayAPI
  private cachedTypes?: TypeMapper
  private cachedEndpoints?: ClientOperationMessageTypes

  constructor(
    { credentials, connection, config, apiModules }: WorkdayClientOpts
  ) {
    this.credentials = credentials
    this.config = config
    this.apiModulesConfig = apiModules ?? {}
    this.conn = connection ?? createConnectionForModules(
      this.apiModulesConfig,
      createRetryOptions(_.defaults({}, this.config?.retry, DEFAULT_RETRY_OPTS)),
    )
    this.rateLimiters = createRateLimitersFromConfig(
      _.defaults({}, config?.rateLimit, DEFAULT_MAX_CONCURRENT_API_REQUESTS)
    )
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.isLoggedIn) {
      this.apiClients = await loginFromCredentials(this.conn, this.credentials)
      this.isLoggedIn = true
    }
  }

  protected static requiresLogin = decorators.wrapMethodWith(
    async function withLogin(
      this: WorkdayClient,
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
        this: WorkdayClient,
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
        this: WorkdayClient,
        originalMethod: decorators.OriginalCall,
      ): Promise<unknown> {
        const desc = logDecorator(keys)(originalMethod)
        try {
          return await log.time(originalMethod.call, desc)
        } catch (e) {
          log.error('failed to run Workday client call %s: %s', desc, e.message)
          throw e
        }
      }
    )

  @WorkdayClient.logDecorator()
  @WorkdayClient.requiresLogin
  public async getAllTypes(): Promise<TypeMapper> {
    if (!this.cachedTypes) {
      const typeMappersByClient: Record<string, TypeMapper> = _.mapValues(
        this.apiClients ?? {},
        (cli: Client) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { wsdl }: { wsdl: WSDL } = cli as any
          const { complexTypes } = Object.values(wsdl.definitions.schemas)[0]
          const fieldLookup = _.mapValues(
            complexTypes,
            type => {
              // TODON parse validations too for more accurate types
              const fields = type.children
                ?.filter(c => c.name === 'sequence')[0]
                ?.children
                ?.filter(instanceOfSoapElementElement)

              const toFieldDef = (typeDef: ElementElement): { [key: string]: string } => {
                if (typeDef.$type !== undefined) {
                  const typeName = typeDef.$type
                  // we expect to always have $name
                  return typeDef.$name ? {
                    [typeDef.$name]: typeName.startsWith('wd:') ? typeName.slice('wd:'.length) : typeName,
                  } : {}
                }
                return typeDef.description(wsdl.definitions)
              }
              // TODON make sure $type is always defined
              return fields !== undefined && fields.length > 0
                // TODON check if ever empty!
                ? _.assign({}, ...fields.map(toFieldDef))
                : {}
            }
          )
          return {
            types: wsdl.definitions.descriptions.types,
            fieldLookup,
          }
        },
      )

      // there are shared types between the different modules, make sure they're identical
      // TODON decide what to do if we run into errors
      const mergeFunc = (existingValue: unknown, newValue: unknown, typeName: string): unknown => {
        if (existingValue !== undefined && newValue !== undefined
          && !_.isEqual(existingValue, newValue)) {
          throw new Error(`Inconsistent shared Workday type: ${typeName}`)
        }
        return existingValue
      }

      this.cachedTypes = {
        types: _.mergeWith(
          {},
          ...Object.values(typeMappersByClient).map(mapper => mapper.types),
          mergeFunc
        ),
        fieldLookup: _.mergeWith(
          {},
          ...Object.values(typeMappersByClient).map(mapper => mapper.fieldLookup),
          mergeFunc
        ),
      }
    }
    if (this.cachedTypes === undefined) {
      throw new Error('impossible') // TODON
    }
    return this.cachedTypes
  }

  @WorkdayClient.logDecorator()
  @WorkdayClient.requiresLogin
  public async getEndpointTypeNames(): Promise<ClientOperationMessageTypes> {
    if (!this.cachedEndpoints) {
      const endpointsByClient = _.mapValues(
        this.apiClients ?? {},
        (cli: Client, moduleName: string) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { wsdl }: { wsdl: WSDL } = cli as any
          const ports = Object.values(wsdl.definitions.portTypes)
          if (ports.length !== 1) {
            // node-soap currently only supports one port - something unexpected happened
            throw new Error(`Unexpected number of ports in Workday ${moduleName} wsdl: expected 1, found ${ports.length}`)
          }
          const methodTypes = _.mapValues(
            ports[0].methods,
            (method, methodName) => {
              if (method.output.$name === undefined || method.input.$name === undefined) {
                throw new Error(`could not find input or output message types for ${methodName}`)
              }
              // TODON move the .split(':').pop() part somewhere shared
              const input = wsdl.definitions.messages[method.input.$name]?.element?.$type?.split(':').pop()
              const output = wsdl.definitions.messages[method.output.$name]?.element?.$type?.split(':').pop()
              return ((input !== undefined && output !== undefined)
                ? { input, output }
                : undefined)
            }
          )
          return _.pickBy(methodTypes, isDefined)
        },
      )
      this.cachedEndpoints = endpointsByClient
    }
    if (this.cachedEndpoints === undefined) {
      throw new Error('impossible')
    }
    return this.cachedEndpoints
  }

  /**
   * Fetch instances of a specific type
   */
  @WorkdayClient.throttle('get')
  @WorkdayClient.logDecorator()
  @WorkdayClient.requiresLogin
  public async get(
    cli: string,
    endpointName: string,
    dataFieldName: string,
  ): Promise<{ result: Values[]; errors: string[]}> {
    const syncEndpoint = this.apiClients?.[cli][endpointName]
    if (syncEndpoint === undefined) {
      throw new Error(`Unknown endpoint ${endpointName}`)
    }
    // we use promisify and not the `xAsync` endpoints from node-soap, because
    // for some non-standard endpoint names these functions are not created correctly
    // (for example names that contain dashes), and since the return format is slightly different
    // it's better to handle just one consistent case.
    const endpoint = promisify(syncEndpoint)

    // TODON convert to generator?
    const getAllResponseData = async (): Promise<Values[]> => {
      const responseData = []
      let page = 1
      let totalResults = 0
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const res = await endpoint({
          // TODON ensure available everywhere? check the schemas
          // eslint-disable-next-line @typescript-eslint/camelcase
          Response_Filter: {
            Count: this.config?.pageSize?.get,
            Page: page,
          },
        })
        responseData.push(...makeArray(res.Response_Data).flatMap(entry => entry[dataFieldName]))
        // TODON add schema for the important parts
        if (res.Response_Results.Page === res.Response_Results.Total_Pages
          || res.Response_Data === undefined
          || (this.config?.maxPagesToGetForEachType !== undefined
            && res.Response_Results.Page >= this.config?.maxPagesToGetForEachType)) {
          totalResults = makeArray(res.Response_Results)[0].Total_Results
          break
        }
        page += 1
      }
      log.info('Received %d/%d results for endpoint %s',
        responseData.length, totalResults, endpointName)
      return responseData
    }

    // TODON check if need to support requests that get a request obj
    const result = await getAllResponseData()
    return {
      result,
      errors: [],
    }
  }

  /**
   * Deploy entries for workday object of specific type
   */
  @WorkdayClient.throttle('put')
  @WorkdayClient.logDecorator()
  @WorkdayClient.requiresLogin
  public async put(
    cli: string,
    endpointName: string,
    // TODON also support bulk for supporting endpoints
    req: Values,
  ): Promise<{ result: Values; errors: string[]}> {
    // TODON differentiate between create, update, delete
    const syncEndpoint = this.apiClients?.[cli][endpointName]
    if (syncEndpoint === undefined) {
      throw new Error(`Unknown endpoint ${endpointName}`)
    }
    const endpoint = promisify(syncEndpoint)
    const result = await endpoint(req)
    return {
      result,
      errors: [],
    }
  }
}
