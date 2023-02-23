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
import { ElemID, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { client as clientUtils, config as configUtils, elements } from '@salto-io/adapter-components'
import { ADAPTER_NAME } from './constants'

const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType,
  createSwaggerAdapterApiConfigType,
} = configUtils

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type ClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type FetchConfig = configUtils.UserFetchConfig

export type ApiConfig = configUtils.AdapterSwaggerApiConfig

export type Config = {
  [CLIENT_CONFIG]?: ClientConfig
  [FETCH_CONFIG]: FetchConfig
  [API_DEFINITIONS_CONFIG]: ApiConfig
}

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  // { fieldName: 'createdBy', fieldType: 'string' },
]

const DEFAULT_TYPE_CUSTOMIZATIONS: ApiConfig['types'] = {}

const DEFAULT_SWAGGER_CONFIG: ApiConfig['swagger'] = {
  url: '/tmp/path-to-swagger.json', // TODO
}

export const SUPPORTED_TYPES = { // TODO
  MCMService_EnergySourceTypes: ['EnergySourceTypes'],
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
  supportedTypes: SUPPORTED_TYPES,
}

export const DEFAULT_CONFIG: Config = {
  [FETCH_CONFIG]: {
    ...elements.query.INCLUDE_ALL_CONFIG,
    hideTypes: true,
  },
  [API_DEFINITIONS_CONFIG]: DEFAULT_API_DEFINITIONS,
}

export const configType = createMatchingObjectType<Partial<Config>>({
  elemID: new ElemID(ADAPTER_NAME),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(ADAPTER_NAME),
    },
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(
        ADAPTER_NAME,
      ),
    },
    [API_DEFINITIONS_CONFIG]: {
      refType: createSwaggerAdapterApiConfigType({ adapter: ADAPTER_NAME }),
    },
  },
  annotations: {
    [CORE_ANNOTATIONS.DEFAULT]: _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG, `${FETCH_CONFIG}.hideTypes`),
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: FetchConfig
  [API_DEFINITIONS_CONFIG]: ApiConfig
}
