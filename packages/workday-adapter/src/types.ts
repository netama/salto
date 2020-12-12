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
import {
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS, createRestriction, FieldDefinition, ListType,
  MapType,
} from '@salto-io/adapter-api'
import * as constants from './constants'

// TODON add to documentation
export const CLIENT_CONFIG = 'client'
export const API_MODULES_CONFIG = 'apiModules'
export const DISABLE_FILTERS = 'disableFilters'

export type ClientRateLimitConfig = Partial<{
  total: number
  get: number
  put: number
}>

export type ClientPageSizeConfig = Partial<{
  get: number
  put: number
}>

export enum RetryStrategyName {
  'HttpError',
  'HTTPOrNetworkError',
  'NetworkError',
}
type RetryStrategy = keyof typeof RetryStrategyName
export type ClientRetryConfig = Partial<{
  maxAttempts: number
  retryDelay: number
  retryStrategy: RetryStrategy
}>

export type WorkdayClientConfig = Partial<{
  retry: ClientRetryConfig
  rateLimit: ClientRateLimitConfig
  pageSize: ClientPageSizeConfig
  maxPagesToGetForEachType: number
}>

export type WorkdayApiModuleConfig = {
  // API endpoints will be used for fetch/deploy if they:
  //  1. start with Get_ (for fetch), Put_ or Delete_ (for deploy)
  //  2. match at least one includeRegex, and do not match any excludeRegex
  includeRegex?: string[]
  excludeRegex?: string[]
  wsdl: string
}

export type WorkdayConfig = {
  [CLIENT_CONFIG]?: WorkdayClientConfig
  [API_MODULES_CONFIG]: Record<string, WorkdayApiModuleConfig>
  [DISABLE_FILTERS]: boolean
}

export type ConfigChangeSuggestion = {
  // TODON add change suggestions
  type: keyof WorkdayConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const configID = new ElemID(constants.WORKDAY)

export const usernamePasswordTenantCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    password: { type: BuiltinTypes.STRING },
    // TODON not used yet
    tenant: { type: BuiltinTypes.STRING },
    subdomain: { type: BuiltinTypes.STRING },
    // TODON need sandbox?
  },
})

export class UsernamePasswordTenantCredentials {
  constructor({ username, password, tenant, subdomain }:
    { username: string; password: string; tenant: string; subdomain: string }) {
    this.username = username
    this.password = password
    this.tenant = tenant
    this.subdomain = subdomain
  }

  username: string
  password: string
  tenant: string
  subdomain: string
}

export type Credentials = UsernamePasswordTenantCredentials

const clientRateLimitConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKDAY, 'clientRateLimitConfig'),
  fields: {
    total: { type: BuiltinTypes.NUMBER },
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientRateLimitConfig, FieldDefinition>,
})

const clientPageSizeConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKDAY, 'clientPageSizeConfig'),
  fields: {
    total: { type: BuiltinTypes.NUMBER },
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientPageSizeConfig, FieldDefinition>,
})

const clientRetryConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKDAY, 'clientRetryConfig'),
  fields: {
    maxAttempts: { type: BuiltinTypes.NUMBER },
    retryDelay: { type: BuiltinTypes.NUMBER },
    retryStrategy: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({
          values: Object.keys(RetryStrategyName),
        }),
      },
    },
  } as Record<keyof ClientRetryConfig, FieldDefinition>,
})

const clientConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKDAY, 'clientConfig'),
  fields: {
    retry: { type: clientRetryConfigType },
    rateLimit: { type: clientRateLimitConfigType },
    pageSize: { type: clientPageSizeConfigType },
    maxPagesToGetForEachType: { type: BuiltinTypes.NUMBER },
  } as Record<keyof WorkdayClientConfig, FieldDefinition>,
})

const apiModuleConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKDAY, 'apiModuleConfig'),
  fields: {
    includeRegex: { type: new ListType(BuiltinTypes.STRING) },
    excludeRegex: { type: new ListType(BuiltinTypes.STRING) },
    wsdl: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
  } as Record<keyof WorkdayApiModuleConfig, FieldDefinition>,
})

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: clientConfigType,
    },
    [API_MODULES_CONFIG]: {
      type: new MapType(apiModuleConfigType),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          core: {
            // supports both uri and local file
            wsdl: '/tmp/replace_me.wsdl',
            includeRegex: ['^Get_replace_me'],
            excludeRegex: [],
          },
        },
      },
    },
    [DISABLE_FILTERS]: { type: BuiltinTypes.BOOLEAN },
    // TODON maybe add a variant of DATA_MANAGEMENT
  },
})
