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
import _ from 'lodash'
import { definitions } from '@salto-io/adapter-components'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { UserFetchConfig } from '../../config'
import { Options } from '../types'

// TODO example - adjust and remove:
// * irrelevant definitions and comments
// * unneeded function args

const NAME_ID_FIELD: definitions.fetch.FieldIDPart = { fieldName: 'name' }
const DEFAULT_ID_PARTS = [NAME_ID_FIELD]

// Note: hiding fields inside arrays is not supported, and can result in a corrupted workspace.
// when in doubt, it's best to hide fields only for relevant types, or to omit them.
const DEFAULT_FIELD_CUSTOMIZATIONS: Record<string, definitions.fetch.ElementFieldCustomization> = {
  // // hide
  // created_at: {
  //   hide: true,
  // },
  // updated_at: {
  //   hide: true,
  // },
  // created_by_id: {
  //   hide: true,
  // },
  // updated_by_id: {
  //   hide: true,
  // },
  // // omit
  // _links: {
  //   omit: true,
  // },
}

const createCustomizations = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => ({
  action: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/actions/actions',
        },
        transformation: {
          root: 'actions',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  client: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/clients',
          queryArgs: {
            fields: 'client_secret',
            include_fields: 'false',
          },
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        client_id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  connection: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/connections',
        },
        transformation: {
          adjust: async ({ value }) => {
            if (
              !lowerdashValues.isPlainRecord(value) ||
              !(lowerdashValues.isPlainRecord(value.options) || value.options === undefined)
            ) {
              throw new Error('unexpected format')
            }
            return {
              value: {
                ...value,
                options: {
                  ...value.options,
                  client_secret: _.get(value.options, 'client_secret') !== undefined ? '<REDACTED>' : undefined,
                },
              },
            }
          },
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  custom_domain: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/custom-domains',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['custom_domain_id'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [{ fieldName: 'domain' }],
        },
      },
      fieldCustomizations: {
        custom_domain_id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  default_branding_theme: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/branding/themes/default',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  email_provider: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/emails/provider',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  enrollment_notification_template: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors/phone/templates',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  factor: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  hook: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/hooks',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  log_stream: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/log-streams',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  phone_factor: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors/phone/message-types',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  phone_provider: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/branding/phone/providers',
        },
        transformation: {
          root: 'providers',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  phone_template: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/branding/phone/templates',
        },
        transformation: {
          root: 'templates',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            {
              fieldName: 'channel',
            },
            {
              fieldName: 'type',
            },
          ],
        },
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  prompt: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/prompts',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  resource_server: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/resource-servers',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  role: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/roles',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  rule_config: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/rules-configs',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  rule: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/rules',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  sns_push_notification_configuration: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors/push-notification/providers/sns',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  trigger: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/actions/triggers',
        },
        transformation: {
          root: 'trigger',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  twilio_configuration: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors/phone/providers/twilio',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  universal_login_template: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/branding/templates/universal-login',
        },
        transformation: {
          root: 'templates',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  user_block: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/user-blocks',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  blackisted_token: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/blacklists/tokens',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  organization: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/organizations',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  user: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/users',
          queryArgs: {
            fields: ['last_ip', 'last_login', 'logins_count', 'multifactor_last_modified', 'identities'].join(','),
            include_fields: 'false',
          },
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['user_id'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        user_id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
  apns_push_notification_configuration: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/guardian/factors/push-notification/providers/apns',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  breached_password_detection_settings: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/attack-protection/breached-password-detection',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  brute_force_protection_settings: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/attack-protection/brute-force-protection',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  suspicious_ip_throttling_settings: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/attack-protection/suspicious-ip-throttling',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  tenant_settings: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/tenants/settings',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  branding_settings: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/branding',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        singleton: true,
      },
    },
  },
  email_template: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/email-templates/verify_email',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/verify_email_by_code',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/reset_email',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/welcome_email',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/blocked_account',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/stolen_credentials',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/enrollment_email',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/mfa_oob_code',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/user_invitation',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/change_password',
        },
      },
      {
        endpoint: {
          path: '/api/v2/email-templates/password_reset',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        id: {
          hide: true,
        },
        created_at: {
          hide: true,
        },
        updated_at: {
          hide: true,
        },
      },
    },
  },
})

// const createCustomizationsOld = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => (_.defaultsDeep(
//   {},
//   ...([
//     { typeName: 'action', path: 'actions/actions', root: 'actions' },
//     { typeName: 'client', path: 'clients' }, // TODON check if want to use include_totals instead
//     { typeName: 'connection', path: 'connections' }, // TODON recurse into /scim-configuration, scim-configuration/default-mapping
//     { typeName: 'custom_domain', path: 'custom-domains' },
//     { typeName: 'default_branding_theme', path: 'branding/themes/default' }, // TODON singleton? get all instead?
//     { typeName: 'email_provider', path: 'emails/provider' },
//     { typeName: 'enrollment_notification_template', path: 'guardian/factors/phone/templates' }, // TODON check if can generalize template format? not sure
//     { typeName: 'factor', path: 'guardian/factors' },
//     { typeName: 'hook', path: 'hooks' }, // TODON be careful - there are also endpoints for secrets e.g. hooks/{id}/secrets (and also /keys/signing - though it seems to have the public part?)
//     // { typeName: 'key_signing', path: 'keys/signing' },
//     { typeName: 'log_stream', path: 'log-streams' },
//     { typeName: 'phone_factor', path: 'guardian/factors/phone/message-types' },
//     { typeName: 'phone_provider', path: 'branding/phone/providers', root: 'providers' },
//     { typeName: 'phone_template', path: 'branding/phone/templates', root: 'templates' },
//     { typeName: 'prompt', path: 'prompts' },
//     { typeName: 'resource_server', path: 'resource-servers' },
//     { typeName: 'role', path: 'roles' }, // TODON recurseInto roles/{id}/permissions
//     { typeName: 'rule_config', path: 'rules-configs' },
//     { typeName: 'rule', path: 'rules' },
//     { typeName: 'sns_push_notification_configuration', path: 'guardian/factors/push-notification/providers/sns' },
//     { typeName: 'trigger', path: 'actions/triggers', root: 'trigger' }, // TODON recurseInto actions/triggers/{triggerId}/bindings
//     { typeName: 'twilio_configuration', path: 'guardian/factors/phone/providers/twilio' },
//     // TODON check if also need guardian/factors/push-notification/selected-provider or if overlaps with one of the others
//     // TODON continue
//     { typeName: 'universal_login_template', path: 'branding/templates/universal-login', root: 'templates' }, // TODON schemas might be weird - may need to nest if only string
//     { typeName: 'user_block', path: 'user-blocks' },

//     // TODON exclude by default / assume data
//     { typeName: 'blackisted_token', path: 'blacklists/tokens' },
//     { typeName: 'organization', path: 'organizations' }, // TODON decide if default include or exclude, see if want to recurseInto organizations/{id}/enabled_connections

//     // TODON singletons
//     { typeName: 'apns_push_notification_configuration', path: 'guardian/factors/push-notification/providers/apns', singleton: true },
//     { typeName: 'breached_password_detection_settings', path: 'attack-protection/breached-password-detection', singleton: true },
//     { typeName: 'brute_force_protection_settings', path: 'attack-protection/brute-force-protection', singleton: true },
//     { typeName: 'suspicious_ip_throttling_settings', path: 'attack-protection/suspicious-ip-throttling', singleton: true },
//     { typeName: 'tenant_settings', path: 'tenants/settings', singleton: true },
//     { typeName: 'branding_settings', path: 'branding', singleton: true },
//   ].map(({ typeName, path, root, singleton }) => ({
//     [typeName]: {
//       requests: [
//         {
//           endpoint: {
//             path: `/api/v2/${path}`,
//           },
//           ...(root !== undefined ? { transformation: { root } } : {}),
//         },
//       ],
//       resource: {
//         directFetch: true,
//       },
//       element: {
//         topLevel: {
//           isTopLevel: true,
//           singleton: singleton === true ? singleton : undefined,
//         },
//         fieldCustomizations: {
//           id: {
//             hide: true,
//           },
//           created_at: {
//             hide: true,
//           },
//           updated_at: {
//             hide: true,
//           },
//         },
//       },
//     },
//   }))),
//   {
//     client: {
//       resource: {
//         serviceIDFields: [],
//       },
//       element: {
//         fieldCustomizations: {
//           // TODO encrypt instead, remove from client logs as well
//           client_secret: {
//             omit: true,
//           },
//         },
//       },
//     },
//     client__signing_keys: {
//       element: {
//         fieldCustomizations: {
//           // TODO encrypt instead, remove from client logs as well
//           client_secret: {
//             omit: true,
//           },
//         },
//       },
//     },
//     phone_template: {
//       element: {
//         topLevel: {
//           elemID: { parts: [{ fieldName: 'channel' }, { fieldName: 'type' }] },
//         },
//       },
//     },
//     email_template: {
//       // TODON parallelize, use dependsOn or context instead
//       // see https://auth0.com/docs/api/management/v2/email-templates/get-email-templates-by-template-name
//       requests: ['verify_email', 'verify_email_by_code', 'reset_email', 'welcome_email', 'blocked_account', 'stolen_credentials', 'enrollment_email', 'mfa_oob_code', 'user_invitation', 'change_password', 'password_reset'].map(templateName => ({
//         endpoint: {
//           path: `/api/v2/email-templates/${templateName}`,
//         },
//       })),
//       resource: {
//         directFetch: true,
//       },
//       element: {
//         topLevel: {
//           isTopLevel: true,
//         },
//       },
//     },
//   },
// ))

export const createFetchDefinitions = (
  _fetchConfig: UserFetchConfig,
): definitions.fetch.FetchApiDefinitions<Options> => ({
  instances: {
    default: {
      resource: {
        // serviceIDFields: ['id'],
      },
      element: {
        topLevel: {
          elemID: { parts: DEFAULT_ID_PARTS },
        },
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
      },
    },
    customizations: createCustomizations(),
  },
})
