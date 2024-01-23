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
import * as transforms from './transforms' // TODON split better...
import { DEFAULT_FIELDS_TO_HIDE, NAME_ID_FIELD } from './shared'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge

export const SUPPORT_FETCH_DEF: Record<string, definitions.fetch.InstanceFetchApiDefinitions> = {

  // top-level, independent
  account_features: {
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          singleton: true,
        },
        hide: true,
      },
    },
  },
  account_setting: {
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          singleton: true,
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
  trigger_definition: {
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          singleton: true,
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
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/people/team/groups',
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
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'description' }],
        },
        serviceUrl: '/admin/apps-integrations/apis/zendesk-api/settings/tokens/',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'client_id', isReference: true },
            { fieldName: 'token' },
          ],
        },
        serviceUrl: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'identifier' }],
        },
        serviceUrl: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/apps-integrations/webhooks/webhooks/{id}/details',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'settings.name' },
            { fieldName: 'product' },
          ],
        },
        serviceUrl: '/admin/apps-integrations/apps/support-apps',
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
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/apps-integrations/apps/support-apps',
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        parameters: {
          fieldType: 'map<app_owned__parameters>',
        },
      },
    },
  },
  support_address: {
    resource: {
      directFetch: true,
    },
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
          type: 'custom_object_field',
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
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'status_category' },
            { fieldName: 'raw_agent_label' },
          ],
        },
        serviceUrl: '/admin/objects-rules/tickets/ticket_statuses/edit/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/workspaces/agent-workspace/contextual-workspaces',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/account/brand_management/brands',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/objects-rules/tickets/ticket-forms/edit/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'title' },
            { fieldName: 'type' },
          ],
        },
        serviceUrl: '/admin/apps-integrations/targets/targets',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/workspaces/agent-workspace/dynamic_content',
      },
      fieldCustomizations: {
        variants: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/objects-rules/rules/slas',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/people/team/roles/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/agent/organizations/{id}/tickets',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/workspaces/agent-workspace/views/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/objects-rules/rules/automations/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/workspaces/agent-workspace/macros/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { singleton: true },
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'title' }] },
        serviceUrl: '/admin/objects-rules/rules/triggers/{id}',
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [
          { fieldName: 'raw_title' },
          { fieldName: 'type' },
        ] },
        serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'key' }] },
        serviceUrl: '/agent/admin/user_fields/{id}',
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'key' }] },
        serviceUrl: '/agent/admin/organization_fields/{id}',
      },
      fieldCustomizations: {
        custom_field_options: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/objects-rules/rules/triggers',
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
      directFetch: true, // TODON maybe depend on trigger+categories resources without additional calls (also for others)
      transform: transforms.toTriggerOrderValue, // TODON? should change function signature...
    },
    element: { // TODON need to aggregate when not singleton
      topLevel: {
        isTopLevel: true,
        elemID: {
          singleton: true,
        },
      },
      // TODON decide if should rename order type from trigger_order__order to trigger_order_entry
    },
    // TODON the type as returned from the service is not sorted correctly - fix!
  },
  automation_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('active'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  sla_policy_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue(),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  ticket_form_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('active'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  organization_field_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('active'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  user_field_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('active'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  view_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('active'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  workspace_order: {
    resource: {
      directFetch: true,
      transform: transforms.toOrderValue('activated'),
    },
    element: {
      topLevel: {
        isTopLevel: true,
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
          type: 'business_hours_schedule_holiday',
          context: {
            args: {
              parent_id: {
                fromField: 'id',
              },
            },
          },
        },
      },
      transform: transforms.transformBusinessHoursSchedule,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/objects-rules/rules/schedules',
      },
      fieldCustomizations: {
        holidays: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
          type: 'routing_attribute_value',
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
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: '/admin/objects-rules/rules/routing',
      },
      fieldCustomizations: {
        values: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { extendsParent: true },
        serviceUrl: '/admin/objects-rules/rules/schedules', // TODON wasn't in old config but I think better
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
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { extendsParent: true },
        serviceUrl: '/admin/objects-rules/rules/routing',
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
        serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
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
        serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
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
