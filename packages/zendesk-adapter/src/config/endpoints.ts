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
import { config as configUtils } from '@salto-io/adapter-components'
import { paginate } from '../client/pagination'
import { CURSOR_BASED_PAGINATION_FIELD, DEFAULT_QUERY_PARAMS, PAGE_SIZE } from '../config'

// TODON should move to client folder!
// TODON and also fetch and deploy should move to dedicated folders?

// TODON add option to "normalize" endpoints to use generic params (e.g. id, parent_id)
// without losing the original - either when loading the swagger add a mapping, or add a "matched_endpoints" arg here?
// hiding this when lodaing is probably better, similarly to cloned types?

export const SUPPORT_ENDPOINTS: configUtils.EndpointByPathAndMethod = {
  default: {
    get: {
      pagination: {
        type: paginate, // TODON check if working (didn't adjust)
        args: {
          field: 'next_page', // TODON formalize - should replace today's paginationField (if at all...)
        },
      },
    },
    delete: {
      omitBody: true,
    },
  },
  customizations: {
    '/api/v2/groups': {
      get: {
        queryArgs: DEFAULT_QUERY_PARAMS, // TODON remove for the few excluded types and move this to default
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS, // TODON should be added by paginator as well
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS, // TODON should be added by paginator as well
        responseExtractors: [
          {
            root: 'views',
            toType: 'view',
          },
        ],
      },
    },
    '/api/v2/triggers': {
      get: {
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'triggers',
            toType: 'trigger',
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'trigger_categories',
            toType: 'trigger_category',
          },
        ],
      },
    },
    '/api/v2/automations': {
      get: {
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'automations',
            toType: 'automation',
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: {
          ...DEFAULT_QUERY_PARAMS,
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
    //     pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
    //     queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
          },
        ],
      },
    },
    '/api/v2/ticket_fields': {
      get: {
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'user_fields',
            toType: 'user_field',
          },
        ],
      },
    },
    '/api/v2/organization_fields': {
      get: {
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'organization_fields',
            toType: 'organization_field',
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
          },
        ],
      },
    },
    '/api/v2/apps/installations': {
      get: {
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
        responseExtractors: [
          {
            root: 'webhooks',
            toType: 'webhook',
          },
        ],
      },
    },
    // SALTO-2177 token-related types that can optionally be supported - but are not included under supportedTypes yet
    // TODON make sure won't be "accidentally" supported! (maybe add a "non_standard" flag here that we can override for specific customers?)
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
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        queryArgs: DEFAULT_QUERY_PARAMS,
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

// TODON Guide "global" endpoints - can consolidate with "support" ones?
export const GUIDE_GLOBAL_ENDPOINTS: configUtils.EndpointByPathAndMethod = {
  default: {
    get: {
      pagination: {
        type: paginate, // TODON check if working (didn't adjust)
        args: {
          field: 'next_page', // TODON formalize - should replace today's paginationField (if at all...)
        },
      },
    },
    delete: {
      omitBody: true,
    },
  },
  customizations: {
    '/api/v2/guide/permission_groups': {
      get: {
        queryArgs: { per_page: String(PAGE_SIZE) },
        responseExtractors: [
          {
            root: 'permission_groups',
            toType: 'permission_group',
          },
        ],
      },
    },
    '/api/v2/help_center/user_segments': {
      get: {
        queryArgs: DEFAULT_QUERY_PARAMS,
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: 'user_segments',
            toType: 'user_segment',
          },
        ],
      },
    },
  },
}

// TODON brand-specific based on subdomain - should use different clients
export const GUIDE_BRAND_SPECIFIC_ENDPOINTS: configUtils.EndpointByPathAndMethod = {
  default: {
    get: {
      pagination: {
        type: paginate, // TODON check if working (didn't adjust)
        args: {
          field: 'next_page', // TODON formalize - should replace today's paginationField (if at all...)
        },
      },
    },
    delete: {
      omitBody: true,
    },
  },
  customizations: {
    '/hc/api/internal/help_center_translations': {
      get: {
        queryArgs: DEFAULT_QUERY_PARAMS, // TODON remove for the few excluded types and move this to default
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: '.',
            toType: 'guide_language_settings',
          },
        ],
      },
    },
    '/hc/api/internal/general_settings': {
      get: {
        queryArgs: DEFAULT_QUERY_PARAMS,
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: '.',
            toType: 'guide_settings',
          },
        ],
      },
    },
    '/api/v2/help_center/categories': {
      get: {
        queryArgs: {
          ...DEFAULT_QUERY_PARAMS,
          include: 'translations',
        },
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: 'categories',
            toType: 'category',
          },
        ],
      },
    },
    '/api/v2/help_center/sections': {
      get: {
        queryArgs: {
          ...DEFAULT_QUERY_PARAMS,
          include: 'translations',
        },
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: 'sections',
            toType: 'section',
          },
        ],
      },
    },
    // we are using this endpoint for better parallelization of requests on large accounts
    // sort_by is added since articles for which the order is alphabetically fail (to avoid future bugs)
    '/api/v2/help_center/categories/{category_id}/articles': {
      get: {
        queryArgs: {
          ...DEFAULT_QUERY_PARAMS,
          include: 'translations',
          sort_by: 'updated_at',
        },
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: 'articles',
            toType: 'article',
          },
        ],
      },
    },
    '/api/v2/help_center/articles/{article_id}/attachments': {
      get: {
        queryArgs: {
          ...DEFAULT_QUERY_PARAMS,
        },
        pagination: { args: { field: CURSOR_BASED_PAGINATION_FIELD } },
        responseExtractors: [
          {
            root: 'article_attachments',
            toType: 'article_attachment',
          },
        ],
      },
    },
  },
}

// TODON add "content" queries (attachment content) either here or on a new client - but should be doable as part of the "main" fetch

// TODON also look at recent code changes