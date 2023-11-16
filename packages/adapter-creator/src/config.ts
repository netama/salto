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
import { CORE_ANNOTATIONS, ElemID, ObjectType } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { createMatchingObjectType } from '@salto-io/adapter-utils'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createApiComponentsConfigType, createReferencesConfigType } = configUtils

// TODON all of this can potentially come from adapter-components???
// and then the customizations will really be in the generic-adapter and not in the adapter-creator

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const API_COMPONENTS_CONFIG = 'apiComponents'
// export const AUTH_CONFIG = 'auth'
export const REFERENCES_CONFIG = 'references' // TODON decide

export type ClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type Config = { // TODON generalize? keep client config
  [CLIENT_CONFIG]: ClientConfig
  [FETCH_CONFIG]: configUtils.UserFetchConfig
  [API_COMPONENTS_CONFIG]: configUtils.ApiComponentsConfig // TODON update
  [REFERENCES_CONFIG]?: configUtils.ReferencesConfig
}

// TODON check if can reuse the already-existing functions?
// TODON allow *overriding* any of the fields for customizations!!! or extensions???
export const createConfigType = (
  adapterName: string,
  defaultConfig?: Partial<Config>
): ObjectType => createMatchingObjectType<Partial<Config>>({
  elemID: new ElemID(adapterName),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(adapterName),
    },
    // TODON extend with auth config??? only in generic adapter
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(
        adapterName,
      ),
    },
    [API_COMPONENTS_CONFIG]: {
      refType: createApiComponentsConfigType({ adapter: adapterName }),
    },
    [REFERENCES_CONFIG]: {
      refType: createReferencesConfigType({ adapter: adapterName }),
    },
    // TODON add config
  },
  annotations: {
    [CORE_ANNOTATIONS.DEFAULT]: defaultConfig, // TODON omit some parts
    // _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG, `${FETCH_CONFIG}.hideTypes`),
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export const extendApiDefinitionsFromSwagger = (
  userConfig: Config,
  parsedConfigs?: Record<string, configUtils.RequestableTypeSwaggerConfig>,
): configUtils.AdapterApiConfig => {
  // TODON reuse util
  const defs = userConfig[API_COMPONENTS_CONFIG].definitions
  return {
    ...defs,
    // user config takes precedence over parsed config
    types: {
      ...parsedConfigs,
      ..._.mapValues(
        defs.types,
        (def, typeName) => ({ ...parsedConfigs?.[typeName] ?? {}, ...def })
      ),
    },
  }
}
