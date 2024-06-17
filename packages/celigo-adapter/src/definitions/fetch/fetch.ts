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
import { Values } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { UserFetchConfig } from '../../config'
import { Options } from '../types'

// TODO example - adjust and remove:
// * irrelevant definitions and comments
// * unneeded function args

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
  connection: {
    requests: [
      {
        endpoint: {
          path: '/connections',
        },
      },
    ],
    resource: {
      // this type can be included/excluded based on the user's fetch query
      directFetch: true,
      recurseInto: {
        dependencies: {
          typeName: 'connection_dependency',
          context: {
            args: {
              _id: {
                root: '_id',
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
    },
  },
  connection_dependency: {
    requests: [
      {
        endpoint: {
          path: '/connection/{_id}/dependencies',
        },
      },
    ],
  },

  flow: {
    requests: [
      {
        endpoint: {
          path: '/flows',
        },
      },
    ],
    resource: {
      // this type can be included/excluded based on the user's fetch query
      directFetch: true,
      recurseInto: {
        dependencies: {
          typeName: 'flow_dependency',
          context: {
            args: {
              _id: {
                root: '_id',
              },
            },
          },
        },
        template: {
          typeName: 'flow_template',
          context: {
            args: {
              _id: {
                root: '_id',
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
    },
  },
  flow_dependency: {
    requests: [
      {
        endpoint: {
          path: '/flows/{_id}/dependencies',
        },
      },
    ],
  },
  flow_template: {
    requests: [
      {
        endpoint: {
          path: '/flows/{_id}/template',
        },
        transformation: {
          adjust: ({ value }) => {
            console.log('value') // eslint-disable-line
            return { value: value as Values }
            // TODON
          },
        },
      },
    ],
  },
})

export const createFetchDefinitions = (
  _fetchConfig: UserFetchConfig,
): definitions.fetch.FetchApiDefinitions<Options> => ({
  instances: {
    default: {
      resource: {
        serviceIDFields: ['_id'],
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
