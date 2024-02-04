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
import { DEFAULT_QUERY_PARAMS } from '../../../config'
import { PaginationOptions } from '../../types'


// TODON should use brand-specific clients
// TODON add option to restrict "allowed" patterns - in the "base" config?
// TODON add strategy for when an endpoint is not defined ("strict" + some allowed patterns?)
export const GUIDE_BRAND_SPECIFIC_ENDPOINTS: definitions.EndpointByPathAndMethod<PaginationOptions> = {
  default: {
    get: {
      queryArgs: DEFAULT_QUERY_PARAMS,
      pagination: 'cursor',
      readonly: true,
      // additionalContext: BRAND_CONTEXT, // TODON make sure to expect and pass to the client
      // TODON add option to set default values for response extractors that will be used for everything
      // (except where overwritten)?
    },
    delete: {
      omitBody: true,
      // additionalContext: BRAND_CONTEXT,
    },
    // head: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // options: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // patch: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // post: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // put: {
    //   additionalContext: BRAND_CONTEXT,
    // },
  },
  customizations: {
    '/api/v2/help_center/categories': {
      get: {
        queryArgs: {
          include: 'translations',
        },
      },
    },
    '/api/v2/help_center/sections': {
      get: {
        queryArgs: {
          include: 'translations',
        },
      },
    },
    // we are using this endpoint for better parallelization of requests on large accounts
    // sort_by is added since articles for which the order is alphabetically fail (to avoid future bugs)
    '/api/v2/help_center/categories/{category_id}/articles': {
      get: {
        queryArgs: {
          include: 'translations',
          sort_by: 'updated_at',
        },
      },
    },
  },
}

// TODON also look at recent code changes
