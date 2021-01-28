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
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS, FieldDefinition, ListType, MapType,
  InstanceElement,
} from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType } = clientUtils

// TODON add to documentation
export const CLIENT_CONFIG = 'client'
export const API_MODULES_CONFIG = 'apiModules' // TODON single module?
export const DISABLE_FILTERS = 'disableFilters'

export type ZuoraClientConfig = clientUtils.ClientBaseConfig

export type DependsOnConfig = {
  endpoint: string
  field: string
}

export type EndpointConfig = {
  endpointRegex: string
  // queryParams?: Record<string, string>
  dependsOn?: Record<string, DependsOnConfig>
  // TODON move to per-type config too, including the relevant endpoints?
  // (may need to point from the nested type to the endpoint)
  doNotPersist?: boolean
}

export type ZuoraApiModuleConfig = {
  // API endpoints will be used for fetch if they:
  //  1. start with Get_ (for fetch), Put_ or Delete_ (for deploy)
  //  2. match at least one include.endpointRegex, and do not match any excludeRegex
  include?: EndpointConfig[]
  excludeRegex?: string[]
  swagger: string
}

export type ZuoraConfig = {
  [CLIENT_CONFIG]?: ZuoraClientConfig
  [API_MODULES_CONFIG]: Record<string, ZuoraApiModuleConfig>
  [DISABLE_FILTERS]: boolean
}

export type ConfigChangeSuggestion = {
  // TODON add change suggestions
  type: keyof ZuoraConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const configID = new ElemID(constants.ZUORA)

export const usernamePasswordRESTCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    password: { type: BuiltinTypes.STRING },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

export const accessTokenCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    accessToken: { type: BuiltinTypes.STRING },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

export const isAccessTokenConfig = (config: Readonly<InstanceElement>): boolean => (
  // TODON change when changing to full oauth
  config.value.authType === 'accessToken'
)

// TODON use...
export const oauthRequestParameters = new ObjectType({
  elemID: configID,
  fields: {
    clientId: {
      type: BuiltinTypes.STRING,
      annotations: { message: 'OAuth client id' },
    },
    clientSecret: {
      type: BuiltinTypes.NUMBER,
      annotations: { message: 'OAuth client secret' },
    },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

// TODON reuse
export class UsernamePasswordRESTCredentials {
  constructor({ username, password, baseURL }:
    { username: string; password: string; baseURL: string }) {
    this.username = username
    this.password = password
    this.baseURL = baseURL
  }

  username: string
  password: string
  baseURL: string
}

export class OAuthAccessTokenCredentials {
  constructor({ baseURL, accessToken }: {
    baseURL: string
    accessToken: string
  }) {
    this.baseURL = baseURL
    this.accessToken = accessToken
  }

  baseURL: string
  accessToken: string
}

export type Credentials = UsernamePasswordRESTCredentials | OAuthAccessTokenCredentials

const dependsOnConfigType = new ObjectType({
  elemID: new ElemID(constants.ZUORA, 'dependsOnConfig'),
  fields: {
    endpoint: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
    field: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
  } as Record<keyof DependsOnConfig, FieldDefinition>,
})

const endpointConfigType = new ObjectType({
  elemID: new ElemID(constants.ZUORA, 'endpointConfig'),
  fields: {
    endpointRegex: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
    // queryParams: { type: new MapType(BuiltinTypes.STRING) },
    dependsOn: { type: new MapType(dependsOnConfigType) },
    doNotPersist: { type: BuiltinTypes.BOOLEAN },
  },
})

const apiModuleConfigType = new ObjectType({
  elemID: new ElemID(constants.ZUORA, 'apiModuleConfig'),
  fields: {
    include: { type: new ListType(endpointConfigType) },
    excludeRegex: { type: new ListType(BuiltinTypes.STRING) },
    swagger: {
      type: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
      },
    },
  } as Record<keyof ZuoraApiModuleConfig, FieldDefinition>,
})

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.ZUORA),
    },
    [API_MODULES_CONFIG]: {
      type: new MapType(apiModuleConfigType),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          billing: {
            // supports both uri and local file
            swagger: 'https://assets.zuora.com/zuora-documentation/swagger.yaml',
            include: [
              {
                endpointRegex: '^/v1/catalog/products$',
              },
              {
                endpointRegex: '^/objects/definitions/default$',
              },
              {
                // TODON undocumented. convert to namespace placeholder with above
                endpointRegex: '^/objects/definitions/com_zuora$',
              },
              {
                endpointRegex: '^/v1/accounting-codes$',
                // TODO name is not unique (has one conflict in the trial account)
              },
              {
                endpointRegex: '^/v1/accounting-periods$',
              },
              {
                endpointRegex: '^/v1/hostedpages$',
              },
              {
                endpointRegex: '^/notifications/notification-definitions$',
              },
              {
                endpointRegex: '^/notifications/email-templates$',
              },
              {
                endpointRegex: '^/v1/paymentgateways$',
              },
              {
                endpointRegex: '^/v1/sequence-sets$',
              },
              {
                endpointRegex: '^/settings/listing$',
              },
              {
                endpointRegex: '^/workflows$',
                doNotPersist: true,
              },
              {
                // TODON handle variable names even if they're not the same as the swagger?
                // may need to be more careful if using regexes (or just disallow regexes for this)
                endpointRegex: '^/workflows/{workflow_id}/export$',
                dependsOn: {
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  workflow_id: { endpoint: '/workflows', field: 'id' },
                },
              },
            ],
            excludeRegex: [],
          },
          // requires different credentials - should be in a separate module?
          // revenue: {
          //   // supports both uri and local file
          //   swagger: 'https://assets.zuora.com/zuora-documentation/RevPro_api.yaml',
          //   include: [
          //   ],
          //   excludeRegex: [],
          // },
        },
      },
    },
    [DISABLE_FILTERS]: { type: BuiltinTypes.BOOLEAN },
  },
})

export type FilterContext = {
  [API_MODULES_CONFIG]: Record<string, ZuoraApiModuleConfig>
}
