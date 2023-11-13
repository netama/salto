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
import {
  InstanceElement, ObjectType,
  ElemIdGetter, SaltoError, isInstanceElement,
} from '@salto-io/adapter-api'
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { Paginator, PageEntriesExtractor } from '../../client'
import {
  AdapterSwaggerApiConfig, ConfigChangeSuggestion,
} from '../../config'
import { AdapterFetchError, InvalidSingletonType } from '../../config/shared'
import { findDataField, FindNestedFieldFunc } from '../field_finder'
import { computeGetArgs as defaultComputeGetArgs, ComputeGetArgsFunc } from '../request_parameters'
import { FetchElements, getElementsWithContext } from '../element_getter'
import { ElementQuery } from '../query'
import { getTypeAndInstances, getUniqueConfigSuggestions } from '../ducktype' // TODON move to shared location

const { makeArray } = collections.array
const { isPlainRecord } = lowerdashValues
const log = logger(module)

// TODON might lost performance optimizations for jira!!! check

// TODON used for special case - make sure covered...
// const isAdditionalPropertiesOnlyObjectType = (type: ObjectType): boolean => (
//   _.isEqual(Object.keys(type.fields), [ADDITIONAL_PROPERTIES_FIELD])
// )

export const extractPageEntriesByNestedField = (fieldName?: string): PageEntriesExtractor => (
  page => {
    const allEntries = (fieldName !== undefined
      ? makeArray(_.get(page, fieldName))
      : makeArray(page))
    const [validEntries, invalidEntries] = _.partition(allEntries, isPlainRecord)
    if (invalidEntries.length > 0) {
      log.error('omitted %d invalid entries: %s', invalidEntries.length, safeJsonStringify(invalidEntries))
    }
    return validEntries
  }
)

/**
 * Get all instances from all types included in the fetch configuration.
 */
export const getAllInstances = async ({ // part 2 swagger
  adapterName,
  paginator,
  apiConfig,
  fetchQuery,
  supportedTypes,
  objectTypes,
  nestedFieldFinder = findDataField,
  computeGetArgs = defaultComputeGetArgs,
  getElemIdFunc,
  isErrorTurnToConfigSuggestion,
  customInstanceFilter,
}: {
  adapterName: string
  paginator: Paginator
  apiConfig: Pick<AdapterSwaggerApiConfig, 'types' | 'typeDefaults'>
  fetchQuery: Pick<ElementQuery, 'isTypeMatch'>
  supportedTypes: Record<string, string[]>
  objectTypes: Record<string, ObjectType>
  nestedFieldFinder?: FindNestedFieldFunc
  computeGetArgs?: ComputeGetArgsFunc
  getElemIdFunc?: ElemIdGetter
  isErrorTurnToConfigSuggestion?: (error: Error) => boolean
  customInstanceFilter?: (instances: InstanceElement[]) => InstanceElement[]
}): Promise<FetchElements<InstanceElement[]>> => {
  const { types, typeDefaults } = apiConfig

  const reversedSupportedTypes = _(
    Object.entries(supportedTypes)
      .flatMap(([typeName, wrapperTypes]) => wrapperTypes.map(wrapperType => ({ wrapperType, typeName })))
  )
    .groupBy(entry => entry.wrapperType)
    .mapValues(typeEntry => typeEntry.map(value => value.typeName))
    .value()

  const elementGenerationParams = {
    adapterName,
    paginator,
    typesConfig: types,
    objectTypes,
    typeDefaultConfig: typeDefaults,
    nestedFieldFinder,
    computeGetArgs,
    getElemIdFunc,
    reversedSupportedTypes,
  }

  const configSuggestions: ConfigChangeSuggestion[] = []
  const { elements, errors } = await getElementsWithContext({ // TODON duplicated from ducktype for testing
    fetchQuery,
    types: apiConfig.types,
    supportedTypes,
    typeElementGetter: async args => {
      try { // TODON move all this wrapping inside?
        return {
          elements: (await getTypeAndInstances({
            ...elementGenerationParams, ...args, customInstanceFilter, objectTypes, // TODON difference - but will merge
          })),
          errors: [],
        }
      } catch (e) {
        if (isErrorTurnToConfigSuggestion?.(e)
          && (reversedSupportedTypes[args.typeName] !== undefined)) {
          const typesToExclude = reversedSupportedTypes[args.typeName]
          typesToExclude.forEach(type => {
            configSuggestions.push({ typeToExclude: type })
          })
          return { elements: [], errors: [] }
        }
        if (e.response?.status === 403 || e.response?.status === 401) {
          const newError: SaltoError = {
            message: `Salto could not access the ${args.typeName} resource. Elements from that type were not fetched. Please make sure that this type is enabled in your service, and that the supplied user credentials have sufficient permissions to access this data. You can also exclude this data from Salto's fetches by changing the environment configuration. Learn more at https://help.salto.io/en/articles/6947061-salto-could-not-access-the-resource`,
            severity: 'Warning',
          }
          return { elements: [], errors: [newError] }
        }
        if (e instanceof InvalidSingletonType) {
          return { elements: [], errors: [{ message: e.message, severity: 'Warning' }] }
        }
        if (e instanceof AdapterFetchError) {
          return { elements: [], errors: [{ message: e.message, severity: e.severity }] }
        }
        throw e
      }
    },
  })
  // TODON fix types to use the original ones
  return {
    elements: elements.filter(isInstanceElement), // TODON do something smarter with the types
    configChanges: getUniqueConfigSuggestions(configSuggestions),
    errors,
  }
}
