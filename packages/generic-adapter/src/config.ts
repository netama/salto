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
import { ElemID, CORE_ANNOTATIONS, ObjectType, BuiltinTypes, ListType, MapType } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { client as clientUtils, config as configUtils, elements, references as referenceUtils } from '@salto-io/adapter-components'
import { ADAPTER_NAME } from './constants'

const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType,
  createSwaggerAdapterApiConfigType,
} = configUtils

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const API_DEFINITIONS_CONFIG = 'apiDefinitions'
export const AUTH_CONFIG = 'auth'
export const REFERENCES_CONFIG = 'references'

// TODON add oauth support separately + allow additional params
export type AuthConfig = {
  type: 'custom' | 'basic' // TODON add oauth
  // TODON formalize basic language and placeholders
  headers?: Record<string, string>
  baseURL: string
}

export type ClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig> & { auth: AuthConfig }

export type FetchConfig = configUtils.UserFetchConfig

export type ApiConfig = configUtils.AdapterSwaggerApiConfig

export type ReferencesConfig = {
  // TODON switch never once shared context exists (maybe already?)
  rules: referenceUtils.FieldReferenceDefinition<never>[]
}

export type Config = {
  [CLIENT_CONFIG]: ClientConfig
  [FETCH_CONFIG]: FetchConfig
  [API_DEFINITIONS_CONFIG]: ApiConfig
  [REFERENCES_CONFIG]: ReferencesConfig
}

export const createAuthConfigType = ({ adapter }: { adapter: string }): ObjectType => {
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

export const createReferencesConfigType = ({ adapter }: { adapter: string }): ObjectType => {
  const sourceDefConfigType = createMatchingObjectType<referenceUtils.FieldReferenceSourceDefinition>({
    elemID: new ElemID(adapter, 'referenceSourceConfig'),
    fields: {
      field: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      parentTypes: {
        refType: new ListType(BuiltinTypes.STRING),
      },
      instanceTypes: {
        refType: new ListType(BuiltinTypes.STRING),
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referenceTargetConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'referenceTargetConfig'),
    fields: {
      // TODON better enforcement
      name: { refType: BuiltinTypes.STRING },
      type: { refType: BuiltinTypes.STRING },
      typeContext: { refType: BuiltinTypes.STRING },
      parent: { refType: BuiltinTypes.STRING },
      parentContext: { refType: BuiltinTypes.STRING },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referenceRuleConfigType = createMatchingObjectType<referenceUtils.FieldReferenceDefinition<never>>({
    elemID: new ElemID(adapter, 'referenceRuleConfig'),
    fields: {
      src: {
        refType: sourceDefConfigType,
        annotations: { _required: true },
      },
      serializationStrategy: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
      sourceTransformation: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
      // If target is missing, the definition is used for resolving
      target: {
        refType: referenceTargetConfigType,
      },
      missingRefStrategy: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referencesConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'referencesConfig'),
    fields: {
      rules: { refType: new ListType(referenceRuleConfigType) },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
  return referencesConfigType
}


const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  // { fieldName: 'createdBy', fieldType: 'string' },
]

const DEFAULT_TYPE_CUSTOMIZATIONS: ApiConfig['types'] = {}

const DEFAULT_SWAGGER_CONFIG: ApiConfig['swagger'] = {
  url: '/tmp/path-to-swagger.json', // TODON
}

export const DEFAULT_API_DEFINITIONS: ApiConfig = {
  swagger: DEFAULT_SWAGGER_CONFIG,
  typeDefaults: {
    transformation: {
      idFields: DEFAULT_ID_FIELDS,
      fieldsToOmit: FIELDS_TO_OMIT,
    },
  },
  types: DEFAULT_TYPE_CUSTOMIZATIONS,
  supportedTypes: {},
}

export const DEFAULT_CONFIG: Config = {
  [FETCH_CONFIG]: {
    ...elements.query.INCLUDE_ALL_CONFIG,
    hideTypes: true,
  },
  [API_DEFINITIONS_CONFIG]: DEFAULT_API_DEFINITIONS,
  [CLIENT_CONFIG]: {
    [AUTH_CONFIG]: {
      type: 'custom',
      baseURL: 'http://localhost:80',
    },
  },
  [REFERENCES_CONFIG]: {
    rules: [],
  },
}

export const SAMPLE_CONFIG: Partial<Config> = _.defaults({}, {
  [API_DEFINITIONS_CONFIG]: {
    supportedTypes: {
      TypeWithInstances: ['PageType'],
    },
  },
  [CLIENT_CONFIG]: {
    [AUTH_CONFIG]: { // TODON move inside client! + add defaults for client...
      type: 'custom',
      headers: {
        'x-custom-username': '{username}',
        'x-custom-password': '{password}',
      },
      baseURL: 'https://{subdomain}.{domain}',
    },
  },
  [REFERENCES_CONFIG]: {
    rules: [], // TODON
  },
}, DEFAULT_CONFIG)

export const configType = createMatchingObjectType<Partial<Config>>({
  elemID: new ElemID(ADAPTER_NAME),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(ADAPTER_NAME, undefined, {
        [AUTH_CONFIG]: {
          refType: createAuthConfigType({ adapter: ADAPTER_NAME }),
          annotations: { _required: true },
        },
      }),
    },
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(
        ADAPTER_NAME,
      ),
    },
    [API_DEFINITIONS_CONFIG]: {
      refType: createSwaggerAdapterApiConfigType({ adapter: ADAPTER_NAME }),
    },
    [REFERENCES_CONFIG]: {
      refType: createReferencesConfigType({ adapter: ADAPTER_NAME }),
    },
  },
  annotations: {
    // _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG, `${FETCH_CONFIG}.hideTypes`),
    [CORE_ANNOTATIONS.DEFAULT]: DEFAULT_CONFIG,
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: FetchConfig
  [API_DEFINITIONS_CONFIG]: ApiConfig
}
