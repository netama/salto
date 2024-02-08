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
import { definitions } from '@salto-io/adapter-components'
import { PaginationOptions } from '../../types'

// TODON add option to "normalize" endpoints to use generic params (e.g. id, parent_id)
// without losing the original - either when loading the swagger add a mapping, or add a "matched_endpoints" arg here?
// hiding this when lodaing is probably better, similarly to cloned types?

export const SUPPORT_ENDPOINTS: definitions.EndpointByPathAndMethod<PaginationOptions>['customizations'] = {
  '/api/v2/groups': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/custom_objects': {
    get: {
      queryArgs: { per_page: String(100) },
    },
  },
  '/api/v2/custom_objects/{custom_object_key}/fields': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/organizations': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/views': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/triggers': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/trigger_categories': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/automations': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/macros': {
    get: {
      pagination: 'cursor',
      queryArgs: {
        access: 'shared',
      },
    },
  },
  '/api/v2/macros/categories': {
    get: {
      // TODON mark as no-pagination / single-page?
    },
  },
  '/api/v2/brands': {
    get: {
      pagination: 'cursor',
    },
  },

  '/api/v2/recipient_addresses': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/ticket_forms': {
    // not always available // TODON remove comment?
  },
  '/api/v2/ticket_fields': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/user_fields': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/organization_fields': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/workspaces': {
    // not always available
  },
  '/api/v2/apps/installations': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/apps/owned': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/oauth/clients': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/oauth/global_clients': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/webhooks': {
    get: {
      pagination: 'cursor',
    },
  },
  '/api/v2/oauth/tokens': {
    get: {
      pagination: 'cursor',
    },
  },
}

// TODON add "content" queries (attachment content) either here or on a new client -
// but should be doable as part of the "main" fetch

// TODON also look at recent code changes
