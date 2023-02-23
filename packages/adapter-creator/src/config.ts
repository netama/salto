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
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, FieldDefinition, ObjectType } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { createMatchingObjectType } from '@salto-io/adapter-utils'

const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType, createApiComponentsConfigType, createUserDeployConfigType, createReferencesConfigType,
} = configUtils

// TODON all of this can potentially come from adapter-components???
// and then the customizations will really be in the generic-adapter and not in the adapter-creator

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const API_COMPONENTS_CONFIG = 'apiComponents'
export const DEPLOY_CONFIG = 'deploy'
// export const AUTH_CONFIG = 'auth'
export const REFERENCES_CONFIG = 'references' // TODON decide

export type ClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type Config = { // TODON generalize? keep client config
  [CLIENT_CONFIG]: ClientConfig
  [FETCH_CONFIG]: configUtils.UserFetchConfig
  [API_COMPONENTS_CONFIG]: configUtils.ApiComponentsConfig // TODON update
  [DEPLOY_CONFIG]?: configUtils.UserDeployConfig
  [REFERENCES_CONFIG]?: configUtils.ReferenceDefinitions
}

const createChangeValidatorConfigType = <ChangeValidatorName extends string>({ adapterName, changeValidatorNames }: {
  adapterName: string
  changeValidatorNames: ChangeValidatorName[]
  // TODON see if can create a real matching object type
}): ObjectType => createMatchingObjectType<Partial<Record<string, boolean>>>({
  elemID: new ElemID(adapterName, 'changeValidatorConfig'),
  fields: Object.fromEntries((changeValidatorNames).map(validatorName => (
    [validatorName, { refType: BuiltinTypes.BOOLEAN }])
  )),
  annotations: {
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type ConfigTypeCreator = (args: {
  adapterName: string
  defaultConfig?: Partial<Config>
  additionalFields?: Record<string, FieldDefinition>
  additionalClientFields?: Record<string, FieldDefinition>
  changeValidatorNames?: string[]
}) => ObjectType
// TODON check if can reuse the already-existing functions?
// TODON allow *overriding* any of the fields for customizations!!! or extensions???
export const createConfigType: ConfigTypeCreator = ({
  adapterName, defaultConfig, additionalClientFields, additionalFields, changeValidatorNames,
}) => createMatchingObjectType<Partial<Config>>({
  elemID: new ElemID(adapterName),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(adapterName, undefined, undefined, additionalClientFields),
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
    [DEPLOY_CONFIG]: {
      // TODON pass from adapter, improve + use in code
      refType: createUserDeployConfigType(adapterName, createChangeValidatorConfigType({
        adapterName,
        changeValidatorNames: changeValidatorNames ?? [],
      })),
    },
    [REFERENCES_CONFIG]: {
      refType: createReferencesConfigType({ adapter: adapterName }),
    },
    ...additionalFields,
  },
  annotations: {
    [CORE_ANNOTATIONS.DEFAULT]: defaultConfig, // TODON omit some parts
    // _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG, `${FETCH_CONFIG}.hideTypes`),
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export const extendApiDefinitionsFromSwagger = ( // TODON move to util
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
