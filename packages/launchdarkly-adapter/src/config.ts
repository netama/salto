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
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = []

export const SUPPORTED_TYPES = {
  Token: ['Tokens'],
  Member: ['Members'],
  // TODON continue based on swagger or on https://static.launchdarkly.com/app/s/openapi.b217dbacb.json
}

export const DEFAULT_CONFIG: Config = {
  client: {}, // TODON avoid these as well?
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
  },
  apiComponents: {
    swagger: {
      main: {
        swagger: {
          url: 'https://app.launchdarkly.com/api/v2/openapi.json',
        },
        typeDefaults: {
          request: {
            paginationField: '_links.next.href',
          },
          transformation: {
            idFields: DEFAULT_ID_FIELDS,
            fieldsToOmit: FIELDS_TO_OMIT,
            nestStandaloneInstances: true,
          },
        },
        types: {
          Members: {
            transformation: {
              dataField: 'items',
            },
          },
          Member: {
            transformation: {
              idFields: ['email'],
            },
          },
          Tokens: {
            transformation: {
              dataField: 'items',
            },
          },
          Token: {
            transformation: {
              idFields: ['name'],
            },
          },
        },
        supportedTypes: SUPPORTED_TYPES,
      },
    },
  },
}
