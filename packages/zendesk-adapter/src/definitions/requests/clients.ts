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
import { GUIDE_BRAND_SPECIFIC_ENDPOINTS, GUIDE_GLOBAL_ENDPOINTS, SUPPORT_ENDPOINTS } from './endpoints'
import { ClientOptions, ClientsDefinition, RESTApiClientDefinition } from '../types'

export const createClientDefinitions = (clients: Record<ClientOptions, RESTApiClientDefinition['httpClient']>): ClientsDefinition => ({
  // TODON decide if want a default here, or in definitions?
  // TODON if no default (probably?) - cleanup types + ensure no overlaps (no need?) + error out when missing?
  default: 'global',
  options: {
    global: {
      httpClient: clients.global,
      clientArgs: {},
      endpoints: {
        default: {
          get: {
            pagination: 'oldCursor',
            checkSuccess: {
              httpSuccessCodes: [200],
            },
          },
          delete: {
            omitBody: true,
          },
        },
        customizations: {
          ...SUPPORT_ENDPOINTS,
          ...GUIDE_GLOBAL_ENDPOINTS,
        },
      },
      strict: true, // TODON pass based on operation (strict in fetch, not strict in deploy) instead
    },
    by_brand: {
      httpClient: clients.by_brand,
      clientArgs: {
        subdomain: '{brand.subdomain}',
        brandId: '{brand.id}',
      },
      endpoints: GUIDE_BRAND_SPECIFIC_ENDPOINTS,
      strict: true, // TODON pass based on operation (strict in fetch, not strict in deploy) instead
    },
  },
})
