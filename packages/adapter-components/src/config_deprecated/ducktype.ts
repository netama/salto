/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import { ObjectType, BuiltinTypes, FieldDefinition } from '@salto-io/adapter-api'
import { values as lowerDashValues } from '@salto-io/lowerdash'
import {
  AdapterApiConfig,
  createAdapterApiConfigType,
  TypeConfig,
  TypeDefaultsConfig,
  validateSupportedTypes,
  validateCustomizationsTypes,
} from './shared'
import {
  TransformationConfig,
  TransformationDefaultConfig,
  createTransformationConfigTypes,
  validateTransformationConfig,
  getTransformationConfigByType,
} from './transformation'

import { validateRequestConfig } from './request'
import { UserFetchConfig, UserFetchConfigOptions } from '../definitions/user'
import { DefaultWithCustomizations } from '../definitions'

const { isDefined } = lowerDashValues

type DuckTypeTransformationExtra = {
  // types that contain a single object with dynamic keys (map type)
  hasDynamicFields?: boolean
  sourceTypeName?: string
}
export type DuckTypeTransformationConfig = TransformationConfig & DuckTypeTransformationExtra
export type DuckTypeTransformationDefaultConfig = TransformationDefaultConfig & DuckTypeTransformationExtra

export type TypeDuckTypeConfig = TypeConfig<DuckTypeTransformationConfig>
export type TypeDuckTypeDefaultsConfig = TypeDefaultsConfig<DuckTypeTransformationDefaultConfig>
export type AdapterDuckTypeApiConfig = AdapterApiConfig<
  DuckTypeTransformationConfig,
  DuckTypeTransformationDefaultConfig
>

export const createDucktypeAdapterApiConfigType = ({
  adapter,
  additionalFields,
  additionalRequestFields,
  additionalTransformationFields,
  elemIdPrefix = '',
}: {
  adapter: string
  additionalFields?: Record<string, FieldDefinition>
  additionalRequestFields?: Record<string, FieldDefinition>
  additionalTransformationFields?: Record<string, FieldDefinition>
  elemIdPrefix?: string
}): ObjectType => {
  const transformationTypes = createTransformationConfigTypes({
    adapter,
    additionalFields: {
      hasDynamicFields: { refType: BuiltinTypes.BOOLEAN },
      sourceTypeName: { refType: BuiltinTypes.STRING },
      ...additionalTransformationFields,
    },
    elemIdPrefix,
  })
  return createAdapterApiConfigType({
    adapter,
    additionalRequestFields,
    transformationTypes,
    additionalFields,
    elemIdPrefix,
  })
}

export const validateApiDefinitionConfig = (
  apiDefinitionConfigPath: string,
  adapterApiConfig: AdapterDuckTypeApiConfig,
): void => {
  validateRequestConfig(
    apiDefinitionConfigPath,
    adapterApiConfig.typeDefaults.request,
    _.pickBy(
      _.mapValues(adapterApiConfig.types, typeDef => typeDef.request),
      isDefined,
    ),
  )
  validateTransformationConfig(
    apiDefinitionConfigPath,
    adapterApiConfig.typeDefaults.transformation,
    getTransformationConfigByType(adapterApiConfig.types),
  )
}

/**
 * Verify that all fetch types exist in the endpoint definitions.
 * Note: This validation is only relevant for ducktype adapters.
 */
export const validateFetchConfig = <Options extends UserFetchConfigOptions>(
  fetchConfigPath: string,
  userFetchConfig: UserFetchConfig<Options>,
  adapterApiConfig: AdapterApiConfig,
): void => {
  validateSupportedTypes(fetchConfigPath, userFetchConfig, Object.keys(adapterApiConfig.supportedTypes))
  validateSupportedTypes(fetchConfigPath, userFetchConfig, Object.keys(adapterApiConfig.types))
}

export const validateDefaultWithCustomizations = (
  customizationName: string,
  config: DefaultWithCustomizations<boolean>,
  adapterApiConfig: AdapterApiConfig,
): void => {
  if (config.customizations !== undefined) {
    validateCustomizationsTypes(customizationName, config.customizations, Object.keys(adapterApiConfig.supportedTypes))
    validateCustomizationsTypes(customizationName, config.customizations, Object.keys(adapterApiConfig.types))
  }
}
