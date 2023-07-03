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
  createDucktypeAdapterApiConfigType,
  createSwaggerAdapterApiConfigType,
} = configUtils

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const API_COMPONENTS_CONFIG = 'apiComponents'
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

// TODON merge logic of ducktype+swagger and refactor this
export type ApiComponentsConfig = {
  ducktype?: Record<string, configUtils.AdapterDuckTypeApiConfig>
  swagger?: Record<string, configUtils.AdapterSwaggerApiConfig>
}

export type ReferencesConfig = {
  // TODON switch never once shared context exists (maybe already?)
  rules: referenceUtils.FieldReferenceDefinition<never>[]
}

export type Config = {
  [CLIENT_CONFIG]: ClientConfig
  [FETCH_CONFIG]: FetchConfig
  [API_COMPONENTS_CONFIG]: ApiComponentsConfig
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

export const createApiComponentsConfigType = ({ adapter }: { adapter: string }): ObjectType => (
  createMatchingObjectType<ApiComponentsConfig>({
    elemID: new ElemID(adapter, 'apiComponentsConfig'),
    fields: {
      ducktype: {
        refType: new MapType(createDucktypeAdapterApiConfigType({ adapter })),
      },
      swagger: {
        refType: new MapType(createSwaggerAdapterApiConfigType({ adapter })),
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
)

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  // { fieldName: 'createdBy', fieldType: 'string' },
]

export const DEFAULT_API_COMPONENT_DEFINITIONS: ApiComponentsConfig = {
  swagger: {
    main: { // TODON use names as prefixes to avoid conflicts
      swagger: {
        url: '/tmp/path-to-swagger.json', // TODON
      },
      typeDefaults: {
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
        },
      },
      types: {},
      supportedTypes: {},
    },
  },
  ducktype: {
    main: {
      typeDefaults: {
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
        },
      },
      types: {},
      supportedTypes: {},
    },
  },
}

export const DEFAULT_CONFIG: Config = {
  [FETCH_CONFIG]: {
    ...elements.query.INCLUDE_ALL_CONFIG,
    hideTypes: true,
  },
  [API_COMPONENTS_CONFIG]: DEFAULT_API_COMPONENT_DEFINITIONS,
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
  [API_COMPONENTS_CONFIG]: {
    swagger: {
      // sample1: {
      //   supportedTypes: {
      //     TypeWithInstances: ['PageType'],
      //   },
      // },
      main: { // TODON use names as prefixes to avoid conflicts
        swagger: {
          url: 'https://raw.githubusercontent.com/salto-io/adapter-swaggers/main/okta/management-swagger-v3.yaml', // okta
          typeNameOverrides: [
            { originalName: 'Role', newName: 'RoleAssignment' },
            { originalName: 'IamRole', newName: 'Role' },
          ],
          additionalTypes: [
            {
              typeName: 'OktaSignOnPolicies',
              cloneFrom: 'api__v1__policies',
            },
            {
              typeName: 'OktaSignOnPolicyRules',
              cloneFrom: 'api__v1__policies___policyId___rules@uuuuuu_00123_00125uu',
            },
          ],
        },
        typeDefaults: {
          transformation: {
            idFields: DEFAULT_ID_FIELDS,
            fieldsToOmit: FIELDS_TO_OMIT,
          },
        },
        types: {
          Group: {
            transformation: {
              fieldTypeOverrides: [
                { fieldName: 'roles', fieldType: 'list<RoleAssignment>' },
                { fieldName: 'source', fieldType: 'Group__source' },
              ],
              fieldsToHide: [
                { fieldName: 'id' },
              ],
              idFields: ['profile.name'],
              serviceIdField: 'id',
              serviceUrl: '/admin/group/{id}',
              standaloneFields: [{ fieldName: 'roles' }],
              nestStandaloneInstances: false,
            },
          },
          IamRoles: {
            request: {
              url: '/api/v1/iam/roles',
            },
            transformation: {
              dataField: 'roles',
            },
          },
          OktaSignOnPolicies: {
            request: {
              url: '/api/v1/policies',
              queryParams: {
                type: 'OKTA_SIGN_ON',
              },
              recurseInto: [
                {
                  type: 'OktaSignOnPolicyRules',
                  toField: 'policyRules',
                  context: [
                    {
                      name: 'policyId',
                      fromField: 'id',
                    },
                  ],
                },
              ],
            },
            transformation: {
              fieldTypeOverrides: [
                {
                  fieldName: 'items',
                  fieldType: 'list<OktaSignOnPolicy>',
                },
              ],
            },
          },
          OktaSignOnPolicyRules: {
            request: {
              url: '/api/v1/policies/{policyId}/rules',
            },
            transformation: {
              dataField: '.',
              fieldTypeOverrides: [
                {
                  fieldName: 'items',
                  fieldType: 'list<OktaSignOnPolicyRule>',
                },
              ],
            },
          },
          OktaSignOnPolicy: {
            transformation: {
              serviceIdField: 'id',
              fieldsToHide: [
                {
                  fieldName: 'id',
                },
              ],
              fieldTypeOverrides: [
                {
                  fieldName: 'policyRules',
                  fieldType: 'list<OktaSignOnPolicyRule>',
                },
              ],
              standaloneFields: [
                {
                  fieldName: 'policyRules',
                },
              ],
            },
          },
          OktaSignOnPolicyRule: {
            transformation: {
              serviceIdField: 'id',
              fieldsToHide: [
                {
                  fieldName: 'id',
                },
              ],
            },
          },
        },
        supportedTypes: {
          Application: ['api__v1__apps'],
          Group: ['api__v1__groups'],
          RoleAssignment: ['api__v1__groups___groupId___roles@uuuuuu_00123_00125uu'],
          Role: ['IamRoles'],
          OktaSignOnPolicy: ['OktaSignOnPolicies'],
        },
      },
    },
    ducktype: {
      // sample2: {
      //   supportedTypes: {
      //     TypeWithInstances: ['PageType'],
      //   },
      // },
    },
  },
  [CLIENT_CONFIG]: {
    [AUTH_CONFIG]: {
      type: 'custom',
      headers: {
        Authorization: 'SSWS {token}',
      },
      baseURL: 'https://{subdomain}.okta.com',
    },
  },
  [REFERENCES_CONFIG]: {
    rules: [
      {
        src: { field: 'assignedGroups', parentTypes: ['Application'] },
        serializationStrategy: 'id',
        target: { type: 'Group' },
      },
      {
        src: { field: 'role', parentTypes: ['RoleAssignment'] },
        serializationStrategy: 'id',
        target: { type: 'Role' },
      },
      {
        src: { field: 'include', parentTypes: ['GroupCondition'] },
        serializationStrategy: 'id',
        target: { type: 'Group' },
      },
      {
        src: { field: 'exclude', parentTypes: ['GroupCondition'] },
        serializationStrategy: 'id',
        target: { type: 'Group' },
      },
    ],
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
    [API_COMPONENTS_CONFIG]: {
      refType: createApiComponentsConfigType({ adapter: ADAPTER_NAME }),
    },
    [REFERENCES_CONFIG]: {
      refType: createReferencesConfigType({ adapter: ADAPTER_NAME }),
    },
  },
  annotations: {
    // _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG, `${FETCH_CONFIG}.hideTypes`),
    [CORE_ANNOTATIONS.DEFAULT]: SAMPLE_CONFIG,
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: FetchConfig
  [API_COMPONENTS_CONFIG]: ApiComponentsConfig
  [REFERENCES_CONFIG]: ReferencesConfig
}
