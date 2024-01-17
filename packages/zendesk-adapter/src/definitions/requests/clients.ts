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
import { PaginationOptions } from './pagination'
import { GUIDE_BRAND_SPECIFIC_ENDPOINTS, GUIDE_GLOBAL_ENDPOINTS, SUPPORT_ENDPOINTS } from './endpoints'
import ZendeskClient from '../../client/client'

// TODON improve typing
export type ClientOptions = 'global' | 'by_brand'

export const CLIENTS: definitions.ApiDefinitions<ClientOptions, PaginationOptions>['clients'] = {
  // TODON decide if want a default here, or in definitions?
  // TODON if no default (probably?) - cleanup types + ensure no overlaps (no need?) + error out when missing?
  default: 'global',
  options: {
    global: {
      httpClient: ZendeskClient, // TODON generalize to match adapter-creator
      endpoints: {
        ...SUPPORT_ENDPOINTS,
        ...GUIDE_GLOBAL_ENDPOINTS,
      },
    },
    by_brand: {
      httpClient: ZendeskBrandSpecificClient, // TODON
      endpoints: GUIDE_BRAND_SPECIFIC_ENDPOINTS,
    },
  },
}
