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
export const API_CONFIG = 'api'
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

export type WorkatoClientConfig = Partial<{
  retry: ClientRetryConfig
  rateLimit: ClientRateLimitConfig
  pageSize: ClientPageSizeConfig
  maxPagesToGetForEachType: number
}>

export type EndpointConfig = {
  endpoint: string
  queryParams?: Record<string, string>
  fieldsToOmit?: string[]
  // fields to convert into their own type and instances.
  // if the field value is a string, first parse it into json
  fieldsToExtract?: string[]
  // endpoints whose response is a single object with dynamic keys
  hasDynamicFields?: boolean
}

export type WorkatoApiConfig = {
  baseUrl: string
  getEndpoints: EndpointConfig[]
  // TODON rename, support fallbacks + different one by endpoint / regex
  defaultNameField: string
}

export type WorkatoConfig = {
  [CLIENT_CONFIG]?: WorkatoClientConfig
  [API_CONFIG]: WorkatoApiConfig
  [DISABLE_FILTERS]: boolean
}

export type ConfigChangeSuggestion = {
  // TODON add change suggestions?
  type: keyof WorkatoConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const configID = new ElemID(constants.WORKATO)

export const usernameTokenCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    token: {
      type: BuiltinTypes.STRING,
    },
  },
})

export class UsernameTokenCredentials {
  constructor({ username, token }:
    { username: string; token: string }) {
    this.username = username
    this.token = token
  }

  username: string
  token: string
}

export type Credentials = UsernameTokenCredentials

const clientRateLimitConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKATO, 'clientRateLimitConfig'),
  fields: {
    total: { type: BuiltinTypes.NUMBER },
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientRateLimitConfig, FieldDefinition>,
})

const clientPageSizeConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKATO, 'clientPageSizeConfig'),
  fields: {
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientPageSizeConfig, FieldDefinition>,
})

const clientRetryConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKATO, 'clientRetryConfig'),
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
  elemID: new ElemID(constants.WORKATO, 'clientConfig'),
  fields: {
    retry: { type: clientRetryConfigType },
    rateLimit: { type: clientRateLimitConfigType },
    pageSize: { type: clientPageSizeConfigType },
    maxPagesToGetForEachType: { type: BuiltinTypes.NUMBER },
  } as Record<keyof WorkatoClientConfig, FieldDefinition>,
})

const endpointConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKATO, 'endpointConfig'),
  fields: {
    endpoint: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
    // TODON needs more adjustments
    queryParams: { type: new MapType(BuiltinTypes.STRING) },
    fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
    fieldsToExtract: { type: new ListType(BuiltinTypes.STRING) },
    hasDynamicFields: { type: BuiltinTypes.BOOLEAN },
  },
})

const apiModuleConfigType = new ObjectType({
  elemID: new ElemID(constants.WORKATO, 'apiModuleConfig'),
  fields: {
    baseUrl: { type: BuiltinTypes.STRING },
    getEndpoints: { type: new ListType(endpointConfigType) },
    defaultNameField: { type: BuiltinTypes.STRING },
  },
})

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: clientConfigType,
    },
    [API_CONFIG]: {
      type: apiModuleConfigType,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          baseUrl: 'https://www.workato.com/api',
          getEndpoints: [
            {
              endpoint: '/connections',
            },
            {
              endpoint: '/recipes',
              fieldsToOmit: ['last_run_at'],
              fieldsToExtract: ['code'],
            },
            {
              // TODON needs recursion, pagination
              endpoint: '/folders',
            },
            {
              endpoint: '/api_collections',
            },
            {
              endpoint: '/api_endpoints',
            },
            {
              endpoint: '/api_clients',
            },
            // TODON support /api_clients/:api_client_id/api_access_profiles
            {
              endpoint: '/roles',
            },
            {
              endpoint: '/properties',
              queryParams: {
                prefix: '',
              },
              hasDynamicFields: true,
            },
          ],
          defaultNameField: 'name',
        },
      },
    },
    [DISABLE_FILTERS]: { type: BuiltinTypes.BOOLEAN },
  },
})

export type FilterContext = {
  [API_CONFIG]: WorkatoApiConfig
}
