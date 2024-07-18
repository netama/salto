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

const createCustomizations = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => (_.defaultsDeep(
  {},
  ...([
    { typeName: 'action', path: 'actions/actions', root: 'actions' },
    { typeName: 'apns_push_notification_configuration', path: 'guardian/factors/push-notification/providers/apns' },
    { typeName: 'client', path: 'clients' }, // TODON check if want to use include_totals instead
    { typeName: 'connection', path: 'connections' }, // TODON recurse into /scim-configuration, scim-configuration/default-mapping
    { typeName: 'custom_domain', path: 'custom-domains' },
    { typeName: 'default_branding_theme', path: 'branding/themes/default' }, // TODON singleton? get all instead?
    { typeName: 'email_provider', path: 'emails/provider' },
    { typeName: 'enrollment_notification_template', path: 'guardian/factors/phone/templates' }, // TODON check if can generalize template format? not sure
    { typeName: 'factor', path: 'guardian/factors' },
    { typeName: 'hook', path: 'hooks' }, // TODON be careful - there are also endpoints for secrets e.g. hooks/{id}/secrets (and also /keys/signing - though it seems to have the public part?)
    // { typeName: 'key_signing', path: 'keys/signing' },
    { typeName: 'log_stream', path: 'log-streams' },
    { typeName: 'phone_factor', path: 'guardian/factors/phone/message-types' },
    { typeName: 'phone_provider', path: 'branding/phone/providers', root: 'providers' },
    { typeName: 'phone_template', path: 'branding/phone/templates', root: 'templates' },
    { typeName: 'prompt', path: 'prompts' },
    { typeName: 'resource_server', path: 'resource-servers' },
    { typeName: 'role', path: 'roles' }, // TODON recurseInto roles/{id}/permissions
    { typeName: 'rule_config', path: 'rules-configs' },
    { typeName: 'rule', path: 'rules' },
    { typeName: 'sns_push_notification_configuration', path: 'guardian/factors/push-notification/providers/sns' },
    { typeName: 'trigger', path: 'actions/triggers', root: 'trigger' }, // TODON recurseInto actions/triggers/{triggerId}/bindings
    { typeName: 'twilio_configuration', path: 'guardian/factors/phone/providers/twilio' },
    // TODON check if also need guardian/factors/push-notification/selected-provider or if overlaps with one of the others
    // TODON continue
    { typeName: 'universal_login_template', path: 'branding/templates/universal-login', root: 'templates' }, // TODON schemas might be weird - may need to nest if only string
    { typeName: 'user_block', path: 'user-blocks' },

    // TODON exclude by default / assume data
    { typeName: 'blackisted_token', path: 'blacklists/tokens' },
    { typeName: 'organization', path: 'organizations' }, // TODON decide if default include or exclude, see if want to recurseInto organizations/{id}/enabled_connections

    // TODON singletons
    { typeName: 'breached_password_detection_settings', path: 'attack-protection/breached-password-detection' },
    { typeName: 'brute_force_protection_settings', path: 'attack-protection/brute-force-protection' },
    { typeName: 'suspicious_ip_throttling_settings', path: 'attack-protection/suspicious-ip-throttling' },
    { typeName: 'tenant_settings', path: 'tenants/settings' },
    { typeName: 'branding_settings', path: 'branding' },
  ].map(({ typeName, path, root }) => ({
    [typeName]: {
      requests: [
        {
          endpoint: {
            path: `/api/v2/${path}`,
          },
          ...(root !== undefined ? { transformation: { root } } : {}),
        },
      ],
      resource: {
        directFetch: true,
      },
      element: {
        topLevel: {
          isTopLevel: true,
        },
      },
    },
  }))),
  {
    email_template: {
      // TODON parallelize, use dependsOn or context instead
      // see https://auth0.com/docs/api/management/v2/email-templates/get-email-templates-by-template-name
      requests: ['verify_email', 'verify_email_by_code', 'reset_email', 'welcome_email', 'blocked_account', 'stolen_credentials', 'enrollment_email', 'mfa_oob_code', 'user_invitation', 'change_password', 'password_reset'].map(templateName => ({
        endpoint: {
          path: `/api/v2/email-templates/${templateName}`,
        },
      })),
      resource: {
        directFetch: true,
      },
      element: {
        topLevel: {
          isTopLevel: true,
        },
      },
    },
  },
))

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
