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
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createAdapterApiConfigType } = elementUtils.ducktype

// TODON add to documentation
export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_RESOURCES_CONFIG = 'apiResources'

export type ZendeskClientConfig = clientUtils.ClientBaseConfig

export type ZendeskFetchConfig = elementUtils.ducktype.UserFetchConfig
export type ZendeskApiConfig = elementUtils.ducktype.AdapterApiConfig

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_RESOURCES_CONFIG]?: ZendeskApiConfig
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

export const DEFAULT_RESOURCES: Record<string, elementUtils.ducktype.ResourceConfig> = {
  groups: {
    endpoint: {
      url: '/groups',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  custom_roles: {
    endpoint: {
      url: '/custom_roles',
    },
  },
  organizations: {
    endpoint: {
      url: '/organizations',
    },
  },
  views: {
    endpoint: {
      url: '/views',
      pathField: 'title',
    },
  },
  triggers: {
    endpoint: {
      url: '/triggers',
      pathField: 'title',
    },
  },
  automations: {
    endpoint: {
      url: '/automations',
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  slas_policies: {
    endpoint: {
      url: '/slas/policies',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  slas_policies_definitions: {
    endpoint: {
      url: '/slas/policies/definitions',
    },
  },
  targets: {
    endpoint: {
      url: '/targets',
    },
  },
  macros: {
    endpoint: {
      url: '/macros',
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_actions: {
    endpoint: {
      url: '/macros/actions',
      // no unique identifier for individual items
      keepOriginal: true,
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_categories: {
    endpoint: {
      url: '/macros/categories',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_definitions: {
    endpoint: {
      url: '/macros/definitions',
    },
  },
  brands: {
    endpoint: {
      url: '/brands',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  dynamic_content_items: {
    endpoint: {
      url: '/dynamic_content/items',
      // TODON ensure includes variants too
    },
  },
  locales: {
    endpoint: {
      url: '/locales',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  business_hours_schedules: {
    endpoint: {
      url: '/business_hours/schedules',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  sharing_agreements: {
    endpoint: {
      url: '/sharing_agreements',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  recipient_addresses: {
    endpoint: {
      url: '/recipient_addresses',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  ticket_forms: {
    // not always available
    endpoint: {
      url: '/ticket_forms',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  ticket_fields: {
    endpoint: {
      url: '/ticket_fields',
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  user_fields: {
    endpoint: {
      url: '/user_fields',
      pathField: 'key',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  organization_fields: {
    endpoint: {
      url: '/organization_fields',
      pathField: 'key',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  routing_attributes: {
    endpoint: {
      url: '/routing/attributes',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  routing_attributes_definitions: {
    endpoint: {
      url: '/routing/attributes/definitions',
    },
  },
  workspaces: {
    // not always available
    endpoint: {
      url: '/workspaces',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  apps_installations: {
    endpoint: {
      url: '/apps/installations',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  apps_owned: {
    endpoint: {
      url: '/apps/owned',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  oauth_clients: {
    // TODON should include?
    endpoint: {
      url: '/oauth/clients',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  oauth_global_clients: {
    endpoint: {
      url: '/oauth/global_clients',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  account_settings: {
    endpoint: {
      url: '/account/settings',
    },
  },
  ips: {
    // TODON should include?
    endpoint: {
      url: '/ips',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  resource_collections: {
    endpoint: {
      url: '/resource_collections',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  monitored_twitter_handles: {
    endpoint: {
      url: '/channels/twitter/monitored_twitter_handles',
    },
  },
  // TODON sunshine workflows?
}

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.ZENDESK),
    },
    [FETCH_CONFIG]: {
      type: createUserFetchConfigType(constants.ZENDESK),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          // TODON decide on order?
          includeResources: Object.keys(DEFAULT_RESOURCES),
        },
      },
    },
    [API_RESOURCES_CONFIG]: {
      type: createAdapterApiConfigType(constants.ZENDESK),
      // TODO decide if want to keep or remove
      annotations: {
        [CORE_ANNOTATIONS.DEFAULT]: {
          // TODON decide on order?
          resources: DEFAULT_RESOURCES,
        },
      },
    },
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_RESOURCES_CONFIG]: ZendeskApiConfig
}
