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
  group: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/api/group',
        },
        transformation: {
          root: 'results',
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
  label: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/api/label',
        },
        transformation: {
          root: 'results',
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
  system_info: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/settings/systemInfo',
        },
        transformation: {
          root: 'results',
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
  space: {
    requests: [
      {
        endpoint: {
          path: '/wiki/api/v2/spaces',
        },
        transformation: {
          root: 'results',
        },
      },
    ],
    resource: {
      directFetch: true,
      recurseInto: {
        permissions: {
          typeName: 'space_permission',
          context: {
            args: {
              id: {
                fromField: 'id',
              },
            },
          },
        },
      },
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        permissions: {
          standalone: {
            typeName: 'space_permission',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
        properties: {
          standalone: {
            typeName: 'space_property',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
      },
    },
  },
  space_permission: {
    requests: [
      {
        endpoint: {
          path: '/wiki/api/v2/spaces/{id}/permissions',
        },
        transformation: {
          root: 'results',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  space_property: {
    requests: [
      {
        endpoint: {
          path: '/wiki/api/v2/spaces/{id}/properties',
        },
        transformation: {
          root: 'results',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
  template_page: {
    requests: [
      {
        endpoint: {
          path: '/wiki/rest/api/template/page',
        },
        transformation: {
          root: 'results',
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
  page: {
    requests: [
      {
        endpoint: {
          path: '/wiki/api/v2/pages',
        },
        transformation: {
          root: 'results',
        },
      },
    ],
    resource: {
      directFetch: true,
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/wiki/spaces/{spaceId.key}/pages/{id}',
        },
        elemID: {
          parts: [{ fieldName: 'title' }, { fieldName: 'parentId', isReference: true }],
        },
        path: {
          pathParts: [
            {
              parts: [{ fieldName: 'title' }],
            },
          ],
        },
      },
    },
  },
}
