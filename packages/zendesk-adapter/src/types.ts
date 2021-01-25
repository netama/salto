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
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType, createApiBootstrapConfigType } = configUtils

// TODON add to documentation
export const CLIENT_CONFIG = 'client'
export const API_CONFIG = 'api'

export type ZendeskClientConfig = configUtils.ClientBaseConfig

export type ZendeskEndpointConfig = configUtils.EndpointConfig & {
  // when true, avoid trying to extract nested fields from response
  keepOriginal?: boolean
}

export type ZendeskApiConfig = Omit<configUtils.ApiEndpointBaseConfig, 'getEndpoints'> & {
  getEndpoints: ZendeskEndpointConfig[]
}

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [API_CONFIG]: ZendeskApiConfig
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

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.ZENDESK),
    },
    [API_CONFIG]: {
      type: createApiBootstrapConfigType(
        constants.ZENDESK,
        { keepOriginal: { type: BuiltinTypes.BOOLEAN } },
      ),
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
  },
})

export type FilterContext = {
  [API_CONFIG]: ZendeskApiConfig
}

export class ZendeskClient extends clientUtils.AdapterHTTPClient<Credentials> {
  // eslint-disable-next-line class-methods-use-this
  clientName(): string {
    return constants.ZENDESK
  }
}
