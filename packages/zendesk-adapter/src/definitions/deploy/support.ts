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
import _ from 'lodash'
import { getChangeData } from '@salto-io/adapter-api'
import { definitions, deployment as deploymentUtils } from '@salto-io/adapter-components'
import { CATEGORIES_FIELD, DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME, LOGO_FIELD, TICKET_FIELD_TYPE_NAME, TICKET_STATUS_CUSTOM_STATUS_TYPE_NAME } from '../../constants'
import { createStandardItemDeployConfigs, createStandardModifyOnlyDeployConfigs } from './utils'
import { shouldDeployIntervals } from './conditions'
import * as transforms from './transforms'
import { replaceByValue } from './transforms'
import { InstanceDeployApiDefinitions } from '../types'

const { groupWithFirstParent } = deploymentUtils.grouping

export const SUPPORT_DEPLOY_DEF: Record<string, InstanceDeployApiDefinitions> = {
  // "simple" (single-change)

  // TODON check if merging correctly (added at a late hour...)
  ..._.merge(
    createStandardItemDeployConfigs({
      app_installation: {
        bulkPath: '/api/v2/apps/installations',
        overrides: {
          default: {
            request: {
              transformValue: {
                omit: ['app', 'settings.title', 'settings_objects'],
                // nestUnderField: '.', // TODON make sure handled correctly
              },
            },
          },
        },
      },
      automation: { bulkPath: '/api/v2/automations' },
      brand: {
        bulkPath: '/api/v2/brands',
        overrides: {
          default: {
            request: {
              transformValue: {
                omit: [LOGO_FIELD, CATEGORIES_FIELD],
              },
            },
          },
        },
      },
      business_hours_schedule: {
        bulkPath: '/api/v2/business_hours/schedules',
        overrides: {
          default: {
            request: {
              transformValue: {
                nestUnderField: 'schedule',
                omit: ['holidays'],
              },
            },
          },
        },
        appendRequests: {
          add: [{
            condition: ({ change }) => shouldDeployIntervals(change),
            request: {
              path: '/api/v2/business_hours/schedules/{id}/workweek',
              method: 'put',
              transformValue: {
                root: 'intervals',
                nestUnderField: 'workweek',
              },
            },
          }],
          modify: [{
            condition: ({ change }) => shouldDeployIntervals(change),
            request: {
              path: '/api/v2/business_hours/schedules/{id}/workweek',
              method: 'put',
              transformValue: {
                root: 'intervals',
                nestUnderField: 'workweek',
              },
            },
          }],
        },
      },
      custom_object: {
        bulkPath: '/api/v2/custom_objects',
        overrides: { default: { request: {
          context: { key: 'key' },
          transformValue: {
            omit: ['custom_object_fields'],
          },
        } } },
      },
      custom_role: { bulkPath: '/api/v2/custom_roles' },
      custom_status: {
        bulkPath: '/api/v2/custom_statuses',
        withoutActions: ['remove'],
      },
      dynamic_content_item: { bulkPath: '/api/v2/dynamic_content/items' }, // TODON check about variants
      group: { bulkPath: '/api/v2/groups' },
      macro: {
        bulkPath: '/api/v2/macros',
        overrides: {
          default: {
            request: {
              transformValue: {
                // TODON combine with okta schema_field_removal (and zendesk add_field_options)?
                adjust: transforms.undefinedToNull('restriction'),
              },
            },
          },
        },
      },
      oauth_client: { bulkPath: '/api/v2/oauth/clients' },
      organization: { bulkPath: '/api/v2/organizations' },
      routing_attribute: {
        bulkPath: '/api/v2/routing/attributes',
        overrides: { default: { request: {
          transformValue: {
            omit: ['values'],
            nestUnderField: 'attribute',
          },
        } } },
      },
      sharing_agreement: { bulkPath: '/api/v2/sharing_agreements' },
      sla_policy: {
        bulkPath: '/api/v2/slas/policies',
        overrides: {
          default: {
            request: {
              transformValue: {
                adjust: replaceByValue({
                  path: 'filter',
                  oldValues: [undefined],
                  newValue: { all: [], any: [] },
                }),
              },
            },
          },
        },
      },
      support_address: {
        bulkPath: '/api/v2/recipient_addresses',
        overrides: {
          default: {
            request: {
              transformValue: {
                nestUnderField: 'recipient_address',
              },
            },
          },
        },
      },
      target: {
        bulkPath: '/api/v2/targets',
        // TODON check: we don't get the password, maybe just not have the field instead?
        overrides: { default: { request: {
          transformValue: {
            omit: ['username', 'password'],
          },
        } } },
      },
      ticket_form: { bulkPath: '/api/v2/ticket_forms' },
      trigger: { bulkPath: '/api/v2/triggers' },
      trigger_category: {
        bulkPath: '/api/v2/trigger_categories',
        overrides: {
          customizations: {
            modify: [{ request: { method: 'patch' } }],
          },
        },
      },
      view: {
        bulkPath: '/api/v2/views',
        overrides: { default: { request: {
          transformValue: {
            adjust: transforms.view,
          },
        } } },
      },
      webhook: {
        bulkPath: '/api/v2/webhooks',
        overrides: {
          // Ignore external_source because it is impossible to deploy,
          // the user was warned in externalSourceWebhook.ts
          default: { request: {
            transformValue: {
              omit: ['external_source'],
            },
          } },
          customizations: {
            modify: [{
              request: {
                method: 'patch',
                transformValue: {
                  adjust: transforms.webhook,
                },
              },
            }],
          },
        },
      },
      workspace: {
        bulkPath: '/api/v2/workspaces',
        overrides: { default: { request: {
          transformValue: {
            adjust: transforms.workspace,
          },
        } } },
      },

      // parent-child
      business_hours_schedule_holiday: {
        bulkPath: '/api/v2/business_hours/schedules/{parent_id}/holidays',
        overrides: { default: {
          request: {
            transformValue: {
              nestUnderField: 'variant',
            },
          },
        } },
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
        overrides: { default: { request: {
          transformValue: {
            nestUnderField: 'variant',
          },
        } } },
      },
      routing_attribute_value: {
        bulkPath: '/api/v2/routing/attributes/{parent_id}/values',
        overrides: { default: { request: {
          transformValue: {
            nestUnderField: 'attribute_value',
          },
        } } },
      },
      // TODON decide if to add ticket_field, organization_field, user_field here with customizations or leave as-is
    }),
    {
      dynamic_content_item__variants: {
        changeGroupId: groupWithFirstParent,
      },
    },
  ),

  ...createStandardModifyOnlyDeployConfigs({
    account_setting: {
      path: '/api/v2/account/settings',
      nestUnderField: 'settings',
      overrides: {
        customizations: {
          modify: [{
            request: {
              transformValue: {
                adjust: transforms.omitByValue('routing.autorouting_tag', ''),
              },
            },
          }],
        },
      },
    },
    automation_order: {
      path: '/api/v2/automations/update_many',
      transformForOrderFieldName: 'automations',
      addPositions: true,
    },
    organization_field_order: {
      path: '/api/v2/organization_fields/reorder',
      transformForOrderFieldName: 'organization_field_ids',
    },
    sla_policy_order: {
      path: '/api/v2/slas/policies/reorder',
      transformForOrderFieldName: 'sla_policy_ids',
    },
    ticket_form_order: {
      path: '/api/v2/ticket_forms/reorder',
      transformForOrderFieldName: 'ticket_form_ids',
    },
    user_field_order: {
      path: '/api/v2/user_fields/reorder',
      transformForOrderFieldName: 'user_field_ids',
    },
    view_order: {
      path: '/api/v2/views/update_many',
      transformForOrderFieldName: 'views',
      addPositions: true,
    },
    workspace_order: {
      path: '/api/v2/workspaces/reorder',
      transformForOrderFieldName: 'ids',
    },
    trigger_order: {
      path: '/api/v2/trigger_categories/jobs',
      method: 'post',
      nestUnderField: 'job',
      // TODON implement transformTriggerOrder based on reorder/trigger.ts:deployFunc (has another nesting level)
      overrides: {
        customizations: {
          modify: [{
            request: {
              // transform: transformTriggerOrder,
            },
          }],
        },
      },
    },
  }),

  // replacing filters (WIP)
  ticket_field: { // TODON continue!!!
    requestsByAction: {
      default: {
        request: {
          transformValue: {
            omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
            nestUnderField: 'ticket_field',
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
        modify: [{
          request: {
            path: '/api/v2/ticket_fields/{id}',
            method: 'put',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/ticket_fields/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  ticket_field__custom_field_options: {
    changeGroupId: groupWithFirstParent,
    requestsByAction: {
      default: { // TODON when specified, should be assigned to _all_ requests?
        // only make request if parent was not changed (otherwise this is changed through the parent)
        condition: ({ changeGroup }: definitions.InstanceChangeAndGroup) => changeGroup.changes.find(
          change => getChangeData(change).elemID.typeName === TICKET_FIELD_TYPE_NAME
        ) === undefined,
        request: {
          transformValue: {
            nestUnderField: 'custom_field_option',
            adjust: transforms.setDefaultFlag,
          },
        },
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/ticket_fields/{parent_id}/options',
            method: 'post',
            transformValue: {
              adjust: transforms.setDefaultFlag,
            },
          },
        }],
        modify: [{
          request: { // TODON same as add, make sure intentional
            path: '/api/v2/ticket_fields/{parent_id}/options',
            method: 'post',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/ticket_fields/{parent_id}/options/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  // TODON didn't look at filters yet for the rest - config only!!!
  user_field: { // TODON continue!!!
    requestsByAction: {
      default: {
        request: {
          transformValue: {
            omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
            nestUnderField: 'user_field',
          },
          // TODON resolve field options + run setDefaultFlag on each of them pre-deploy
          // transform: item => item,
        },
        // TODON assign ids to children as well - consider running in filter!
        // fromResponse: () => (),
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/user_fields',
            method: 'post',
          },
        }],
        modify: [{
          request: {
            path: '/api/v2/user_fields/{id}',
            method: 'put',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/user_fields/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  user_field__custom_field_options: {
    changeGroupId: groupWithFirstParent,
    requestsByAction: {
      default: {
        // only make request if parent was not changed (otherwise this is changed through the parent)
        // TODON generalize - hasChangeInGroup
        condition: ({ changeGroup }: definitions.InstanceChangeAndGroup) => changeGroup.changes.find(
          change => getChangeData(change).elemID.typeName === TICKET_FIELD_TYPE_NAME
        ) === undefined,
        request: {
          transformValue: {
            nestUnderField: 'custom_field_option',
            adjust: transforms.setDefaultFlag,
          },
        },
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/user_fields/{parent_id}/options',
            method: 'post',
            transformValue: {
              adjust: transforms.setDefaultFlag,
            },
          },
        }],
        modify: [{
          request: { // TODON same as add, make sure intentional
            path: '/api/v2/user_fields/{parent_id}/options',
            method: 'post',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/user_fields/{parent_id}/options/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  organization_field: { // TODON continue!!!
    requestsByAction: {
      default: {
        request: {
          transformValue: {
            omit: [DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME],
            nestUnderField: 'organization_field',
          },
          // TODON resolve field options + run setDefaultFlag on each of them pre-deploy
          // transform: item => item,
        },
        // TODON assign ids to children as well - consider running in filter!
        // fromResponse: () => (),
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/organization_fields',
            method: 'post',
          },
        }],
        modify: [{
          request: {
            path: '/api/v2/organization_fields/{id}',
            method: 'put',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/organization_fields/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  organization_field__custom_field_options: {
    changeGroupId: groupWithFirstParent,
    // TODON organization_field__custom_field_options didn't have deploy in the old config - check if intentional!
  },
  custom_object_field__custom_field_options: {
    changeGroupId: groupWithFirstParent,
    // TODON didn't have deploy in the old config - check if intentional (probably in a filter with entire feature)
  },
  macro_attachment: {
    changeGroupId: groupWithFirstParent,
  },
}
