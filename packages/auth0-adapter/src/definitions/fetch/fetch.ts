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
  // hide
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

  // omit
  _links: {
    omit: true,
  },
}

const createCustomizations = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => ({
  ..._.assign({}, ...([
  { typeName: 'client', path: 'clients' },
    { typeName: 'connection', path: 'connections' },
    { typeName: 'custom_domain', path: 'custom-domains' },
  ].map(({ typeName, path }) => ({
    [typeName]: {
      requests: [
        {
          endpoint: {
            path: `/api/v2/${path}`,
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
      },
    },
  })))),
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
})

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
