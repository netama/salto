/*
*                      Copyright 2023 Salto Labs Ltd.
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
import { definitions } from '@salto-io/adapter-components'
import { PAGE_SIZE } from '../../../config'
import { PaginationOptions } from '../pagination'

// TODON add option to "normalize" endpoints to use generic params (e.g. id, parent_id)
// without losing the original - either when loading the swagger add a mapping, or add a "matched_endpoints" arg here?
// hiding this when lodaing is probably better, similarly to cloned types?

export const SUPPORT_ENDPOINTS: definitions.EndpointByPathAndMethod<PaginationOptions> = {
  default: {
    get: {
      pagination: 'oldCursor',
    },
    delete: {
      omitBody: true,
    },
  },
  customizations: {
    '/api/v2/groups': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'groups', // TODON default function that returns last part of url?
            toType: 'group', // TODON use these by default to generate depndencies? on how to query?
          },
        ],
      },
    },
    '/api/v2/custom_roles': {
      get: {
        responseExtractors: [
          {
            root: 'custom_roles',
            toType: 'custom_role',
          },
        ],
      },
    },
    '/api/v2/custom_objects': {
      get: {
        queryArgs: { per_page: String(PAGE_SIZE) },
        responseExtractors: [
          {
            root: 'custom_objects',
            toType: 'custom_object',
          },
        ],
      },
    },
    '/api/v2/custom_objects/{custom_object_key}/fields': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'custom_object_fields',
            toType: 'custom_object_field',
          },
        ],
      },
    },
    '/api/v2/organizations': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'organizations',
            toType: 'organization',
          },
        ],
      },
    },
    '/api/v2/views': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'views',
            toType: 'view',
            omit: ['position'],
          },
          {
            root: 'views',
            toType: 'view_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
                { fieldName: 'title' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/triggers': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'triggers',
            toType: 'trigger',
            omit: ['position'], // TODON remove "omit" from fetch
          },
          {
            root: 'triggers',
            toType: 'trigger_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
                { fieldName: 'title' },
              ],
            },
            nestUnderField: 'triggers',
          },
        ],
      },
    },
    '/api/v2/triggers/definitions': { // TODON extract in a smarter way? (see hardcoded_channels.ts)
      get: {
        responseExtractors: [
          {
            root: 'definitions',
            toType: 'trigger_definition',
          },
        ],
      },
    },
    '/api/v2/trigger_categories': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'trigger_categories',
            toType: 'trigger_category',
            omit: ['position'],
          },
          { // TODON example of a type getting values from multiple extractors and depending on all of them
            root: 'trigger_categories',
            toType: 'trigger_order',
            aggregate: { // TODON maybe not needed if removing this?
              sortBy: [
                { fieldName: 'position' },
              ],
            },
            nestUnderField: 'categories',
          },
        ],
      },
    },
    '/api/v2/automations': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'automations',
            toType: 'automation',
            omit: ['position'],
          },
          {
            root: 'automations',
            toType: 'automation_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
                { fieldName: 'title' },
              ],
            },
            // TODON this one is a singleton so it's ok - usually we'd want to group by the service id(s),
            // so we'd probably want them to be in the "response" value we pass on
            // (and they'll need to overlap between the different parts)
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/slas/policies': {
      get: {
        responseExtractors: [
          {
            root: 'sla_policies',
            toType: 'sla_policy',
            omit: ['position'],
          },
          {
            root: 'sla_policies',
            toType: 'sla_policy_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
                { fieldName: 'title' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/targets': {
      get: {
        responseExtractors: [
          {
            root: 'targets',
            toType: 'target',
          },
        ],
      },
    },
    '/api/v2/macros': {
      get: {
        pagination: 'cursor',
        queryArgs: {
          access: 'shared',
        },
        responseExtractors: [
          {
            root: 'macros',
            toType: 'macro',
          },
        ],
      },
    },
    '/api/v2/macros/categories': {
      get: {
        // TODON mark as no-pagination / single-page?
        responseExtractors: [
          {
            root: '.',
            toType: 'macro_categories',
          },
        ],
      },
    },
    // TODON make sure can remove (omitted in remove_definition_instances.ts)
    // '/api/v2/routing/attributes/definitions': {
    //   get: {
    //     responseExtractors: [
    //       {
    //         root: 'definitions',
    //         toType: 'routing_attribute_definition',
    //       },
    //     ],
    //   },
    // },
    // '/api/v2/slas/policies/definitions': {
    //   get: {
    //     responseExtractors: [
    //       {
    //         root: 'value',
    //         toType: 'sla_policy_definition',
    //       },
    //     ],
    //   },
    // },
    // '/api/v2/macros/actions': {
    //   get: {
    //     // TODON mark as no-pagination / single-page?
    //     responseExtractors: [
    //       {
    //         root: '.',
    //         toType: 'macros_actions',
    //       },
    //     ],
    //   },
    // },
    // '/api/v2/macros/definitions': {
    //   get: {
    //     pagination: 'cursor',
    //     responseExtractors: [
    //       {
    //         root: 'definitions',
    //         toType: 'macro_definition',
    //       },
    //     ],
    //   },
    // },
    '/api/v2/brands': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'brands',
            toType: 'brand',
          },
        ],
      },
    },
    '/api/v2/custom_statuses': {
      get: {
        responseExtractors: [
          {
            root: 'custom_statuses',
            toType: 'custom_status',
          },
        ],
      },
    },
    '/api/v2/dynamic_content/items': {
      get: {
        responseExtractors: [
          {
            root: 'items',
            toType: 'dynamic_content_item',
          },
        ],
      },
    },
    '/api/v2/locales': {
      get: {
        responseExtractors: [
          {
            root: 'locales',
            toType: 'locale',
          },
        ],
      },
    },
    '/api/v2/business_hours/schedules': {
      get: {
        responseExtractors: [
          {
            root: 'schedules',
            toType: 'business_hours_schedule',
          },
        ],
      },
    },
    '/api/v2/business_hours/schedules/{parent_id}/holidays': {
      get: {
        responseExtractors: [
          {
            root: 'holidays',
            toType: 'business_hours_schedule_holiday',
          },
        ],
      },
    },
    '/api/v2/routing/attributes': {
      get: {
        responseExtractors: [
          {
            root: 'attributes',
            toType: 'routing_attribute',
          },
        ],
      },
    },
    '/api/v2/routing/attributes/{parent_id}/values': {
      get: {
        responseExtractors: [
          {
            root: 'attribute_values',
            toType: 'routing_attribute_value',
          },
        ],
      },
    },
    '/api/v2/sharing_agreements': {
      get: {
        responseExtractors: [
          {
            root: 'sharing_agreements',
            toType: 'sharing_agreement',
          },
        ],
      },
    },
    '/api/v2/recipient_addresses': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'recipient_addresses',
            toType: 'support_address',
          },
        ],
      },
    },
    '/api/v2/ticket_forms': {
      // not always available // TODON remove comment?
      get: {
        responseExtractors: [
          {
            root: 'ticket_forms',
            toType: 'ticket_form',
            omit: ['position'],
          },
          {
            root: 'ticket_forms',
            toType: 'ticket_form_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/ticket_fields': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'ticket_fields',
            toType: 'ticket_field',
          },
        ],
      },
    },
    '/api/v2/user_fields': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'user_fields',
            toType: 'user_field',
            omit: ['position'],
          },
          {
            root: 'user_fields',
            toType: 'user_field_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/organization_fields': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'organization_fields',
            toType: 'organization_field',
            omit: ['position'],
          },
          {
            root: 'organization_fields',
            toType: 'organization_field_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/workspaces': {
      // not always available
      get: {
        responseExtractors: [
          {
            root: 'workspaces',
            toType: 'workspace',
            omit: ['position'],
          },
          {
            root: 'workspaces',
            toType: 'workspace_order',
            aggregate: {
              sortBy: [
                { fieldName: 'position' },
              ],
            },
            nestUnderField: 'items',
          },
        ],
      },
    },
    '/api/v2/apps/installations': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'installations',
            toType: 'app_installation',
          },
        ],
      },
    },
    '/api/v2/apps/owned': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'apps', // TODON special
            toType: 'app_owned',
          },
        ],
      },
    },
    '/api/v2/oauth/clients': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'clients',
            toType: 'oauth_client',
          },
        ],
      },
    },
    '/api/v2/oauth/global_clients': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'global_clients',
            toType: 'oauth_global_client',
          },
        ],
      },
    },
    '/api/v2/account/settings': {
      get: {
        responseExtractors: [
          {
            root: 'settings',
            toType: 'account_setting',
          },
        ],
      },
    },
    '/api/v2/resource_collections': {
      get: {
        responseExtractors: [
          {
            root: 'resource_collections',
            toType: 'resource_collection',
          },
        ],
      },
    },
    '/api/v2/channels/twitter/monitored_twitter_handles': {
      get: {
        responseExtractors: [
          {
            root: 'monitored_twitter_handles',
            toType: 'monitored_twitter_handle',
          },
        ],
      },
    },
    '/api/v2/webhooks': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'webhooks',
            toType: 'webhook',
          },
        ],
      },
    },
    // SALTO-2177 token-related types that can optionally be supported - but are not included under supportedTypes yet
    // TODON make sure won't be "accidentally" supported!
    // (maybe add a "non_standard" flag here that we can override for specific customers?)
    '/api/v2/api_tokens': {
      get: {
        responseExtractors: [ // TODON consider keying by root? assuming one type each
          {
            root: 'api_tokens',
            toType: 'api_token',
          },
        ],
      },
    },
    '/api/v2/oauth/tokens': {
      get: {
        pagination: 'cursor',
        responseExtractors: [
          {
            root: 'tokens',
            toType: 'oauth_token',
          },
        ],
      },
    },
    '/api/v2/account/features': {
      get: {
        responseExtractors: [
          {
            root: 'features',
            toType: 'account_features',
          },
        ],
      },
    },
  },
}

// TODON add "content" queries (attachment content) either here or on a new client -
// but should be doable as part of the "main" fetch

// TODON also look at recent code changes
