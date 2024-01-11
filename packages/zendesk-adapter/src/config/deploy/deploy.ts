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
import { Values, getChangeData } from '@salto-io/adapter-api'
import { config as configUtils } from '@salto-io/adapter-components'
import { serializeTemplates } from '@salto-io/adapter-utils'
import { ARTICLES_FIELD, BRAND_FIELD, CATEGORIES_FIELD, DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME, DEFAULT_LOCALE, LOGO_FIELD, PARENT_SECTION_ID_FIELD, SECTIONS_FIELD, TICKET_FIELD_TYPE_NAME, TICKET_STATUS_CUSTOM_STATUS_TYPE_NAME, TRANSLATIONS_FIELD } from '../../constants'
import { prepRef as articleBodyPrepRef } from '../../filters/article/article_body'
import { createStandardItemDeployConfigs, createStandardOrderDeployConfigs, createStandardTranslationDeployConfigs, setDefaultFlag } from './utils'

const DEFAULT_CONTEXT = {
  id: 'id',
  // TODON make sure doesn't break when no parent exists
  parent_id: '_parent.0.id',
}

export const SUPPORT_DEPLOY_CONFIG: configUtils.DeployApiConfig = {
  instances: {
    default: {
      requestsByAction: {
        default: {
          // TODON move template and reference resolution here in a generic way? first see cases
          // additionalResolvers: [],
          request: {
            context: DEFAULT_CONTEXT,
          },
        },
      },
    },
    // "simple" (single-change)
    customizations: {
      ...createStandardItemDeployConfigs({
        app_installation: {
          bulkPath: '/api/v2/apps/installations',
          overrides: { default: { request: {
            nestUnderField: '.', // TODON make sure handled correctly
            omit: ['app', 'settings.title', 'settings_objects'],
          } } },
        },
        automation: { bulkPath: '/api/v2/automations' },
        brand: {
          bulkPath: '/api/v2/brands',
          overrides: { default: { request: { omit: [LOGO_FIELD, CATEGORIES_FIELD] } } },
        },
        business_hours_schedule: {
          bulkPath: '/api/v2/business_hours/schedules',
          overrides: { default: { request: {
            nestUnderField: 'schedule',
            omit: ['holidays'],
          } } },
        },
        custom_object: {
          bulkPath: '/api/v2/custom_objects',
          overrides: { default: { request: {
            context: { key: 'key'},
            omit: ['custom_object_fields'],
          } } },
        },
        custom_role: { bulkPath: '/api/v2/custom_roles' },
        custom_status: {
          bulkPath: '/api/v2/custom_statuses',
          withoutActions: ['remove'],
        },
        dynamic_content_item: { bulkPath: '/api/v2/dynamic_content/items' }, // TODON check about variants
        group: { bulkPath: '/api/v2/groups' },
        macro: { bulkPath: '/api/v2/macros' },
        oauth_client: { bulkPath: '/api/v2/oauth/clients' },
        organization: { bulkPath: '/api/v2/organizations' },
        routing_attribute: {
          bulkPath: '/api/v2/routing/attributes',
          overrides: { default: { request: {
            nestUnderField: 'attribute',
            omit: ['values'],
          } } },
        },
        sharing_agreement: { bulkPath: '/api/v2/sharing_agreements' },
        sla_policy: { bulkPath: '/api/v2/slas/policies' },
        support_address: {
          bulkPath: '/api/v2/recipient_addresses',
          overrides: { default: { request: { nestUnderField: 'recipient_address' } } },
        },
        target: {
          bulkPath: '/api/v2/targets',
          // TODON check: we don't get the password, maybe just not have the field instead?
          overrides: { default: { request: { omit: ['username', 'password'] } } },
        },
        ticket_form: { bulkPath: '/api/v2/ticket_forms' },
        trigger: { bulkPath: '/api/v2/triggers' },
        trigger_category: {
          bulkPath: '/api/v2/trigger_categories',
          overrides: { customizations: { modify: { request: { method: 'patch' } } } },
        },
        view: {
          bulkPath: '/api/v2/views',
          overrides: { default: { request: { omit: ['conditions', 'execution'] } } },
        },
        webhook: {
          bulkPath: '/api/v2/webhooks',
          overrides: {
            // Ignore external_source because it is impossible to deploy, the user was warned in externalSourceWebhook.ts
            default: { request: { omit: ['external_source'] } },
            customizations: { modify: { request: { method: 'patch' } } },
          },
        },
        workspace: {
          bulkPath: '/api/v2/workspaces',
          overrides: { default: { request: { omit: ['selected_macros'] } } },
        },

        // parent-child
        business_hours_schedule_holiday: {
          bulkPath: '/api/v2/business_hours/schedules/{parent_id}/holidays',
          overrides: { default: { request: { nestUnderField: 'variant' } } },
        },
        custom_object_field: {
          bulkPath: '/api/v2/custom_objects/{parent_key}/fields',
          idField: 'key',
          overrides: { default: { request: { context: {
            parent_key: '_parent.0.key',
            key: 'key',
          } } } },
        },
        dynamic_content_item__variants: {
          bulkPath: '/api/v2/dynamic_content/items/{parent_id}/variants',
          overrides: { default: { request: { nestUnderField: 'variant' } } },
        },
        routing_attribute_value: {
          bulkPath: '/api/v2/routing/attributes/{parent_id}/values',
          overrides: { default: { request: { nestUnderField: 'attribute_value' } } },
        },
        // TODON decide if should add ticket_field, organization_field, user_field here with customizations or leave as-is
      }),

      ...createStandardOrderDeployConfigs({
        account_setting: { path: '/api/v2/account/settings', nestUnderField: 'settings' },
        automation_order: { path: '/api/v2/automations/update_many' },
        organization_field_order: { path: '/api/v2/organization_fields/reorder' },
        sla_policy_order: { path: '/api/v2/slas/policies/reorder' },
        user_field_order: { path: '/api/v2/user_fields/reorder' },
        ticket_form_order: { path: '/api/v2/ticket_forms/reorder' },
        view_order: { path: '/api/v2/views/update_many' },
        workspace_order: { path: '/api/v2/workspaces/reorder' },
      }),
      trigger_order: {
        requestsByAction: {
          customizations: {
            modify: {
              request: {
                path: '/api/v2/trigger_categories/jobs',
                method: 'post',
                nestUnderField: 'job',
              },
            },
          },
        },
      },

      // replacing filters (WIP)
      ticket_field: { // TODON continue!!!
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'ticket_field',
              omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
              context: {
                ticketFieldId: 'id',
              },
              // TODON resolve ticket field options + run setDefaultFlag on each of them pre-deploy
              // transform: item => item,
            },
            // TODON assign ids to children as well - consider running in filter!
            // fromResponse: () => (),
          },
          customizations: {
            add: [
              // return successfully for custom status ticket field additions
              {
                condition: ({ change }) => getChangeData(change).value.type === TICKET_STATUS_CUSTOM_STATUS_TYPE_NAME,
                request: {
                  succeedWithoutRequest: true,
                },
              },
              {
                request: {
                  path: '/api/v2/ticket_fields',
                  method: 'post',
                },
              },
            ],
            modify: {
              request: {
                path: '/api/v2/ticket_fields/{ticketFieldId}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/api/v2/ticket_fields/{ticketFieldId}',
                method: 'delete',
              },
            },
          },
        },
      },
      ticket_field__custom_field_options: {
        requestsByAction: {
          default: { // TODON when specified, should be assigned to _all_ requests?
            // only make request if parent was not changed (otherwise this is changed through the parent)
            condition: ({ changeGroup }: configUtils.InstanceChangeAndGroup) => changeGroup.changes.find(change => getChangeData(change).elemID.typeName === TICKET_FIELD_TYPE_NAME) === undefined,
            request: {
              nestUnderField: 'custom_field_option',
              context: {
                ticketFieldId: '_parent.0.id',
                ticketFieldOptionId: 'id',
              },
              transform: setDefaultFlag,
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/ticket_fields/{ticketFieldId}/options',
                method: 'post',
                transform: setDefaultFlag,
              },
            },
            modify: {
              request: { // TODON same as add, make sure intentional
                path: '/api/v2/ticket_fields/{ticketFieldId}/options',
                method: 'post',
              },
            },
            remove: {
              request: {
                path: '/api/v2/ticket_fields/{ticketFieldId}/options/{ticketFieldOptionId}',
                method: 'delete',
              },
            },
          },
        },
      },
      // TODON didn't look at filters yet for the rest - config only!!!
      user_field: { // TODON continue!!!
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'user_field',
              omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
              context: {
                userFieldId: 'id',
              },
              // TODON resolve field options + run setDefaultFlag on each of them pre-deploy
              // transform: item => item,
            },
            // TODON assign ids to children as well - consider running in filter!
            // fromResponse: () => (),
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/user_fields',
                method: 'post',
              },
            },
            modify: {
              request: {
                path: '/api/v2/user_fields/{userFieldId}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/api/v2/user_fields/{userFieldId}',
                method: 'delete',
              },
            },
          },
        },
      },
      user_field__custom_field_options: {
        requestsByAction: {
          default: {
            // only make request if parent was not changed (otherwise this is changed through the parent)
            condition: ({ changeGroup }: configUtils.InstanceChangeAndGroup) => changeGroup.changes.find(change => getChangeData(change).elemID.typeName === TICKET_FIELD_TYPE_NAME) === undefined,
            request: {
              nestUnderField: 'custom_field_option',
              context: {
                userFieldId: '_parent.0.id',
                userFieldOptionId: 'id',
              },
              transform: setDefaultFlag,
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/user_fields/{userFieldId}/options',
                method: 'post',
                transform: setDefaultFlag,
              },
            },
            modify: {
              request: { // TODON same as add, make sure intentional
                path: '/api/v2/user_fields/{userFieldId}/options',
                method: 'post',
              },
            },
            remove: {
              request: {
                path: '/api/v2/user_fields/{userFieldId}/options/{userFieldOptionId}',
                method: 'delete',
              },
            },
          },
        },
      },
      organization_field: { // TODON continue!!!
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'organization_field',
              omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
              context: {
                organizationFieldId: 'id',
              },
              // TODON resolve field options + run setDefaultFlag on each of them pre-deploy
              // transform: item => item,
            },
            // TODON assign ids to children as well - consider running in filter!
            // fromResponse: () => (),
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/organization_fields',
                method: 'post',
              },
            },
            modify: {
              request: {
                path: '/api/v2/organization_fields/{organizationFieldId}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/api/v2/organization_fields/{organizationFieldId}',
                method: 'delete',
              },
            },
          },
        },
      },
      // TODON organization_field__custom_field_options didn't have deploy in the old config - check if intentional!
    },
  },
}

export const GUIDE_GLOBAL_DEPLOY_CONFIG: configUtils.DeployApiConfig = {
  instances: {
    default: {
      requestsByAction: {
        default: {
          // TODON move template and reference resolution here in a generic way? first see cases
          // additionalResolvers: [],
          request: {
            context: DEFAULT_CONTEXT,
          },
        },
      },
    },
    customizations: {
      ...createStandardItemDeployConfigs({
        permission_group: { bulkPath: '/api/v2/guide/permission_groups' },
        user_segment: { bulkPath: '/api/v2/help_center/user_segments' },
      }),
    },
  },
}


export const GUIDE_BRAND_SPECIFIC_DEPLOY_CONFIG: configUtils.DeployApiConfig = {
  instances: {
    default: {
      requestsByAction: {
        default: {
          // TODON move template and reference resolution here in a generic way? first see cases
          // additionalResolvers: [],
          request: {
            context: DEFAULT_CONTEXT,
          },
        },
      },
    },
    customizations: {

      // replacing filters - WIP (TODON continue, only config for most)
      ...createStandardItemDeployConfigs({
        category: {
          bulkPath: '/api/v2/help_center/categories',
          overrides: { default: { request: { omit: [TRANSLATIONS_FIELD, SECTIONS_FIELD, BRAND_FIELD] } } },
        },
      }),
      section: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'section',
              context: {
                category_id: 'category_id',
              },
              omit: [TRANSLATIONS_FIELD, 'attachments', 'brand'],
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/help_center/categories/{category_id}/sections',
                method: 'post',
                omit: [
                  // TODON parent_section_id is modified after addition, see guide_parent_to_section filter - move here?
                  TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, PARENT_SECTION_ID_FIELD, BRAND_FIELD,
                ],
              },
            },
            modify: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}',
                method: 'put',
                omit: [TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, BRAND_FIELD],
              },
            },
            remove: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}',
                method: 'delete',
              },
            },
          },
        },
      },
      article: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'article',
              context: {
                section_id: 'section_id',
              },
              omit: ['translations', 'attachments', 'brand'],
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}/articles',
                method: 'post',
              },
            },
            modify: {
              request: {
                path: '/api/v2/help_center/articles/{id}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/api/v2/help_center/articles/{id}',
                method: 'delete',
              },
            },
          },
        },
      },
      ...createStandardTranslationDeployConfigs({
        category_translation: { parentPlural: 'categories' },
        section_translation: { parentPlural: 'sections' },
        article_translation: {
          parentPlural: 'articles',
          // TODON define here or aggregate from other places?
          // TODON mark replaced filter if not marked
          additionalResolvers: [
            ({ value }: { value: Values }) => serializeTemplates({ value, fieldName: 'body', prepRef: articleBodyPrepRef }),
          ],
        },
      }),
      article_attachment: {
        requestsByAction: {
          customizations: {
            remove: {
              request: {
                path: '/api/v2/help_center/articles/attachments/{id}',
                method: 'delete',
              },
            },
          },
        },
      },

      guide_language_settings: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'translation',
              context: {
                locale: 'locale',
              },
              omit: ['brand'], // TODON theoretically can omit by default in this client if aggregating (or mark field as local-only...)
            },
          },
          customizations: {
            add: {
              request: {
                path: '/hc/api/internal/help_center_translations',
                method: 'post',
                nestUnderField: 'locales',
              },
            },
            modify: {
              request: {
                path: '/hc/api/internal/help_center_translations/{locale}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/hc/api/internal/help_center_translations/{locale}',
                method: 'delete',
              },
            },
          },
        },
      },
      guide_settings: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'translation',
              context: {
                locale: 'locale',
              },
              omit: [DEFAULT_LOCALE], // TODON not omitting brand, make sure intentional
            },
          },
          customizations: {
            modify: {
              request: {
                path: '/hc/api/internal/general_settings',
                method: 'put',
              },
            },
            // old TODO - check what happens when help center (guide) is created or removed (SALTO-2914)
          },
        },
      },
    },
  },
}
