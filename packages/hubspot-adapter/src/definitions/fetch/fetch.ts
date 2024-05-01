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
// import * as transforms from './transforms'

// Note: hiding fields inside arrays is not supported, and can result in a corrupted workspace.
// when in doubt, it's best to hide fields only for relevant types, or to omit them.
const DEFAULT_FIELDS_TO_HIDE: Record<string, definitions.fetch.ElementFieldCustomization> = {
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
}
const DEFAULT_FIELDS_TO_OMIT: Record<string, definitions.fetch.ElementFieldCustomization> = {
  _links: {
    omit: true,
  },
}

const NAME_ID_FIELD: definitions.fetch.FieldIDPart = { fieldName: 'name' }
const DEFAULT_ID_PARTS = [NAME_ID_FIELD]

const DEFAULT_FIELD_CUSTOMIZATIONS: Record<string, definitions.fetch.ElementFieldCustomization> = _.merge(
  {},
  DEFAULT_FIELDS_TO_HIDE,
  DEFAULT_FIELDS_TO_OMIT,
)

const createCustomizations = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => ({
  owner: {
    requests: [
      {
        endpoint: {
          path: '/owners/v2/owners',
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
  template: {
    requests: [
      {
        endpoint: {
          path: '/content/api/v2/templates',
        },
        transformation: {
          root: 'objects',
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
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  workflow: {
    requests: [
      {
        endpoint: {
          path: '/automation/v3/workflows',
        },
        transformation: {
          root: 'workflows',
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
  marketing_email: {
    requests: [
      {
        endpoint: {
          path: '/marketing-emails/v1/emails',
          queryArgs: {
            limit: '50',
          },
        },
        transformation: {
          root: 'objects',
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
  // product: {
  //   requests: [
  //     {
  //       endpoint: {
  //         path: '/crm-objects/v1/objects/products/paged',
  //         queryArgs: {
  //           limit: '50',
  //         },
  //       },
  //       transformation: {
  //         root: 'objects',
  //       },
  //     },
  //   ],
  //   resource: {
  //     directFetch: true,
  //   },
  //   element: {
  //     topLevel: {
  //       isTopLevel: true,
  //     },
  //   },
  // },
  ticket_property: {
    requests: [
      {
        endpoint: {
          path: '/properties/v2/tickets/properties',
          queryArgs: {
            limit: '50',
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
    },
  },
  product_property: {
    requests: [
      {
        endpoint: {
          path: '/properties/v2/products/properties',
          queryArgs: {
            limit: '50',
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
    },
  },
  line_item_property: {
    requests: [
      {
        endpoint: {
          path: '/properties/v2/line_items/properties',
          queryArgs: {
            limit: '50',
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
    },
  },
})

export const createFetchDefinitions = (
  _fetchConfig: UserFetchConfig,
): definitions.fetch.FetchApiDefinitions<Options> => ({
  instances: {
    default: {
      resource: {
        serviceIDFields: ['id'],
      },
      element: {
        topLevel: {
          elemID: { parts: DEFAULT_ID_PARTS },
          // serviceUrl: {
          //   // TODO put default base url for serviceUrl filter (can override for specific types in customizations)
          //   baseUrl: 'https://api.example.com',
          // },
        },
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
      },
    },
    customizations: createCustomizations(),
  },
})
