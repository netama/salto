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
export { ApiComponentsConfig, createApiComponentsConfigType } from './api_components'
export { createDucktypeAdapterApiConfigType, AdapterDuckTypeApiConfig, DuckTypeTransformationConfig, DuckTypeTransformationDefaultConfig, TypeDuckTypeConfig, TypeDuckTypeDefaultsConfig, validateApiDefinitionConfig as validateDuckTypeApiDefinitionConfig, validateFetchConfig as validateDuckTypeFetchConfig } from './ducktype'
export { createRequestConfigs, validateRequestConfig, FetchRequestConfig, DeployRequestConfig, UrlParams, DeploymentRequestsByAction, RecurseIntoCondition, RecurseIntoConfig, isRecurseIntoConditionByField } from './request'
export { ReferenceDefinitions, createReferencesConfigType } from '../definitions/system/references'
export { createAdapterApiConfigType, getConfigWithDefault, AdapterApiConfig, TypeConfig, TypeDefaultsConfig, DEPLOYER_FALLBACK_VALUE, DefaultMissingUserFallbackConfig, validateDefaultMissingUserFallbackConfig, validateSupportedTypes, defaultMissingUserFallbackField, AdapterFetchError as FetchError } from './shared'
export { mergeWithDefaultConfig } from './merge'
export { createTypeNameOverrideConfigType, createSwaggerAdapterApiConfigType, AdapterSwaggerApiConfig, RequestableAdapterSwaggerApiConfig, SwaggerDefinitionBaseConfig, TypeSwaggerConfig, RequestableTypeSwaggerConfig, TypeSwaggerDefaultConfig, TypeNameOverrideConfig, validateApiDefinitionConfig as validateSwaggerApiDefinitionConfig, validateFetchConfig as validateSwaggerFetchConfig } from './swagger'
export { createTransformationConfigTypes, validateTransoformationConfig, TransformationDefaultConfig, TransformationConfig, StandaloneFieldConfigType, FieldToOmitType, FieldToHideType, getTransformationConfigByType, dereferenceFieldName, isReferencedIdField, NameMappingOptions, DATA_FIELD_ENTIRE_OBJECT, getTypeTransformationConfig, shouldNestFiles } from './transformation'
export { getConfigWithExcludeFromConfigChanges, ConfigChangeSuggestion } from './config_change'
export * as configMigrations from './config_migrations'
export { UserFetchConfig, createUserFetchConfigType, UserDeployConfig, DefaultFetchCriteria, createUserDeployConfigType,  } from '../definitions/user/user_config' // TODON move