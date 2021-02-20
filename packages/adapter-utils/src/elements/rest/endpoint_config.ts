/*
*                      Copyright 2021 Salto Labs Ltd.
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
import {
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS, FieldDefinition, ListType, MapType,
} from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { regex } from '@salto-io/lowerdash'

const log = logger(module)

export type DependsOnConfig = {
  endpoint: string
  field: string
}

export type FieldToExtractConfig = {
  // the field name to extract
  fieldName: string
  // when true, the field's name will be nested under the parent's name
  nestName?: boolean
  nameField?: string
  pathField?: string
}

export type RequestConfig = {
  queryParams?: Record<string, string>
  dependsOn?: Record<string, DependsOnConfig>
  paginationField?: string
}

export type ElementTranslationConfig = {
  fieldsToOmit?: string[]
  // fields to convert into their instances (and reference from the parent)
  fieldsToExtract?: FieldToExtractConfig[]
  doNotPersist?: boolean
  nameField?: string
  pathField?: string
}

export type ElementTranslationDefaultsConfig = {
  nameField: string
  pathField: string
  primitiveFieldsToOmit: string[]
  topLevelFieldsToOmit: string[]
  topLevelIndicatorFields: string[]
}

export type EndpointConfig = {
  url: string
  dataField?: string
  request?: RequestConfig
  translation?: ElementTranslationConfig
}

export type UndocumentedEndpointConfig = EndpointConfig & {
  // response schema to use, if one exists in the swagger definitions
  schemaRef?: string
}

export type FieldOverrideConfig = {
  type: string
  list?: boolean
}

export type AdapterApiConfig = {
  swagger: string
  endpointCustomizations?: EndpointConfig[]
  additionalEndpoints?: UndocumentedEndpointConfig[]
  // schema name -> field name -> field type
  fieldTypeOverrides?: Record<string, Record<string, FieldOverrideConfig>>
  translationDefaults: ElementTranslationDefaultsConfig
  apiVersion?: string
}

export type UserFetchConfig = {
  // API endpoints will be used for fetch if they match at least one include regex and no exclude
  includeRegex?: string[]
  excludeRegex?: string[]
}

export const createAdapterApiConfigType = (
  adapter: string,
  additionalEndpointFields?: Record<string, FieldDefinition>,
  additionalTranslationFields?: Record<string, FieldDefinition>,
): ObjectType => {
  const dependsOnConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'dependsOnConfig'),
    fields: {
      endpoint: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      field: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
    } as Record<keyof DependsOnConfig, FieldDefinition>,
  })

  const fieldToExtractConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'fieldToExtractConfig'),
    fields: {
      fieldName: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      nestName: {
        type: BuiltinTypes.BOOLEAN,
      },
      nameField: {
        type: BuiltinTypes.STRING,
      },
      pathField: {
        type: BuiltinTypes.STRING,
      },
    } as Record<keyof FieldToExtractConfig, FieldDefinition>,
  })

  const requestConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'requestConfig'),
    fields: {
      queryParams: { type: new MapType(BuiltinTypes.STRING) },
      dependsOn: { type: new MapType(dependsOnConfigType) },
      paginationField: { type: BuiltinTypes.STRING },
      ...additionalEndpointFields,
    },
  })

  const elementTranslationConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'elementTranslationConfig'),
    fields: {
      fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
      fieldsToExtract: { type: new ListType(fieldToExtractConfigType) },
      doNotPersist: { type: new ListType(BuiltinTypes.STRING) },
      nameField: { type: BuiltinTypes.STRING },
      pathField: { type: BuiltinTypes.STRING },
      ...additionalTranslationFields,
    },
  })

  const endpointConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'endpointConfig'),
    fields: {
      url: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      dataField: {
        type: BuiltinTypes.STRING,
      },
      endpoint: {
        type: requestConfigType,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      translation: {
        type: elementTranslationConfigType,
      },
    },
  })

  const undocumentedEndpointConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'undocumentedEndpointConfig'),
    fields: {
      schemaRef: {
        type: BuiltinTypes.STRING,
      },
      ...endpointConfigType.fields,
    },
  })

  const fieldOverrideConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'fieldOverrideConfig'),
    fields: {
      type: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      list: {
        type: BuiltinTypes.BOOLEAN,
      },
    },
  })

  const elementTranslationDefaultsConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'elementTranslationConfig'),
    fields: {
      primitiveFieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
      topLevelFieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
      topLevelIndicatorFields: { type: new ListType(BuiltinTypes.STRING) },
      nameField: { type: BuiltinTypes.STRING },
      pathField: { type: BuiltinTypes.STRING },
    },
  })

  const adapterApiConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'adapterApiConfig'),
    fields: {
      swagger: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      endpointCustomizations: {
        type: new ListType(endpointConfigType),
      },
      additionalEndpoints: {
        type: new ListType(undocumentedEndpointConfigType),
      },
      fieldTypeOverrides: {
        type: new MapType(new MapType(fieldOverrideConfigType)),
      },
      translationDefaults: {
        type: elementTranslationDefaultsConfigType,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      apiVersion: {
        type: BuiltinTypes.STRING,
      },
    },
  })
  return adapterApiConfigType
}

export const createUserFetchConfigType = (
  adapter: string,
): ObjectType => (
  new ObjectType({
    elemID: new ElemID(adapter, 'userFetchConfig'),
    fields: {
      includeRegex: { type: new ListType(BuiltinTypes.STRING) },
      excludeRegex: { type: new ListType(BuiltinTypes.STRING) },
    },
  })
)

export const validateApiDefinitionConfig = (
  apiDefinitionConfigPath: string,
  adapterApiConfig: AdapterApiConfig,
): void => {
  // TODO after loading the swagger and parsing the types,
  // add change suggestions for values that catch nothing
  const endpointURLs = adapterApiConfig.endpointCustomizations?.map(e => e.url) ?? []
  const duplicates = new Set(endpointURLs.filter((url, idx) => endpointURLs.indexOf(url) !== idx))
  if (duplicates.size > 0) {
    throw new Error(`Duplicate endpoint definitions found in ${apiDefinitionConfigPath}: ${[...duplicates].sort()}`)
  }
  // TODO also verify no conflicts with additionalEndpoints
}

export const validateFetchConfig = (
  fetchConfigPath: string,
  { includeRegex, excludeRegex }: UserFetchConfig,
): void => {
  const validateRegularExpressions = (fieldName: string, regularExpressions: string[]): void => {
    const invalidRegularExpressions = regularExpressions
      .filter(strRegex => !regex.isValidRegex(strRegex))
    if (!_.isEmpty(invalidRegularExpressions)) {
      const errMessage = `Failed to load config due to an invalid value in ${fetchConfigPath}.${fieldName}.`
        + `The following regular expressions are invalid: ${invalidRegularExpressions}`
      log.error(errMessage)
      throw Error(errMessage)
    }
  }

  if (includeRegex !== undefined) {
    validateRegularExpressions('includeRegex', includeRegex)
  }
  if (excludeRegex !== undefined) {
    validateRegularExpressions('excludeRegex', excludeRegex)
  }
}
