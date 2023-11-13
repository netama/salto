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
import { config as configUtils, elements } from '@salto-io/adapter-components'
import { Config } from '@salto-io/adapter-creator'

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: '_links' },
]

export const SUPPORTED_TYPES = {
  Token: ['Tokens'],
  Member: ['Members'],
  Project: ['Projects'],
  RepositoryRep: ['RepositoryCollectionRep'],
  // TODON continue based on swagger or on https://static.launchdarkly.com/app/s/openapi.b217dbacb.json
}

export const DEFAULT_CONFIG: Config = {
  client: {}, // TODON avoid these as well?
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
  },
  apiComponents: {
    sources: {
      swagger: [ // TODON any point naming sources?
        {
          url: 'https://app.launchdarkly.com/api/v2/openapi.json',
        },
      ],
    },
    definitions: {
      typeDefaults: {
        request: {
          paginationField: '_links.next.href',
        },
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
          nestStandaloneInstances: true,
          dataField: 'items',
        },
      },
      types: {
        // Members: {
        //   transformation: {
        //   },
        // },
        Member: {
          transformation: {
            idFields: ['email'],
          },
        },
        // Tokens: {
        //   transformation: {
        //     dataField: 'items',
        //   },
        // },
        Token: {
          transformation: {
            idFields: ['name'],
          },
        },
        Projects: {
          request: {
            url: '/api/v2/projects',
            queryParams: {
              expand: 'environments',
            },
            // recurseInto: [
            //   { toField: '' }
            // ],
          },
          // transformation: {
          //   dataField: 'items',
          // },
        },
        Environments: {
          transformation: {
            fieldsToOmit: FIELDS_TO_OMIT.concat([
              { fieldName: 'totalCount' },
            ]),
          },
        },
      },
      supportedTypes: SUPPORTED_TYPES,
    },
  },
}
