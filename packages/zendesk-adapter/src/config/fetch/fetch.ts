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
import { FieldIDPart } from '@salto-io/adapter-components/src/config'
import { EVERYONE_USER_TYPE } from '../../constants'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge


// TODON adjust types?
const DEFAULT_FIELDS_TO_HIDE: Record<string, configUtils.ElementFieldCustomization> = {
  created_at: {
    hide: true,
  },
  updated_at: {
    hide: true,
  },
  created_by_id: {
    hide: true,
  },
  updated_by_id: {
    hide: true,
  },
}
const DEFAULT_FIELDS_TO_OMIT: Record<string, configUtils.ElementFieldCustomization> = {
  extended_input_schema: {
    omit: true,
  },
  extended_output_schema: {
    omit: true,
  },
  url: {
    omit: true,
  },
  count: {
    omit: true,
  },
}

const NAME_ID_FIELD: FieldIDPart = { fieldName: 'name' }
const DEFAULT_ID_PARTS = [NAME_ID_FIELD]

const DEFAULT_FIELD_CUSTOMIZATIONS: Record<string, configUtils.ElementFieldCustomization> = {
  ...DEFAULT_FIELDS_TO_HIDE,
  ...DEFAULT_FIELDS_TO_OMIT,
}

export const SUPPORT_FETCH_CONFIG: configUtils.FetchApiConfig = {
  instances: {
    default: {
      transformation: {
        elemID: { parts: DEFAULT_ID_PARTS },
        serviceIDFields: ['id'],
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
        path: { nestUnderParent: true },
      },
    },
    customizations: {
      // top-level, independent
      account_features: {
        isTopLevel: true,
        transformation: {
          elemID: {
            singleton: true,
          },
        },
      },
      account_setting: {
        isTopLevel: true,
        transformation: {
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
        transformation: {
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
        transformation: {
          fieldCustomizations: {
            id: {
              fieldType: 'string',
            },
          },
        },
      },
      group: {
        isTopLevel: true,
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
              restrictions: { enforce_value: true, values: ['inbound', 'outbound'] }
            },
          },
        },
      },
      app_installation: {
        isTopLevel: true,
        transformation: {
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
        transformation: {
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
        transformation: {
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
        requests: {
          default: {
            recurseInto: {
              custom_object_fields: {
                type: 'custom_object_field',
                context: { custom_object_key: 'key' },
              },
            },
          },
        },
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            organization_fields: {
              fieldType: 'map<unknown>'
            },
          },
          serviceUrl: '/agent/organizations/{id}/tickets',
        },
      },
      view: {
        isTopLevel: true,
        transformation: {
          elemID: { parts: [{ fieldName: 'title' }] },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            organization_fields: {
              fieldType: 'map<unknown>'
            },
          },
          serviceUrl: '/admin/workspaces/agent-workspace/views/{id}',
        },
      },
      automation: {
        isTopLevel: true,
        transformation: {
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
        transformation: {
          elemID: { parts: [{ fieldName: 'title' } ] },
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
        transformation: {
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
        transformation: {
          elemID: { parts: [{ fieldName: 'title' } ] },
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
          },
          serviceUrl: '/admin/objects-rules/rules/triggers',
        },
      },

      // TODON support these types in fetch (currently in filters)
      trigger_order: {
        isTopLevel: true,
      },
      macro_attachment: {
        isTopLevel: true,
        transformation: {
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
        requests: {
          default: {
            recurseInto: {
              holidays: {
                type: 'business_hours_schedule_holiday',
                context: { parent_id: 'id' },
              },
            },
          },
        },
        transformation: {
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
        requests: {
          default: {
            recurseInto: { // TODON make sure automatically adds correct field type
              values: {
                type: 'routing_attribute_value',
                context: { parent_id: 'id' },            
              },
            },
          },
        },
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
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
        transformation: {
          elemID: {
            extendsParent: true, // TODON make sure specified everywhere, warn if standalone and not specified (during development at least)
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
        transformation: {
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
        transformation: {
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
        transformation: {
          fieldCustomizations: {
            id: {
              hide: true,
            },
          },
        },
      },
      sla_policy__filter__all: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            value: {
              fieldType: 'unknown',
            },
          },
        },
      },
      sla_policy__filter__any: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            value: {
              fieldType: 'unknown',
            },
          },
        },
      },
      view__restriction: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            id: {
              fieldType: 'unknown',
            },
          },
        },
      },
      trigger__conditions__all: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            is_user_value: {
              fieldType: 'boolean',
            },
          },
        },
      },
      trigger__conditions__any: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            is_user_value: {
              fieldType: 'boolean',
            },
          },
        },
      },
      app_owned__parameters: {
        isTopLevel: false,
        transformation: {
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
        transformation: {
          ignoreDefaultFieldCustomizations: true, // TODON technically reset fieldsToHide and not fieldsToOmit, but probably irrelevant?
        },
      },
      workspace__selected_macros: {
        isTopLevel: false,
        transformation: {
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
        transformation: {
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
        transformation: {
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

export const GUIDE_GLOBAL_FETCH_CONFIG: configUtils.FetchApiConfig = {
  instances: {
    default: {
      transformation: { // TODON move to constants to avoid duplication
        elemID: { parts: DEFAULT_ID_PARTS },
        serviceIDFields: ['id'],
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
        path: { nestUnderParent: true },
      },
    },
    customizations: {
      // top-level, independent
      permission_group: {
        isTopLevel: true,
        transformation: {
          fieldCustomizations: {
            id: {
              hide: true,
              fieldType: 'number',
            },
          },
          serviceUrl: '/knowledge/permissions/{id}',
        },
      },
      user_segment: {
        isTopLevel: true,
        transformation: {
          fieldCustomizations: {
            id: {
              hide: true,
              fieldType: 'number',
            },
            added_user_ids: {
              fieldType: 'list<unknown>', // TODON confirm works, used to be List<...>
            },
            organization_ids: {
              fieldType: 'list<unknown>', // TODON confirm works, used to be List<...>
            },
            user_type: {
              fieldType: 'string',
              restrictions: { enforce_value: true, values: ['signed_in_users', 'staff', EVERYONE_USER_TYPE] },    
            },
          },
          serviceUrl: '/knowledge/user_segments/edit/{id}',
        },
      },
      // top-level, dependent

      // inner types
    },
  },
}

const BRAND_ID_PART: configUtils.FieldIDPart = { fieldName: 'brand', isReference: true }

export const GUIDE_BRAND_SPECIFIC_FETCH_CONFIG: configUtils.FetchApiConfig = {
  instances: {
    default: {
      transformation: {
        elemID: { parts: DEFAULT_ID_PARTS },
        serviceIDFields: ['id'],
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
        path: { nestUnderParent: true },
      },
    },
    customizations: {
      // top-level, independent (except for dependency on brand) - TODON formalize!
      guide_settings: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [BRAND_ID_PART],
          },
          fieldCustomizations: {
            default_locale: { // TODON won't be needed if setting as part of request?
              fieldType: 'string',
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      guide_language_settings: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [
              BRAND_ID_PART,
              { fieldName: 'locale' },
            ],
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      category: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [
              NAME_ID_FIELD,
              BRAND_ID_PART,
            ],
          },
          fieldCustomizations: {
            translations: {
              standalone: {
                addParentAnnotation: true,
                referenceFromParent: true,
              },
              fieldType: 'list<category_translation>',
            },
            id: {
              fieldType: 'number',
              hide: true,
            },
            position: {
              hide: true,
            },
            sections: {
              fieldType: 'list<section>',
            },
            html_url: {
              omit: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      section: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [
              NAME_ID_FIELD,
              { fieldName: 'direct_parent_id', isReference: true },
            ],
          },
          fieldCustomizations: {
            translations: {
              standalone: {
                addParentAnnotation: true,
                referenceFromParent: true,
              },
              fieldType: 'list<section_translation>',
            },
            id: {
              fieldType: 'number',
              hide: true,
            },
            parent_section_id: {
              fieldType: 'number',
            },
            position: {
              hide: true,
            },
            sections: {
              fieldType: 'list<section>',
            },
            articles: {
              fieldType: 'list<section>',
            },
            html_url: {
              omit: true,
            },
            // directParent and parentType are created to avoid collisions
            direct_parent_id: {
              hide: true,
            },
            direct_parent_type: {
              hide: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      article: {
        isTopLevel: true,
        requests: {
          default: {
            context: {
              category_id: {
                typeName: 'category',
                fieldName: 'id',
              },
            },
            recurseInto: {
              attachments: {
                type: 'article_attachment',
                context: {
                  'article_id': 'id',
                },
              },
            },
          },
        },
        transformation: {
          elemID: {
            parts: [
              { fieldName: 'title' },
              { fieldName: 'section_id', isReference: true },
            ],
          },
          fieldCustomizations: {
            translations: {
              standalone: {
                addParentAnnotation: true,
                referenceFromParent: true,
              },
              fieldType: 'list<category_translation>',
            },
            attachments: {
              standalone: {
                addParentAnnotation: true,
                referenceFromParent: true,
              },
              fieldType: 'list<article_attachment>', // TODON not needed if will get automatically from recurseInto?
            },
            id: {
              fieldType: 'number',
              hide: true,
            },
            author_id: {
              fieldType: 'unknown',
            },
            html_url: {
              omit: true,
            },
            vote_sum: {
              omit: true,
            },
            vote_count: {
              omit: true,
            },
            edited_at: {
              omit: true,
            },
            name: {
              omit: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },

      // top-level, dependent
      
      // TODON currently built in filter (and only added here for the elem-id regenerate?) - decide if should implement here or still in filter
      category_order: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [],
            extendsParent: true,
          },
        },
      },
      section_order: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [],
            extendsParent: true,
          },
        },
      },
      article_order: {
        isTopLevel: true,
        transformation: {
          elemID: {
            parts: [],
            extendsParent: true,
          },
        },
      },

      // the following 3 are almost identical, consolidate
      category_translation: {
        // TODON had dataField: 'translations' but probably not in use anymore?
        isTopLevel: true,
        transformation: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'locale', isReference: true }],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            brand: {
              fieldType: 'number',
            },
            created_by_id: {
              fieldType: 'unknown',
            },
            updated_by_id: {
              fieldType: 'unknown',
            },
            html_url: {
              omit: true,
            },
            source_id: {
              omit: true,
            },
            source_type: {
              omit: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      section_translation: {
        // TODON had { dataField: 'translations' } but probably not in use anymore?
        isTopLevel: true,
        transformation: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'locale', isReference: true }],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            brand: {
              fieldType: 'number',
            },
            created_by_id: {
              fieldType: 'unknown',
            },
            updated_by_id: {
              fieldType: 'unknown',
            },
            html_url: {
              omit: true,
            },
            source_id: {
              omit: true,
            },
            source_type: {
              omit: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      article_translation: {
        // TODON had { dataField: 'translations' } but probably not in use anymore?
        isTopLevel: true,
        transformation: {
          elemID: {
            extendsParent: true,
            parts: [{ fieldName: 'locale', isReference: true }],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            brand: {
              fieldType: 'number',
            },
            created_by_id: {
              fieldType: 'unknown',
            },
            updated_by_id: {
              fieldType: 'unknown',
            },
            html_url: {
              omit: true,
            },
            source_id: {
              omit: true,
            },
            source_type: {
              omit: true,
            },
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },
      // old comment: currently articles do not share attachments, if this changes the attachment code should be reviewed!
      article_attachment: {
        isTopLevel: true,
        transformation: {
          elemID: {
            extendsParent: true,
            parts: [
              { fieldName: 'file_name' },
              { fieldName: 'inline' },
            ],
          },
          fieldCustomizations: {
            id: {
              fieldType: 'number',
              hide: true,
            },
            content_url: {
              hide: true,
            },
            size: {
              hide: true,
            },
            hash: {
              hide: true,
              fieldType: 'string', // TODON won't need to override if defining during fetch instead of in a filter
            },
            content: {
              fieldType: 'string', // TODON won't need to override if defining during fetch instead of in a filter
            },
            // TODON most fields that are omitted here can instead be omitted in the endpoint!
            // except those needed for elem-id generation / a dependent request or element
            article_id: {
              omit: true,
            },
            display_file_name: {
              omit: true,
            },
            relative_path: {
              omit: true,
            },
            // TODON article_attachments was listed in old config but seems incorrect? confirm
          },
          // serviceUrl is created in help_center_service_url filter - TODON see if can move
        },
      },

      // inner types
      guide_settings__help_center: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            feature_restrictions: { // TODON move to omit in endpoint
              omit: true, // omitted as it does not impact deploy? (TODON confirm?)
            },
          },
        },
      },
      guide_settings__help_center__settings: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            id: {
              omit: true,
            },
            account_id: {
              omit: true,
            },
            help_center_id: {
              omit: true,
            },
            created_at: {
              omit: true,
            },
            updated_at: {
              omit: true,
            },
            draft: {
              omit: true,
            },
            kind: {
              omit: true,
            },
          },
        },
      },
      guide_settings__help_center__text_filter: {
        isTopLevel: false,
        transformation: {
          fieldCustomizations: {
            id: {
              omit: true,
            },
            account_id: {
              omit: true,
            },
            help_center_id: {
              omit: true,
            },
            created_at: {
              omit: true,
            },
            updated_at: {
              omit: true,
            },
          },
        },
      },
    },
  },
}


// TODON make sure not needed (override field type?) when fetching
// trigger_order_entry: {
//   transformation: {
//     sourceTypeName: 'trigger_order__order',
//   },
// },
// ticket_fields: {
//   transformation: {
//     fileNameFields: ['title'],
//     fieldsToHide: FIELDS_TO_HIDE.concat({ fieldName: 'id', fieldType: 'number' }),
//   },
// },
