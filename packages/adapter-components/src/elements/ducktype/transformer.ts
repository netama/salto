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
import { Element, InstanceElement, isObjectType, Values, ObjectType, ElemIdGetter, SaltoError, isType, isInstanceElement } from '@salto-io/adapter-api'
import { naclCase } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { Paginator, ResponseValue, ClientGetWithPaginationParams } from '../../client'
import { generateType } from './type_elements'
import { toInstance } from './instance_elements'
import { getConfigWithDefault, getTransformationConfigByType } from '../../config'
import { FindNestedFieldFunc, findDataField } from '../field_finder'
import { TypeDuckTypeDefaultsConfig, TypeDuckTypeConfig, DuckTypeTransformationConfig, DuckTypeTransformationDefaultConfig } from '../../config/ducktype'
import { computeGetArgs as defaultComputeGetArgs, ComputeGetArgsFunc, MissingContextError } from '../../fetch/resource/request_parameters'
import { FetchElements, getElementsWithContext } from '../element_getter'
import { extractStandaloneFields } from './standalone_field_extractor'
import { shouldRecurseIntoEntry } from '../instance_elements'
import { addRemainingTypes } from './add_remaining_types'
import { ElementQuery } from '../../fetch/query'
import { AdapterApiConfig, AdapterFetchError, InvalidSingletonType } from '../../config/shared'
import { ConfigChangeSuggestion, TYPE_TO_EXCLUDE } from '../../config/config_change'
import { ARRAY_ITEMS_FIELD } from '../swagger/type_elements/swagger_parser'

const { makeArray } = collections.array
const { toArrayAsync, awu } = collections.asynciterable
const { isDefined } = lowerdashValues
const log = logger(module)

export type EntriesRequester = (
  args: {
    paginator: Paginator
    args: ClientGetWithPaginationParams
    typeName: string
    typesConfig: Record<string, TypeDuckTypeConfig>
  }
) => Promise<ResponseValue[]>

type GetEntriesParams = {
  adapterName: string
  typeName: string
  paginator: Paginator
  nestedFieldFinder: FindNestedFieldFunc
  computeGetArgs: ComputeGetArgsFunc
  typesConfig: Record<string, TypeDuckTypeConfig>
  typeDefaultConfig: TypeDuckTypeDefaultsConfig
  contextElements?: Record<string, Element[]>
  requestContext?: Record<string, unknown>
  getElemIdFunc?: ElemIdGetter
  getEntriesResponseValuesFunc?: EntriesRequester
  reversedSupportedTypes: Record<string, string[]>
  objectTypes?: Record<string, ObjectType>
}

type Entries = {
  instances: InstanceElement[]
  type: ObjectType
  nestedTypes: ObjectType[]
}


export const getEntriesResponseValues: EntriesRequester = async ({
  paginator,
  args,
}): Promise<ResponseValue[]> => (
  (await toArrayAsync(
    paginator(args, page => makeArray(page) as ResponseValue[])
  )).flat()
)

export const getUniqueConfigSuggestions = (
  configSuggestions: ConfigChangeSuggestion[]
): ConfigChangeSuggestion[] => (_.uniqBy(configSuggestions, suggestion => `${suggestion.type}-${suggestion.value}-${suggestion.reason}`))


const isItemsOnlyObjectType = (type: ObjectType): boolean => (
  _.isEqual(Object.keys(type.fields), [ARRAY_ITEMS_FIELD])
)

const getNestedEntries = (
  entry: Values,
  fieldName: string,
  type: ObjectType,
): Values[] => {
  if (fieldName === ARRAY_ITEMS_FIELD && entry[fieldName] === undefined && isItemsOnlyObjectType(type)) {
    return makeArray(entry)
  }
  return makeArray(entry[fieldName])
}

/**
 * Creates new type based on instances values,
 * then creates new instances pointing the new type
 */
export const getNewElementsFromInstances = ({
  adapterName,
  typeName,
  instances,
  transformationConfigByType,
  transformationDefaultConfig,
  objectTypes,
}: {
  adapterName: string
  typeName: string
  instances: InstanceElement[]
  transformationConfigByType: Record<string, DuckTypeTransformationConfig>
  transformationDefaultConfig: DuckTypeTransformationDefaultConfig
  objectTypes?: Record<string, ObjectType>
}): Entries => {
  const { hasDynamicFields } = getConfigWithDefault(transformationConfigByType[typeName], transformationDefaultConfig)

  const { type: newType, nestedTypes: newNestedTypes } = generateType({
    adapterName,
    name: typeName,
    entries: instances.map(inst => inst.value),
    hasDynamicFields: hasDynamicFields === true,
    transformationConfigByType,
    transformationDefaultConfig,
    objectTypes,
  })
  return {
    instances: instances.map(inst => new InstanceElement(
      inst.elemID.name, newType, inst.value, inst.path, inst.annotations
    )),
    type: newType,
    nestedTypes: newNestedTypes,
  }
}

const getEntriesForType = async (
  params: GetEntriesParams
): Promise<Entries> => {
  const {
    typeName, paginator, typesConfig, typeDefaultConfig, contextElements,
    requestContext, nestedFieldFinder, computeGetArgs, adapterName, getElemIdFunc,
    getEntriesResponseValuesFunc, reversedSupportedTypes, objectTypes,
  } = params
  const typeConfig = typesConfig[typeName]
  if (typeConfig === undefined) {
    // should never happen
    throw new Error(`could not find type ${typeName}`)
  }
  const { request, transformation } = typeConfig
  if (request === undefined) {
    // a type with no request config cannot be fetched
    throw new Error(`Invalid type config - type ${adapterName}.${typeName} has no request config`)
  }

  const {
    fieldsToOmit, hasDynamicFields, dataField,
  } = getConfigWithDefault(transformation, typeDefaultConfig.transformation)

  const requestWithDefaults = getConfigWithDefault(request, typeDefaultConfig.request ?? {})

  const getEntries = async (context: Values | undefined): Promise<Values[]> => {
    const getArgs = computeGetArgs(requestWithDefaults, contextElements, _.assign({}, context, requestContext),
      reversedSupportedTypes)
    return (await Promise.all(
      getArgs.map(async args => (
        getEntriesResponseValuesFunc
          ? getEntriesResponseValuesFunc({ paginator, args, typeName, typesConfig })
          : getEntriesResponseValues({ paginator, args, typeName, typesConfig })
      ))
    )).flat()
  }
  const entriesValues = (await getEntries(requestContext))
    // escape "field" names that contain '.'
    // TODON do this recursively on values! adjust object types as well? (+ de-esacpe on deploy)
    .map(values => _.mapKeys(values, (_val, key) => naclCase(key)))

  const transformationConfigByType = getTransformationConfigByType(typesConfig)
  const transformationDefaultConfig = typeDefaultConfig.transformation

  // types with dynamic fields will be associated with the dynamic_keys type

  // TODON make _this_ part aware of the swagger? and reuse nested types
  // TODON also make it easy to override / add more args here based on the response? but less critical...
  const { type, nestedTypes } = generateType({ // TODON first look in swagger? or just replace at the end?
    adapterName,
    name: typeName,
    entries: entriesValues,
    hasDynamicFields: hasDynamicFields === true,
    transformationConfigByType,
    transformationDefaultConfig,
    objectTypes,
  })
  // find the field and type containing the actual instances
  const nestedFieldDetails = await nestedFieldFinder(type, fieldsToOmit, dataField)

  if (nestedFieldDetails === undefined) {
    log.debug(`storing full entries for ${type.elemID.name}`)
  }

  const instances = await awu(entriesValues).flatMap(async (entry, index) => {
    if (nestedFieldDetails !== undefined) {
      const nestedEntries = getNestedEntries(entry, nestedFieldDetails.field.name, type) // TODON needed for swagger
      return awu(nestedEntries).map(
        (nestedEntry, nesteIndex) => {
          if (!isObjectType(nestedFieldDetails.type)) {
            log.error(`for typeName ${typeName} in adapter ${adapterName} nestedFieldDetails.type is not objectType returning undefined`)
            return undefined
          }
          return toInstance({ // TDOON step 2
            entry: nestedEntry,
            type: nestedFieldDetails.type,
            transformationConfigByType,
            transformationDefaultConfig,
            defaultName: `unnamed_${index}_${nesteIndex}`, // TODO improve
            hasDynamicFields,
            getElemIdFunc,
          })
        }
      ).filter(isDefined).toArray()
    }

    return [await toInstance({
      entry,
      type,
      transformationConfigByType,
      transformationDefaultConfig,
      defaultName: `unnamed_${index}`, // TODO improve
      hasDynamicFields,
      getElemIdFunc,
    })].filter(isDefined)
  }).toArray()

  if (type.isSettings && instances.length > 1) {
    log.warn(`Expected one instance for singleton type: ${type.elemID.name} but received: ${instances.length}`)
    throw new InvalidSingletonType(`Could not fetch type ${type.elemID.name}, singleton types should not have more than one instance`)
  }

  const { recurseInto } = requestWithDefaults
  const getExtraFieldValues = async (instance: InstanceElement): Promise<Record<string, Entries>> => Object.fromEntries(
    (await Promise.all(
      (recurseInto ?? [])
        .filter(({ conditions }) => shouldRecurseIntoEntry(
          instance.value, requestContext, conditions
        ))
        .map(async nested => {
          const nestedRequestContext = Object.fromEntries(
            nested.context.map(
              contextDef => [contextDef.name, _.get(instance.value, contextDef.fromField)]
            )
          )
          // TODON avoid crashing if fails on sub-element (copy from swagger)
          const nestedEntries = (await getEntriesForType({
            ...params,
            typeName: nested.type,
            requestContext: {
              ...requestContext ?? {},
              ...nestedRequestContext,
            },
          }))
          return [nested.toField, nestedEntries]
        })
    )).filter(([_fieldName, nestedEntries]) => !_.isEmpty(nestedEntries))
  )
  let hasExtraFields = false
  await Promise.all(instances.map(async inst => {
    const extraFields = await getExtraFieldValues(inst)
    Object.entries(extraFields ?? {}).forEach(([fieldName, extraEntries]) => {
      hasExtraFields = true
      inst.value[fieldName] = extraEntries.instances.map(i => i.value)
      return inst
    })
  }))
  if (!hasExtraFields) {
    return { instances, type, nestedTypes }
  }
  // We generare the type again since we added more fields to the instances from the recurse into
  const newElements = getNewElementsFromInstances({
    adapterName,
    typeName: (nestedFieldDetails?.type ?? type).elemID.typeName,
    instances,
    transformationConfigByType,
    transformationDefaultConfig,
    objectTypes,
  })

  return {
    instances: newElements.instances,
    type: newElements.type,
    nestedTypes: newElements.nestedTypes.concat(nestedFieldDetails ? type : []),
  }
}

/**
 * Given a type and the corresponding endpoint definition, make the relevant HTTP requests and
 * use the responses to create elements for the endpoint's type (and nested types) and instances.
 */
export const getTypeAndInstances = async ({
  adapterName,
  typeName,
  paginator,
  nestedFieldFinder,
  computeGetArgs,
  typesConfig,
  typeDefaultConfig,
  contextElements,
  getElemIdFunc,
  getEntriesResponseValuesFunc,
  reversedSupportedTypes,
  customInstanceFilter,
  additionalRequestContext,
  objectTypes,
}: {
  adapterName: string
  typeName: string
  paginator: Paginator
  nestedFieldFinder: FindNestedFieldFunc
  computeGetArgs: ComputeGetArgsFunc
  typesConfig: Record<string, TypeDuckTypeConfig>
  typeDefaultConfig: TypeDuckTypeDefaultsConfig
  contextElements?: Record<string, Element[]>
  getElemIdFunc?: ElemIdGetter
  getEntriesResponseValuesFunc?: EntriesRequester
  reversedSupportedTypes: Record<string, string[]>
  customInstanceFilter?: (instances: InstanceElement[]) => InstanceElement[]
  additionalRequestContext?: Record<string, unknown>
  objectTypes?: Record<string, ObjectType> // TODON rename?
}): Promise<Element[]> => {
  const entries = await getEntriesForType({ // should be shared...
    adapterName,
    paginator,
    typeName,
    computeGetArgs,
    nestedFieldFinder,
    typeDefaultConfig,
    typesConfig,
    contextElements,
    getElemIdFunc,
    getEntriesResponseValuesFunc,
    reversedSupportedTypes,
    requestContext: additionalRequestContext,
    objectTypes,
  })
  const { type, nestedTypes, instances } = entries
  const filteredInstances = customInstanceFilter !== undefined ? customInstanceFilter(instances) : instances
  const elements = [type, ...nestedTypes, ...filteredInstances]
  const transformationConfigByType = getTransformationConfigByType(typesConfig)

  // We currently don't support extracting standalone fields from the types we recursed into // TODON fix
  await extractStandaloneFields({ // check for consistency
    adapterName,
    elements,
    transformationConfigByType,
    transformationDefaultConfig: typeDefaultConfig.transformation,
    getElemIdFunc,
  })
  return elements
}

/**
 * Helper function for the adapter fetch implementation:
 * Given api definitions and a list of types, make the relevant API calls and convert the
 * response data into a list of elements (for the type, nested types and instances).
 *
 * Supports one level of dependency between the type's endpoints, using the dependsOn field
 * (note that it will need to be extended in order to support longer dependency chains).
 */
export const getAllElements = async ({
  adapterName,
  fetchQuery,
  supportedTypes,
  apiConfig,
  objectTypes,
  shouldAddRemainingTypes = true,
  paginator,
  nestedFieldFinder = findDataField,
  computeGetArgs = defaultComputeGetArgs,
  getElemIdFunc,
  getEntriesResponseValuesFunc,
  isErrorTurnToConfigSuggestion,
  customInstanceFilter,
  additionalRequestContext,
  // TODON support multiple clients / base urls as part of the config
}: {
  adapterName: string
  fetchQuery: ElementQuery
  supportedTypes: Record<string, string[]>
  apiConfig: Pick<AdapterApiConfig, 'types' | 'typeDefaults'>
  objectTypes?: Record<string, ObjectType>
  shouldAddRemainingTypes?: boolean
  paginator: Paginator
  nestedFieldFinder?: FindNestedFieldFunc
  computeGetArgs?: ComputeGetArgsFunc
  getElemIdFunc?: ElemIdGetter
  getEntriesResponseValuesFunc?: EntriesRequester
  isErrorTurnToConfigSuggestion?: (error: Error) => boolean
  customInstanceFilter?: (instances: InstanceElement[]) => InstanceElement[]
  additionalRequestContext? : Record<string, unknown>
}): Promise<FetchElements> => {
  const { types, typeDefaults } = apiConfig
  // TODON shouldn't these be all? except edge cases / special cases just for consistency?
  const supportedTypesWithEndpoints = _.mapValues(
    supportedTypes,
    typeNames => typeNames.filter(typeName => types[typeName].request?.url !== undefined)
  )

  const reversedSupportedTypes = _(
    Object.entries(supportedTypesWithEndpoints)
      .flatMap(([typeName, wrapperTypes]) => wrapperTypes.map(wrapperType => ({ wrapperType, typeName })))
  )
    .groupBy(entry => entry.wrapperType)
    .mapValues(typeEntry => typeEntry.map(value => value.typeName))
    .value()

  const elementGenerationParams = {
    adapterName,
    paginator,
    nestedFieldFinder,
    computeGetArgs,
    additionalRequestContext,
    typesConfig: types,
    typeDefaultConfig: typeDefaults,
    getElemIdFunc,
    getEntriesResponseValuesFunc,
    reversedSupportedTypes,
  }

  const configSuggestions: ConfigChangeSuggestion[] = []
  const { elements, errors } = await getElementsWithContext({
    fetchQuery,
    supportedTypes: supportedTypesWithEndpoints,
    types,
    typeElementGetter: async args => {
      try { // TODON move all this wrapping inside?
        return {
          elements: (await getTypeAndInstances({
            ...elementGenerationParams, ...args, customInstanceFilter, objectTypes,
          })),
          errors: [],
        }
      } catch (e) { // TODON use
        if (isErrorTurnToConfigSuggestion?.(e)
          && (reversedSupportedTypes[args.typeName] !== undefined)) {
          const typesToExclude = reversedSupportedTypes[args.typeName]
          typesToExclude.forEach(type => {
            configSuggestions.push({
              type: TYPE_TO_EXCLUDE,
              value: type,
              reason: `Salto failed to fetch ${type} type`,
            })
          })
          return { elements: [], errors: [] }
        }
        if (e.response?.status === 404) {
          log.warn('Resource %s:%s returned 404: %s', adapterName, args.typeName, e)
          return { elements: [] }
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
        if (e instanceof MissingContextError) {
          log.warn('Resource %s:%s missing context: %s', adapterName, args.typeName, e)
          return { elements: [] }
        }
        throw e
      }
    },
  })
  // TODON make sure we remove orphan subtypes
  const newObjectTypes = Object.fromEntries(elements
    .filter(isType)
    .filter(e => objectTypes?.[e.elemID.name] === undefined)
    .map(e => [e.elemID.name, e]))
  const instancesAndTypes = [
    ...Object.values(objectTypes ?? {}),
    ...Object.values(newObjectTypes),
    ...elements.filter(e => isInstanceElement(e)),
  ]
  if (shouldAddRemainingTypes) {
    addRemainingTypes({
      adapterName,
      elements: instancesAndTypes,
      typesConfig: types,
      supportedTypes,
      typeDefaultConfig: typeDefaults,
    })
  }
  return {
    elements: instancesAndTypes,
    configChanges: getUniqueConfigSuggestions(configSuggestions),
    errors,
  }
}
