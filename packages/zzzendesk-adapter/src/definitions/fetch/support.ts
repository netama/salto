/*
*                      Copyright 2024 Salto Labs Ltd.
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
import * as transforms from './transforms' // TODON split better...
import { DEFAULT_FIELDS_TO_HIDE, NAME_ID_FIELD } from './shared'
import { transformAppOwned } from './transforms'
import { InstanceFetchApiDefinitions } from '../types'

export const SUPPORT_FETCH_DEF: Record<string, InstanceFetchApiDefinitions> = {

  // top-level, independent
  account_features: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/account/features',
        },
        transformation: {
          root: 'features',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
        hide: true,
      },
    },
  },
  account_setting: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/account/settings',
        },
        transformation: {
          root: 'settings',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  trigger_definition: { // TODON extract in a smarter way? (see hardcoded_channels.ts)
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/triggers/definitions',
        },
        transformation: {
          root: 'definitions',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  tag: {
    // tags are created by a filter (but need to be able to exclude), do nothing
    // old comment: placeholder for config validation (the type is created by a filter)
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'string',
        },
      },
    },
  },
  group: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/groups',
        },
        transformation: {
          root: 'groups', // TODON default function that returns last part of url?
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/people/team/groups',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  resource_collection: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/resource_collections',
        },
        transformation: {
          root: 'resource_collections',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  monitored_twitter_handle: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/channels/twitter/monitored_twitter_handles',
        },
        transformation: {
          root: 'monitored_twitter_handles',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  api_token: {
    resource: {
      // SALTO-2177 token-related types that can optionally be supported - but are not included in the fetched types yet
      directFetch: false,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/api_tokens',
        },
        transformation: {
          root: 'api_tokens',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'description' }],
        },
        serviceUrl: {
          path: '/admin/apps-integrations/apis/zendesk-api/settings/tokens/',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  oauth_token: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/oauth/tokens',
        },
        transformation: {
          root: 'tokens',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'client_id', isReference: true },
            { fieldName: 'token' },
          ],
        },
        serviceUrl: {
          path: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  oauth_client: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/oauth/clients',
        },
        transformation: {
          root: 'clients',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'identifier' }],
        },
        serviceUrl: {
          path: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        secret: {
          fieldType: 'string', // TODON can avoid? recent change, probably due to IdoZ's change
          hide: true,
        },
        user_id: {
          fieldType: 'number', // TODON can avoid? recent change, probably due to IdoZ's change
          hide: true,
        },
      },
    },
  },
  oauth_global_client: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/oauth/global_clients',
        },
        transformation: {
          root: 'global_clients',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  webhook: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/webhooks',
        },
        transformation: {
          root: 'webhooks',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/apps-integrations/webhooks/webhooks/{id}/details',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        created_by: {
          hide: true,
        },
        updated_by: {
          hide: true,
        },
      },
    },
  },
  sharing_agreement: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/sharing_agreements',
        },
        transformation: {
          root: 'sharing_agreements',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        status: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['accepted', 'declined', 'pending', 'inactive'] },
        },
        type: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['inbound', 'outbound'] },
        },
      },
    },
  },
  app_installation: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/apps/installations',
        },
        transformation: {
          root: 'installations',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'settings.name' },
            { fieldName: 'product' },
          ],
        },
        serviceUrl: {
          path: '/admin/apps-integrations/apps/support-apps',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        updated: {
          omit: true,
        },
      },
    },
  },
  app_owned: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transformAppOwned,
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/apps/owned',
        },
        transformation: {
          root: 'apps', // TODON special
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/apps-integrations/apps/support-apps',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        parameters: {
          isMapWithDynamicType: true,
        },
      },
    },
  },
  support_address: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/recipient_addresses',
        },
        transformation: {
          root: 'recipient_addresses',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            NAME_ID_FIELD,
            { fieldName: 'email', isReference: true },
          ],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        cname_status: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['unknown', 'verified', 'failed'] },
        },
        dns_results: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['verified', 'failed'] },
        },
        domain_verification_status: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['unknown', 'verified', 'failed'] },
        },
        forwarding_status: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['unknown', 'waiting', 'verified', 'failed'] },
        },
        spf_status: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['unknown', 'verified', 'failed'] },
        },
        domain_verification_code: {
          hide: true,
        },
        username: {
          hide: true,
        },
      },
    },
  },
  custom_object: {
    resource: {
      directFetch: true,
      recurseInto: {
        custom_object_fields: {
          typeName: 'custom_object_field',
          context: {
            args: {
              custom_object_key: {
                fromField: 'key',
              },
            },
          },
        },
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/custom_objects',
        },
        transformation: {
          root: 'custom_objects',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'key' }],
        },
      },
      fieldCustomizations: {
        // TODON check if has an id field (original config was inconsistent, overriding type but not hiding)
        custom_object_fields: {
          standalone: {
            typeName: 'custom_object_field', // TODON verify
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        created_by_user_id: {
          hide: true,
        },
        updated_by_user_id: {
          hide: true,
        },
        // these fields are generated by their raw_ counterparts, and we create them on preDeploy
        title: {
          omit: true,
        },
        title_pluralized: {
          omit: true,
        },
        description: {
          omit: true,
        },
      },
    },
  },
  custom_status: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/custom_statuses',
        },
        transformation: {
          root: 'custom_statuses',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'status_category' },
            { fieldName: 'raw_agent_label' },
          ],
        },
        serviceUrl: {
          path: '/admin/objects-rules/tickets/ticket_statuses/edit/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        end_user_label: {
          hide: true,
        },
        agent_label: {
          hide: true,
        },
        description: {
          hide: true,
        },
        end_user_description: {
          hide: true,
        },
        default: {
          hide: true,
        },
      },
    },
  },
  workspace: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/workspaces',
        },
        transformation: {
          root: 'workspaces',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/workspaces/agent-workspace/contextual-workspaces',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  locale: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/locales',
        },
        transformation: {
          root: 'locales',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'locale' }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  brand: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/brands',
        },
        transformation: {
          root: 'brands',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/account/brand_management/brands',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        help_center_state: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['enabled', 'disabled', 'restricted'] },
        },
        categories: {
          fieldType: 'list<category>',
        },
        ticket_form_ids: {
          omit: true,
        },
      },
    },
  },
  ticket_form: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/ticket_forms',
        },
        transformation: {
          root: 'ticket_forms',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/objects-rules/tickets/ticket-forms/edit/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        name: {
          hide: true,
        },
        display_name: {
          omit: true,
        },
      },
    },
  },
  target: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/targets',
        },
        transformation: {
          root: 'targets',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'title' },
            { fieldName: 'type' },
          ],
        },
        serviceUrl: {
          path: '/admin/apps-integrations/targets/targets',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  dynamic_content_item: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/dynamic_content/items',
        },
        transformation: {
          root: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/workspaces/agent-workspace/dynamic_content',
        },
      },
      fieldCustomizations: {
        variants: {
          standalone: {
            typeName: 'dynamic_content_item__variants',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  sla_policy: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/slas/policies',
        },
        transformation: {
          root: 'sla_policies',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/objects-rules/rules/slas',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  custom_role: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/custom_roles',
        },
        transformation: {
          root: 'custom_roles',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/people/team/roles/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        role_type: {
          omit: true,
        },
        team_member_count: {
          omit: true,
        },
      },
    },
  },
  organization: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/organizations',
        },
        transformation: {
          root: 'organizations',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/agent/organizations/{id}/tickets',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        organization_fields: {
          fieldType: 'map<unknown>',
        },
      },
    },
  },
  view: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/views',
        },
        transformation: {
          root: 'views',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/workspaces/agent-workspace/views/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        organization_fields: {
          fieldType: 'map<unknown>',
        },
      },
    },
  },
  automation: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/automations',
        },
        transformation: {
          root: 'automations',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/objects-rules/rules/automations/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  macro: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/macros',
        },
        transformation: {
          root: 'macros',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/workspaces/agent-workspace/macros/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        position: {
          omit: true,
        },
      },
    },
  },
  macro_categories: { // TODON align to macro_actions?
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/macros/categories',
        },
        transformation: {
          root: '.',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },

  trigger: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/triggers',
        },
        transformation: {
          root: 'triggers',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: {
          path: '/admin/objects-rules/rules/triggers/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  // TODON align these 3 as much as possible? decide if worth it
  ticket_field: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/ticket_fields',
        },
        transformation: {
          root: 'ticket_fields',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [
          { fieldName: 'raw_title' },
          { fieldName: 'type' },
        ] },
        serviceUrl: {
          path: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            typeName: 'ticket_field__custom_field_options',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        title: {
          hide: true,
        },
        position: {
          omit: true,
        },
        description: {
          omit: true,
        },
        title_in_portal: {
          omit: true,
        },
        // TODO may want to add back as part of SALTO-2895 - TODON old TODO, check
        custom_statuses: {
          omit: true,
        },
      },
    },
  },
  user_field: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/user_fields',
        },
        transformation: {
          root: 'user_fields',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'key' }] },
        serviceUrl: {
          path: '/agent/admin/user_fields/{id}',
        },
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            typeName: 'user_field__custom_field_options',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        type: {
          fieldType: 'string',
        },
        title: {
          hide: true,
        },
        description: {
          omit: true,
        },
      },
    },
  },
  organization_field: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/organization_fields',
        },
        transformation: {
          root: 'organization_fields',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'key' }] },
        serviceUrl: {
          path: '/agent/admin/organization_fields/{id}',
        },
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            typeName: 'organization_field__custom_field_options',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        type: {
          fieldType: 'string',
        },
        title: {
          hide: true,
        },
        description: {
          omit: true,
        },
      },
    },
  },
  trigger_category: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/trigger_categories',
        },
        transformation: {
          root: 'trigger_categories',
          omit: ['position'],
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/objects-rules/rules/triggers',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  trigger_order: {
    resource: {
      // TODON maybe depend on trigger+categories resources without additional calls (also for others)
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toTriggerOrderValue, // TODON? should change function signature...
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/triggers',
        },
        transformation: {
          root: 'triggers',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //     { fieldName: 'title' },
          //   ],
          // },
          nestUnderField: 'triggers',
        },
      },
      {
        endpoint: {
          path: '/api/v2/trigger_categories',
        },
        // TODON example of a type getting values from multiple extractors and depending on all of them
        transformation: {
          root: 'trigger_categories',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: { // TODON maybe not needed if removing this?
          //   sortBy: [
          //     { fieldName: 'position' },
          //   ],
          // },
          nestUnderField: 'categories',
        },
      },
    ],
    element: { // TODON need to aggregate when not singleton
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
      // TODON decide if should rename order type from trigger_order__order to trigger_order_entry
    },
    // TODON the type as returned from the service is not sorted correctly - fix!
  },
  automation_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'active', sortByFields: ['position', 'title'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/automations',
        },
        transformation: {
          root: 'automations',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //     { fieldName: 'title' },
          //   ],
          // },
          // TODON this one is a singleton so it's ok - usually we'd want to group by the service id(s),
          // so we'd probably want them to be in the "response" value we pass on
          // (and they'll need to overlap between the different parts)
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  sla_policy_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ sortByFields: ['position', 'title'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/slas/policies',
        },
        transformation: {
          root: 'sla_policies',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //     { fieldName: 'title' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  ticket_form_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'active', sortByFields: ['position'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/ticket_forms',
        },
        transformation: {
          root: 'ticket_forms',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  organization_field_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'active', sortByFields: ['position'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/organization_fields',
        },
        transformation: {
          root: 'organization_fields',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  user_field_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'active', sortByFields: ['position'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/user_fields',
        },
        transformation: {
          root: 'user_fields',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  view_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'active', sortByFields: ['position', 'title'] }),
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/views',
        },
        transformation: {
          root: 'views',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //     { fieldName: 'title' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  workspace_order: {
    resource: {
      directFetch: true,
      mergeAndTransform: {
        adjust: transforms.toOrderValue({ activeFieldName: 'activated', sortByFields: ['position'] }), // TODON need to fix
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/workspaces',
        },
        transformation: {
          root: 'workspaces',
          // TODON re-do with fragments? (need to sort!)
          // aggregate: {
          //   sortBy: [
          //     { fieldName: 'position' },
          //   ],
          // },
          nestUnderField: 'items',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },

  macro_attachment: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          // TODON filter does something close but not identical, need to regenerate ids if moving here
          extendsParent: true,
          parts: [{ fieldName: 'filename' }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },

  business_hours_schedule: {
    resource: {
      directFetch: true,
      recurseInto: {
        holidays: {
          typeName: 'business_hours_schedule_holiday',
          context: {
            args: {
              parent_id: {
                fromField: 'id',
              },
            },
          },
        },
      },
      mergeAndTransform: {
        adjust: transforms.transformBusinessHoursSchedule,
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/business_hours/schedules',
        },
        transformation: {
          root: 'schedules',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/objects-rules/rules/schedules',
        },
      },
      fieldCustomizations: {
        holidays: {
          standalone: {
            typeName: 'business_hours_schedule_holiday',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  routing_attribute: {
    resource: {
      directFetch: true,
      recurseInto: { // TODON make sure automatically adds correct field type
        values: {
          typeName: 'routing_attribute_value',
          context: {
            args: {
              parent_id: {
                fromField: 'id',
              },
            },
          },
        },
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/routing/attributes',
        },
        transformation: {
          root: 'attributes',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/objects-rules/rules/routing',
        },
      },
      fieldCustomizations: {
        values: {
          standalone: {
            typeName: 'routing_attribute_value',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },

  // top-level, dependent
  custom_object_field: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/custom_objects/{custom_object_key}/fields',
        },
        transformation: {
          root: 'custom_object_fields',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'key' }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        description: {
          omit: true,
        },
        title: {
          omit: true,
        },
        custom_field_options: {
          standalone: {
            typeName: 'custom_object_field__custom_field_options',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
      },
    },
  },
  dynamic_content_item__variants: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'locale_id', isReference: true }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  business_hours_schedule_holiday: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/business_hours/schedules/{parent_id}/holidays',
        },
        transformation: {
          root: 'holidays',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { extendsParent: true },
        serviceUrl: {
          path: '/admin/objects-rules/rules/schedules', // TODON wasn't in old config but I think better
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        start_year: {
          fieldType: 'string',
          hide: true,
        },
        end_year: {
          fieldType: 'string',
          hide: true,
        },
      },
    },
  },
  routing_attribute_value: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/routing/attributes/{parent_id}/values',
        },
        transformation: {
          root: 'attribute_values',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { extendsParent: true },
        serviceUrl: {
          path: '/admin/objects-rules/rules/routing',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  ticket_field__custom_field_options: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          // TODON make sure specified everywhere, warn if standalone and not specified (during development at least)
          extendsParent: true,
          parts: [{ fieldName: 'value' }],
        },
        serviceUrl: {
          path: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      fieldCustomizations: {

        id: {
          fieldType: 'number',
          hide: true,
        },
        value: {
          fieldType: 'string',
          restrictions: {
            enforce_value: true,
            // this regex will not allow the following characters to be in the string:
            // & % $ # @ ! { } [ ] = + ( ) * ? < > , " ' ` ; \
            regex: '^[^&%$#@\\! \\{\\}\\[\\]=\\+\\(\\)\\*\\?<>,"\'`;\\\\]+$',
          },
        },
        name: {
          omit: true,
        },
      },
    },
  },
  user_field__custom_field_options: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'value' }],
        },
        serviceUrl: {
          path: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        default: {
          hide: true, // TODON from old config, not aligned with ticket field options so maybe not needed?
        },
        name: {
          omit: true,
        },
      },
    },
  },
  organization_field__custom_field_options: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'value' }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        name: {
          omit: true,
        },
      },
      // TODON old config didn't have serviceUrl, check if can add
    },
  },
  // TODON add organization_field_order, user_field_order etc from filters
  // TODON organization_field_order had an id fieldsToHide, probably by mistake but confirm

  // inner types
  // TODON generalize
  macro_category: { // TODON check if needed
    element: {
      fieldCustomizations: {
        id: {
          hide: true,
        },
      },
      sourceTypeName: 'macro_cateogires__macro_categories', // TODON check if needed, adjust
    },
  },
  sla_policy__filter__all: {
    element: {
      fieldCustomizations: {
        value: {
          fieldType: 'unknown',
        },
      },
    },
  },
  sla_policy__filter__any: {
    element: {
      fieldCustomizations: {
        value: {
          fieldType: 'unknown',
        },
      },
    },
  },
  view__restriction: {
    element: {
      fieldCustomizations: {
        id: {
          fieldType: 'unknown',
        },
      },
    },
  },
  trigger__conditions__all: {
    element: {
      fieldCustomizations: {
        is_user_value: {
          fieldType: 'boolean',
        },
      },
    },
  },
  trigger__conditions__any: {
    element: {
      fieldCustomizations: {
        is_user_value: {
          fieldType: 'boolean',
        },
      },
    },
  },
  app_owned__parameters: {
    element: {
      ignoreDefaultFieldCustomizations: true,
      fieldCustomizations: {
        ...DEFAULT_FIELDS_TO_HIDE,
        id: {
          hide: true,
        },
        app_id: {
          hide: true,
        },
      },
    },
  },
  workspace__apps: {
    element: {
      // TODON technically reset fieldsToHide and not fieldsToOmit, but probably irrelevant?
      ignoreDefaultFieldCustomizations: true,
    },
  },
  workspace__selected_macros: {
    element: {
      ignoreDefaultFieldCustomizations: true,
      fieldCustomizations: {
        usage_7d: {
          omit: true,
        },
      },
    },
  },
  workspace__selected_macros__restriction: {
    element: {
      fieldCustomizations: {
        id: {
          fieldType: 'unknown',
        },
      },
    },
  },
  // old comment: Created in custom_object_field_options.ts (TODON check if can/should move to earlier)
  custom_object_field__custom_field_options: {
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'value' }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
}

// TODON not sure what this was used for, leftovers?
// ticket_fields: {
//   element: {
//     fileNameFields: ['title'],
//     fieldsToHide: FIELDS_TO_HIDE.concat({ fieldName: 'id', fieldType: 'number' }),
//   },
// },
