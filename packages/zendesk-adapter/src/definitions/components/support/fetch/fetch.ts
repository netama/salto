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
import { DEFAULT_FIELDS_TO_HIDE, DEFAULT_FIELD_CUSTOMIZATIONS, DEFAULT_ID_PARTS, NAME_ID_FIELD } from './shared'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge

export const SUPPORT_FETCH_CONFIG: definitions.fetch.FetchApiDefinitions = {
  instances: {
    default: {
      resource: {
        serviceIDFields: ['id'],
      },
      instance: {
        elemID: { parts: DEFAULT_ID_PARTS },
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
        path: { nestUnderParent: true },
      },
    },
    customizations: {
      // top-level, independent
      account_features: {
        isTopLevel: true,
        instance: {
          elemID: {
            singleton: true,
          },
          hide: true,
        },
      },
      account_setting: {
        isTopLevel: true,
        instance: {
          elemID: {
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
      trigger_definition: {
        isTopLevel: true,
        instance: {
          elemID: {
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
        isTopLevel: true,
        // tags are created by a filter (but need to be able to exclude), do nothing
        // old comment: placeholder for config validation (the type is created by a filter)
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'string',
            },
          },
        },
      },
      group: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/people/team/groups',
        },
      },
      resource_collection: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
        },
      },
      monitored_twitter_handle: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
        },
      },
      api_token: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [{ fieldName: 'description' }],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/apps-integrations/apis/zendesk-api/settings/tokens/',
        },
      },
      oauth_token: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [
              { fieldName: 'client_id', isReference: true },
              { fieldName: 'token' },
            ],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
        },
      },
      oauth_client: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [{ fieldName: 'identifier' }],
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
          serviceUrl: '/admin/apps-integrations/apis/zendesk-api/oauth_clients',
        },
      },
      oauth_global_client: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
        },
      },
      webhook: {
        isTopLevel: true,
        instance: {
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
          serviceUrl: '/admin/apps-integrations/webhooks/webhooks/{id}/details',
        },
      },
      sharing_agreement: {
        isTopLevel: true,
        instance: {
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
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [
              { fieldName: 'settings.name' },
              { fieldName: 'product' },
            ],
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
          serviceUrl: '/admin/apps-integrations/apps/support-apps',
        },
      },
      app_owned: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            parameters: {
              fieldType: 'map<app_owned__parameters>',
            },
          },
          serviceUrl: '/admin/apps-integrations/apps/support-apps',
        },
      },
      support_address: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [
              NAME_ID_FIELD,
              { fieldName: 'email', isReference: true },
            ],
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
        isTopLevel: true,
        resource: {
          recurseInto: {
            custom_object_fields: {
              type: 'custom_object_field',
              context: { custom_object_key: 'key' },
            },
          },
        },
        instance: {
          elemID: {
            parts: [{ fieldName: 'key' }],
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
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [
              { fieldName: 'status_category' },
              { fieldName: 'raw_agent_label' },
            ],
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
          serviceUrl: '/admin/objects-rules/tickets/ticket_statuses/edit/{id}',
        },
      },
      workspace: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/workspaces/agent-workspace/contextual-workspaces',
        },
      },
      locale: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [{ fieldName: 'locale' }],
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
        isTopLevel: true,
        instance: {
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
          serviceUrl: '/admin/account/brand_management/brands',
        },
      },
      ticket_form: {
        isTopLevel: true,
        instance: {
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
          serviceUrl: '/admin/objects-rules/tickets/ticket-forms/edit/{id}',
        },
      },
      target: {
        isTopLevel: true,
        instance: {
          elemID: {
            parts: [
              { fieldName: 'title' },
              { fieldName: 'type' },
            ],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/apps-integrations/targets/targets',
        },
      },
      dynamic_content_item: {
        isTopLevel: true,
        instance: {
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
          serviceUrl: '/admin/workspaces/agent-workspace/dynamic_content',
        },
      },
      sla_policy: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/slas',
        },
      },
      custom_role: {
        isTopLevel: true,
        instance: {
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
          serviceUrl: '/admin/people/team/roles/{id}',
        },
      },
      organization: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            organization_fields: {
              fieldType: 'map<unknown>',
            },
          },
          serviceUrl: '/agent/organizations/{id}/tickets',
        },
      },
      view: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            organization_fields: {
              fieldType: 'map<unknown>',
            },
          },
          serviceUrl: '/admin/workspaces/agent-workspace/views/{id}',
        },
      },
      automation: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/automations/{id}',
        },
      },
      macro: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            position: {
              omit: true,
            },
          },
          serviceUrl: '/admin/workspaces/agent-workspace/macros/{id}',
        },
      },
      macro_categories: { // TODON align to macro_actions?
        isTopLevel: true,
        instance: {
          elemID: { singleton: true },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
        },
      },

      trigger: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/triggers/{id}',
        },
      },
      // TODON align these 3 as much as possible? decide if worth it
      ticket_field: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [
            { fieldName: 'raw_title' },
            { fieldName: 'type' },
          ] },
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
          serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      user_field: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'key' }] },
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
          serviceUrl: '/agent/admin/user_fields/{id}',
        },
      },
      organization_field: {
        isTopLevel: true,
        instance: {
          elemID: { parts: [{ fieldName: 'key' }] },
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
          serviceUrl: '/agent/admin/organization_fields/{id}',
        },
      },
      trigger_category: {
        isTopLevel: true,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/triggers',
        },
      },
      trigger_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toTriggerOrderValue, // TODON? should change function signature...
        },
        instance: { // TODON need to aggregate when not singleton
          elemID: {
            singleton: true,
          },
          // TODON decide if should rename order type from trigger_order__order to trigger_order_entry
        },
        // TODON the type as returned from the service is not sorted correctly - fix!
      },
      automation_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('active'),
        },
        instance: {
        },
      },
      sla_policy_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue(),
        },
        instance: {
        },
      },
      ticket_form_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('active'),
        },
        instance: {
        },
      },
      organization_field_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('active'),
        },
        instance: {
        },
      },
      user_field_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('active'),
        },
        instance: {
        },
      },
      view_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('active'),
        },
        instance: {
        },
      },
      workspace_order: {
        isTopLevel: true,
        resource: {
          transform: transforms.toOrderValue('activated'),
        },
        instance: {
        },
      },

      macro_attachment: {
        isTopLevel: true,
        instance: {
          elemID: {
            // TODON filter does something close but not identical, need to regenerate ids if moving here
            extendsParent: true,
            parts: [{ fieldName: 'filename' }],
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
        isTopLevel: true,
        resource: {
          recurseInto: {
            holidays: {
              type: 'business_hours_schedule_holiday',
              context: { parent_id: 'id' },
            },
          },
          transform: transforms.transformBusinessHoursSchedule,
        },
        instance: {
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
          serviceUrl: '/admin/objects-rules/rules/schedules',
        },
      },
      routing_attribute: {
        isTopLevel: true,
        resource: {
          recurseInto: { // TODON make sure automatically adds correct field type
            values: {
              type: 'routing_attribute_value',
              context: { parent_id: 'id' },
            },
          },
        },
        instance: {
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
          serviceUrl: '/admin/objects-rules/rules/routing',
        },
      },

      // top-level, dependent
      custom_object_field: {
        isTopLevel: true,
        instance: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'key' }],
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
        isTopLevel: true,
        instance: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'locale_id', isReference: true }],
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
        isTopLevel: true,
        instance: {
          elemID: { extendsParent: true },
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
          serviceUrl: '/admin/objects-rules/rules/schedules', // TODON wasn't in old config but I think better
        },
      },
      routing_attribute_value: {
        isTopLevel: true,
        instance: {
          elemID: { extendsParent: true },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/routing',
        },
      },
      ticket_field__custom_field_options: {
        isTopLevel: true,
        instance: {
          elemID: {
            // TODON make sure specified everywhere, warn if standalone and not specified (during development at least)
            extendsParent: true,
            parts: [{ fieldName: 'value' }],
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
          serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      user_field__custom_field_options: {
        isTopLevel: true,
        instance: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'value' }],
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
          serviceUrl: '/admin/objects-rules/tickets/ticket-fields/{id}',
        },
      },
      organization_field__custom_field_options: {
        isTopLevel: true,
        instance: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'value' }],
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
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            id: {
              hide: true,
            },
          },
        },
      },
      sla_policy__filter__all: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            value: {
              fieldType: 'unknown',
            },
          },
        },
      },
      sla_policy__filter__any: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            value: {
              fieldType: 'unknown',
            },
          },
        },
      },
      view__restriction: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'unknown',
            },
          },
        },
      },
      trigger__conditions__all: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            is_user_value: {
              fieldType: 'boolean',
            },
          },
        },
      },
      trigger__conditions__any: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            is_user_value: {
              fieldType: 'boolean',
            },
          },
        },
      },
      app_owned__parameters: {
        isTopLevel: false,
        instance: {
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
        isTopLevel: false,
        instance: {
          // TODON technically reset fieldsToHide and not fieldsToOmit, but probably irrelevant?
          ignoreDefaultFieldCustomizations: true,
        },
      },
      workspace__selected_macros: {
        isTopLevel: false,
        instance: {
          ignoreDefaultFieldCustomizations: true,
          fieldCustomizations: {
            usage_7d: {
              omit: true,
            },
          },
        },
      },
      workspace__selected_macros__restriction: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'unknown',
            },
          },
        },
      },
      // old comment: Created in custom_object_field_options.ts (TODON check if can/should move to earlier)
      custom_object_field__custom_field_options: {
        isTopLevel: false,
        instance: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
        },
      },
    },
  },
}

// TODON not sure what this was used for, leftovers?
// ticket_fields: {
//   instance: {
//     fileNameFields: ['title'],
//     fieldsToHide: FIELDS_TO_HIDE.concat({ fieldName: 'id', fieldType: 'number' }),
//   },
// },
