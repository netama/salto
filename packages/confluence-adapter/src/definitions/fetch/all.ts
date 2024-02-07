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
import { InstanceFetchApiDefinitions } from '../types'

// TODO adjust
export const FETCH_DEFINITIONS: Record<string, InstanceFetchApiDefinitions> = {
  // top-level, independent
  content_old: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/api/content',
        },
        transformation: {
          root: 'results',
        },
      },
    ],
    resource: {
      // this type can be included/excluded based on the user's fetch query
      directFetch: true,
    },
    element: {
      topLevel: {
        // isTopLevel should be set when the workspace can have instances of this type
        isTopLevel: true,
        // serviceUrl: {
        //   path: '/some/path/to/group/with/potential/placeholder/{id}',
        // },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  content_cql: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/api/content/search',
          queryArgs: {
            cql: 'type=page',
          },
        },
        transformation: {
          root: 'results', // TODON make default?
        },
      },
    ],
    resource: {
      // this type can be included/excluded based on the user's fetch query
      directFetch: true,
    },
    element: {
      topLevel: {
        // isTopLevel should be set when the workspace can have instances of this type
        isTopLevel: true,
        // serviceUrl: {
        //   path: '/some/path/to/group/with/potential/placeholder/{id}',
        // },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },

  // top-level, dependent

  // inner types
}
