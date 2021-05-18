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
import { ElemID, ObjectType, CORE_ANNOTATIONS, BuiltinTypes, ListType, MapType } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { ZENDESK_SUPPORT } from './constants'

const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType, createDucktypeAdapterApiConfigType, validateDuckTypeFetchConfig,
} = configUtils

// TODON add to documentation
export const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: 'created_at', fieldType: 'string' },
  { fieldName: 'updated_at', fieldType: 'string' },
  { fieldName: 'extended_input_schema' },
  { fieldName: 'extended_output_schema' },
]

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type ZendeskClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type ZendeskFetchConfig = configUtils.UserFetchConfig
export type ZendeskApiConfig = configUtils.AdapterDuckTypeApiConfig

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_DEFINITIONS_CONFIG]: ZendeskApiConfig
}

export const DEFAULT_TYPES: Record<string, configUtils.TypeDuckTypeConfig> = {
  groups: {
    request: {
      url: '/groups',
    },
  },
  // eslint-disable-next-line camelcase
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
    transformation: {
      fileNameFields: ['title'],
    },
  },
  triggers: {
    request: {
      url: '/triggers',
    },
    transformation: {
      fileNameFields: ['title'],
    },
  },
  automations: {
    request: {
      url: '/automations',
    },
    transformation: {
      fileNameFields: ['title'],
    },
  },
  // eslint-disable-next-line camelcase
  slas_policies: {
    request: {
      url: '/slas/policies',
    },
  },
  // eslint-disable-next-line camelcase
  slas_policies_definitions: {
    request: {
      url: '/slas/policies/definitions',
    },
  },
  targets: {
    request: {
      url: '/targets',
    },
  },
  macros: {
    request: {
      url: '/macros',
    },
    transformation: {
      fileNameFields: ['title'],
    },
  },
  // eslint-disable-next-line camelcase
  macros_actions: {
    request: {
      url: '/macros/actions',
    },
    transformation: {
      // no unique identifier for individual items
      dataField: '.',
    },
  },
  // eslint-disable-next-line camelcase
  macros_categories: {
    request: {
      url: '/macros/categories',
    },
  },
  // eslint-disable-next-line camelcase
  macros_definitions: {
    request: {
      url: '/macros/definitions',
    },
  },
  brands: {
    request: {
      url: '/brands',
    },
  },
  // eslint-disable-next-line camelcase
  dynamic_content_items: {
    request: {
      url: '/dynamic_content/items',
      // TODO ensure includes variants too
    },
  },
  locales: {
    request: {
      url: '/locales',
    },
  },
  // eslint-disable-next-line camelcase
  business_hours_schedules: {
    request: {
      url: '/business_hours/schedules',
    },
  },
  // eslint-disable-next-line camelcase
  sharing_agreements: {
    request: {
      url: '/sharing_agreements',
    },
  },
  // eslint-disable-next-line camelcase
  recipient_addresses: {
    request: {
      url: '/recipient_addresses',
    },
  },
  // eslint-disable-next-line camelcase
  ticket_forms: {
    // not always available
    request: {
      url: '/ticket_forms',
    },
  },
  // eslint-disable-next-line camelcase
  ticket_fields: {
    request: {
      url: '/ticket_fields',
    },
    transformation: {
      fileNameFields: ['title'],
    },
  },
  // eslint-disable-next-line camelcase
  user_fields: {
    request: {
      url: '/user_fields',
    },
    transformation: {
      fileNameFields: ['key'],
    },
  },
  // eslint-disable-next-line camelcase
  organization_fields: {
    request: {
      url: '/organization_fields',
    },
    transformation: {
      fileNameFields: ['key'],
    },
  },
  // eslint-disable-next-line camelcase
  routing_attributes: {
    request: {
      url: '/routing/attributes',
    },
  },
  // eslint-disable-next-line camelcase
  routing_attributes_definitions: {
    request: {
      url: '/routing/attributes/definitions',
    },
  },
  workspaces: {
    // not always available
    request: {
      url: '/workspaces',
    },
  },
  // eslint-disable-next-line camelcase
  apps_installations: {
    request: {
      url: '/apps/installations',
    },
  },
  // eslint-disable-next-line camelcase
  apps_owned: {
    request: {
      url: '/apps/owned',
    },
  },
  // eslint-disable-next-line camelcase
  oauth_clients: {
    // TODO should include?
    request: {
      url: '/oauth/clients',
    },
  },
  // eslint-disable-next-line camelcase
  oauth_global_clients: {
    request: {
      url: '/oauth/global_clients',
    },
  },
  // eslint-disable-next-line camelcase
  account_settings: {
    request: {
      url: '/account/settings',
    },
  },
  ips: {
    // TODO should include?
    request: {
      url: '/ips',
    },
  },
  // eslint-disable-next-line camelcase
  resource_collections: {
    request: {
      url: '/resource_collections',
    },
  },
  // eslint-disable-next-line camelcase
  monitored_twitter_handles: {
    request: {
      url: '/channels/twitter/monitored_twitter_handles',
    },
  },
  // TODO sunshine workflows?
}

export const configType = new ObjectType({
  elemID: new ElemID(ZENDESK_SUPPORT),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(ZENDESK_SUPPORT),
    },
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(
        ZENDESK_SUPPORT,
        { serviceConnectionNames: { refType: new MapType(new ListType(BuiltinTypes.STRING)) } },
      ),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          includeTypes: [
            ...Object.keys(_.pickBy(DEFAULT_TYPES, def => def.request !== undefined)),
          ].sort(),
        },
      },
    },
    [API_DEFINITIONS_CONFIG]: {
      refType: createDucktypeAdapterApiConfigType({ adapter: ZENDESK_SUPPORT }),
      annotations: {
        [CORE_ANNOTATIONS.DEFAULT]: {
          typeDefaults: {
            transformation: {
              idFields: DEFAULT_ID_FIELDS,
              fieldsToOmit: FIELDS_TO_OMIT,
            },
          },
          types: DEFAULT_TYPES,
        },
      },
    },
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: ZendeskFetchConfig
  [API_DEFINITIONS_CONFIG]: ZendeskApiConfig
}

export const validateFetchConfig = validateDuckTypeFetchConfig
