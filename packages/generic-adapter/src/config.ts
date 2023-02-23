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
import _ from 'lodash'
import { ElemID, CORE_ANNOTATIONS, ObjectType, BuiltinTypes, MapType } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils, elements } from '@salto-io/adapter-components'
import * as adapterCreator from '@salto-io/adapter-creator'

// TODON add oauth support separately + allow additional params
export type AuthConfig = {
  type: 'custom' | 'basic' // TODON add oauth
  // TODON formalize basic language and placeholders
  headers?: Record<string, string>
  baseURL: string
}

export type Config = adapterCreator.Config & {
  client: clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig> & { auth: AuthConfig }
}

export const createAuthConfigType = ({ adapter }: { adapter: string }): ObjectType => { // TODON use
  const authConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'authConfig'),
    fields: {
      type: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      // TODON formalize basic language and placeholders
      headers: { refType: new MapType(BuiltinTypes.STRING) },
      baseURL: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
  return authConfigType
}

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  // { fieldName: 'createdBy', fieldType: 'string' },
]

export const DEFAULT_CONFIG: Config = {
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
    hideTypes: false,
  },
  apiComponents: {
    sources: {},
    definitions: {
      supportedTypes: {},
      typeDefaults: {
        transformation: {
          idFields: ['id'],
        },
      },
      types: {},
    },
  },
  client: { // TODON switch to multiple clients
    auth: {
      type: 'custom',
      baseURL: 'http://localhost:80',
    },
  },
  references: {
    rules: [],
  },
}

export const SAMPLE_CONFIG: Config = _.defaults({}, {
  apiComponents: {
    sources: {
      swagger: [
        {
          sample: { // TODON use names as prefixes to avoid conflicts
            swagger: {
              url: '/tmp/path-to-swagger.json', // TODON
            },
          },
        },
      ],
    },
    definitions: {
      typeDefaults: {
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
        },
      },
      types: {},
      supportedTypes: {
        TypeWithInstances: ['PageType'],
      },
    },
  },
  // TODON multiple clients with names and potentially different auth flows?
  client: {
    // TODON make this (partially) importable from https://swagger.io/specification/?sbsearch=security-schemes#security-scheme-object
    // specifically:
    // * apiKey + name + in (including cookie to help with one-off fetches?)
    // * http + basic, http + bearer, ?? maybe http + oauth?
    // oauth2 + (eventually) all flows and their params
    // ?? also have a custom / in-code option (or extend the mapping in-code and make usable in config?)
    // or just extend the apiKey to allow multiple headers?
    // *** but the currently-implemented placeholders format is also useful for the current approach - so extend it?
    auth: { // TODON can also have "ready" adapters by config type if needed...
      type: 'custom',
      headers: {
        Authorization: 'Bearer {token}',
      },
      baseURL: 'http://localhost',
    },
  },
  references: {
    rules: [],
  },
}, DEFAULT_CONFIG)
