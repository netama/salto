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
import { ElemID, ObjectType, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createAdapterApiConfigType } = elementUtils.ducktype

// TODO add to documentation
export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type ZendeskClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type ZendeskFetchConfig = elementUtils.ducktype.UserFetchConfig
export type ZendeskApiConfig = elementUtils.ducktype.AdapterApiConfig

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_DEFINITIONS_CONFIG]?: ZendeskApiConfig
}

export type ConfigChangeSuggestion = {
  // TODO either add change suggestions or remove
  type: keyof ZendeskConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

export const DEFAULT_ENDPOINTS: Record<string, elementUtils.ducktype.EndpointConfig> = {
  groups: {
    request: {
      url: '/groups',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  custom_roles: {
    request: {
      url: '/custom_roles',
    },
  },
  organizations: {
    request: {
      url: '/organizations',
    },
  },
  views: {
    request: {
      url: '/views',
    },
    translation: {
      pathField: 'title',
    },
  },
  triggers: {
    request: {
      url: '/triggers',
    },
    translation: {
      pathField: 'title',
    },
  },
  automations: {
    request: {
      url: '/automations',
    },
    translation: {
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  slas_policies: {
    request: {
      url: '/slas/policies',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  slas_policies_definitions: {
    request: {
      url: '/slas/policies/definitions',
    },
    translation: {
    },
  },
  targets: {
    request: {
      url: '/targets',
    },
    translation: {
    },
  },
  macros: {
    request: {
      url: '/macros',
    },
    translation: {
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_actions: {
    request: {
      url: '/macros/actions',
    },
    translation: {
      // no unique identifier for individual items
      keepOriginal: true,
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_categories: {
    request: {
      url: '/macros/categories',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  macros_definitions: {
    request: {
      url: '/macros/definitions',
    },
    translation: {
    },
  },
  brands: {
    request: {
      url: '/brands',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  dynamic_content_items: {
    request: {
      url: '/dynamic_content/items',
      // TODO ensure includes variants too
    },
    translation: {
    },
  },
  locales: {
    request: {
      url: '/locales',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  business_hours_schedules: {
    request: {
      url: '/business_hours/schedules',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  sharing_agreements: {
    request: {
      url: '/sharing_agreements',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  recipient_addresses: {
    request: {
      url: '/recipient_addresses',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  ticket_forms: {
    // not always available
    request: {
      url: '/ticket_forms',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  ticket_fields: {
    request: {
      url: '/ticket_fields',
    },
    translation: {
      pathField: 'title',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  user_fields: {
    request: {
      url: '/user_fields',
    },
    translation: {
      pathField: 'key',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  organization_fields: {
    request: {
      url: '/organization_fields',
    },
    translation: {
      pathField: 'key',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  routing_attributes: {
    request: {
      url: '/routing/attributes',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  routing_attributes_definitions: {
    request: {
      url: '/routing/attributes/definitions',
    },
    translation: {
    },
  },
  workspaces: {
    // not always available
    request: {
      url: '/workspaces',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  apps_installations: {
    request: {
      url: '/apps/installations',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  apps_owned: {
    request: {
      url: '/apps/owned',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  oauth_clients: {
    // TODO should include?
    request: {
      url: '/oauth/clients',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  oauth_global_clients: {
    request: {
      url: '/oauth/global_clients',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  account_settings: {
    request: {
      url: '/account/settings',
    },
    translation: {
    },
  },
  ips: {
    // TODO should include?
    request: {
      url: '/ips',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  resource_collections: {
    request: {
      url: '/resource_collections',
    },
    translation: {
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  monitored_twitter_handles: {
    request: {
      url: '/channels/twitter/monitored_twitter_handles',
    },
    translation: {
    },
  },
  // TODO sunshine workflows?
}

export const configType = new ObjectType({
  elemID: new ElemID(constants.ZENDESK),
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.ZENDESK),
    },
    [FETCH_CONFIG]: {
      type: createUserFetchConfigType(constants.ZENDESK),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          includeEndpoints: [...Object.keys(DEFAULT_ENDPOINTS)].sort(),
        },
      },
    },
    [API_DEFINITIONS_CONFIG]: {
      type: createAdapterApiConfigType(constants.ZENDESK),
      // TODO decide if want to keep visible
      annotations: {
        [CORE_ANNOTATIONS.DEFAULT]: {
          endpoints: DEFAULT_ENDPOINTS,
        },
      },
    },
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_DEFINITIONS_CONFIG]: ZendeskApiConfig
}
