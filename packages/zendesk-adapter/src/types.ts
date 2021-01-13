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

export type ZendeskClientConfig = Partial<{
  retry: ClientRetryConfig
  rateLimit: ClientRateLimitConfig
  pageSize: ClientPageSizeConfig
  maxPagesToGetForEachType: number
}>

export type EndpointConfig = {
  endpoint: string
  queryParams?: Record<string, string>
  paginationField?: string
  dependsOn?: string[]
  fieldsToOmit?: string[]
  // fields to convert into their own type and instances.
  // if the field value is a string, first parse it into json
  fieldsToExtract?: string[]
  // endpoints whose response is a single object with dynamic keys
  hasDynamicFields?: boolean
  nameField?: string
  pathField?: string
  // when true, avoid trying to extract nested fields from response
  keepOriginal?: boolean
}

export type ZendeskApiConfig = {
  getEndpoints: EndpointConfig[]
  // TODON rename, support fallbacks + different one by endpoint / regex
  defaultNameField: string
  defaultPathField: string
  fieldsToOmit?: string[]
}

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [API_CONFIG]: ZendeskApiConfig
  [DISABLE_FILTERS]: boolean
}

export type ConfigChangeSuggestion = {
  // TODON add change suggestions?
  type: keyof ZendeskConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const configID = new ElemID(constants.ZENDESK)

export const usernamePasswordRESTCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    password: { type: BuiltinTypes.STRING },
    subdomain: { type: BuiltinTypes.STRING },
  },
})

export class UsernamePasswordRESTCredentials {
  constructor({ username, password, subdomain }:
    { username: string; password: string; subdomain: string }) {
    this.username = username
    this.password = password
    this.subdomain = subdomain
  }

  username: string
  password: string
  subdomain: string
}

export type Credentials = UsernamePasswordRESTCredentials

const clientRateLimitConfigType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK, 'clientRateLimitConfig'),
  fields: {
    total: { type: BuiltinTypes.NUMBER },
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientRateLimitConfig, FieldDefinition>,
})

const clientPageSizeConfigType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK, 'clientPageSizeConfig'),
  fields: {
    get: { type: BuiltinTypes.NUMBER },
    put: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ClientPageSizeConfig, FieldDefinition>,
})

const clientRetryConfigType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK, 'clientRetryConfig'),
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
  elemID: new ElemID(constants.ZENDESK, 'clientConfig'),
  fields: {
    retry: { type: clientRetryConfigType },
    rateLimit: { type: clientRateLimitConfigType },
    pageSize: { type: clientPageSizeConfigType },
    maxPagesToGetForEachType: { type: BuiltinTypes.NUMBER },
  } as Record<keyof ZendeskClientConfig, FieldDefinition>,
})

const endpointConfigType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK, 'endpointConfig'),
  fields: {
    endpoint: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
    // TODON needs more adjustments
    queryParams: { type: new MapType(BuiltinTypes.STRING) },
    dependsOn: { type: new ListType(BuiltinTypes.STRING) },
    paginationField: { type: BuiltinTypes.STRING },
    fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
    fieldsToExtract: { type: new ListType(BuiltinTypes.STRING) },
    hasDynamicFields: { type: BuiltinTypes.BOOLEAN },
    nameField: { type: BuiltinTypes.STRING },
    pathField: { type: BuiltinTypes.STRING },
    keepOriginal: { type: BuiltinTypes.BOOLEAN },
  },
})

const apiModuleConfigType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK, 'apiModuleConfig'),
  fields: {
    getEndpoints: { type: new ListType(endpointConfigType) },
    defaultNameField: { type: BuiltinTypes.STRING },
    defaultPathField: { type: BuiltinTypes.STRING },
    fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
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
          getEndpoints: [
            {
              endpoint: '/groups',
            },
            {
              endpoint: '/custom_roles',
            },
            {
              endpoint: '/organizations',
            },
            {
              endpoint: '/views',
              pathField: 'title',
            },
            {
              endpoint: '/triggers',
              pathField: 'title',
            },
            {
              endpoint: '/automations',
              pathField: 'title',
            },
            {
              endpoint: '/slas/policies',
            },
            {
              endpoint: '/slas/policies/definitions',
            },
            {
              endpoint: '/targets',
            },
            {
              endpoint: '/macros',
              pathField: 'title',
            },
            {
              endpoint: '/macros/actions',
              // no unique identifier for individual items
              keepOriginal: true,
            },
            {
              endpoint: '/macros/categories',
            },
            {
              endpoint: '/macros/definitions',
            },
            {
              endpoint: '/brands',
            },
            {
              endpoint: '/dynamic_content/items',
              // TODON ensure includes variants too
            },
            {
              endpoint: '/locales',
            },
            {
              endpoint: '/business_hours/schedules',
            },
            {
              endpoint: '/sharing_agreements',
            },
            {
              endpoint: '/recipient_addresses',
            },
            {
              // not always available
              endpoint: '/ticket_forms',
            },
            {
              endpoint: '/ticket_fields',
              pathField: 'title',
            },
            {
              endpoint: '/user_fields',
              pathField: 'key',
            },
            {
              endpoint: '/organization_fields',
              pathField: 'key',
            },
            {
              endpoint: '/routing/attributes',
            },
            {
              endpoint: '/routing/attributes/definitions',
            },
            {
              // not always available
              endpoint: '/workspaces',
            },
            {
              endpoint: '/apps/installations',
            },
            {
              endpoint: '/apps/owned',
            },
            {
              // TODON should include?
              endpoint: '/oauth/clients',
            },
            {
              endpoint: '/oauth/global_clients',
            },
            {
              endpoint: '/account/settings',
            },
            {
              // TODON should include?
              endpoint: '/ips',
            },
            {
              endpoint: '/resource_collections',
            },
            {
              endpoint: '/channels/twitter/monitored_twitter_handles',
            },
            // TODON sunshine workflows?
          ],
          defaultNameField: 'id',
          defaultPathField: 'name',
          fieldsToOmit: ['created_at', 'updated_at'],
        },
      },
    },
    [DISABLE_FILTERS]: { type: BuiltinTypes.BOOLEAN },
  },
})

export type FilterContext = {
  [API_CONFIG]: ZendeskApiConfig
}
