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

// TODO adjust this file

// initially set to some field that exists, e.g. id or name - then adjust
const DEFAULT_ID_FIELDS = ['name']
// fields that are returned but should not be included in the instance
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: '_links' },
]
// fields that should be hidden
// IMPORTANT: hiding fields inside arrays can corrupt the workspace - best to adjust after the initial setup
export const FIELDS_TO_HIDE: configUtils.FieldToHideType[] = [
  // { fieldName: 'id' },
  // { fieldName: 'created_at' },
]

export const SUPPORTED_TYPES = {
  // examples - replace
  // <item type>: [<page types>],
  Item: ['Items'],
  // note: the left-hand side is used for filtering the config in include/exclude - so initially can start with
  // ALL: [<all page types that we want to fetch>]
}

export const DEFAULT_CONFIG: Config = {
  client: {},
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
  },
  apiComponents: {
    sources: {
      swagger: [
        {
          // replace or remove
          url: 'http://localhost:80',
        },
      ],
    },
    definitions: {
      typeDefaults: {
        request: {
          // if using cursor-based pagination, set to where the "next" link is located
          paginationField: '_links.next.href',
        },
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
          fieldsToHide: FIELDS_TO_HIDE,
          nestStandaloneInstances: true,
          // default place to search for items when getting a page response (can adjust per type)
          dataField: 'items',
        },
      },
      types: {
        Items: {
          // not needed if exists in swagger
          request: {
            url: '/api/v1/items',
          },
        },
        Item: {
          transformation: {
            // not needed if same as typeDefaults.idFields
            idFields: ['category'],
            // if want to append values on top of what is in typeDefaults - don't forget to concat the original
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
