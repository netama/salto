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
import { PAGE_SIZE } from '../../../config'
import { PaginationOptions } from '../../types'

// TODON Guide "global" endpoints - can consolidate with "support" ones?
export const GUIDE_GLOBAL_ENDPOINTS: definitions.EndpointByPathAndMethod<PaginationOptions>['customizations'] = {
  // TODON no default pagination - warn when not specified (and add a "none" generic option to mark as "intentional"?)
  '/api/v2/guide/permission_groups': {
    get: {
      pagination: 'oldCursor',
      queryArgs: { per_page: String(PAGE_SIZE) },
      responseExtractors: [
        {
          transformValue: {
            root: 'permission_groups',
          },
          toType: 'permission_group',
        },
      ],
    },
  },
  '/api/v2/help_center/user_segments': {
    get: {
      pagination: 'cursor',
      responseExtractors: [
        {
          transformValue: {
            root: 'user_segments',
          },
          toType: 'user_segment',
        },
      ],
    },
  },
}
