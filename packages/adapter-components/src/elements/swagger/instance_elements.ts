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
  InstanceElement, Values, ObjectType, isObjectType, ReferenceExpression, isReferenceExpression,
  isListType, isMapType, TypeElement, PrimitiveType, MapType, ElemIdGetter, SaltoError, isInstanceElement,
} from '@salto-io/adapter-api'
import { transformElement, TransformFunc, safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ADDITIONAL_PROPERTIES_FIELD } from './type_elements/swagger_parser'
import { InstanceCreationParams, toBasicInstance } from '../instance_elements'
import { Paginator, PageEntriesExtractor } from '../../client'
import {
  TransformationConfig, TransformationDefaultConfig,
  AdapterSwaggerApiConfig, ConfigChangeSuggestion,
} from '../../config'
import { AdapterFetchError, InvalidSingletonType } from '../../config/shared'
import { findDataField, FindNestedFieldFunc } from '../field_finder'
import { computeGetArgs as defaultComputeGetArgs, ComputeGetArgsFunc } from '../request_parameters'
import { FetchElements, getElementsWithContext } from '../element_getter'
import { ElementQuery } from '../query'
import { getTypeAndInstances, getUniqueConfigSuggestions } from '../ducktype' // TODON move to shared location

const { makeArray } = collections.array
const { awu } = collections.asynciterable
const { isPlainRecord } = lowerdashValues
const log = logger(module)

// TODON might lost performance optimizations for jira!!! check

/**
 * Extract standalone fields to their own instances, and convert the original value to a reference.
 */
const extractStandaloneFields = async (
  inst: InstanceElement,
  {
    transformationConfigByType,
    transformationDefaultConfig,
    nestedPath,
    getElemIdFunc,
  }: {
    transformationConfigByType: Record<string, TransformationConfig>
    transformationDefaultConfig: TransformationDefaultConfig
    nestedPath: string[]
    getElemIdFunc?: ElemIdGetter
  },
): Promise<InstanceElement[]> => {
  if (_.isEmpty(transformationConfigByType[inst.refType.elemID.name]?.standaloneFields)) {
    return [inst]
  }
  const additionalInstances: InstanceElement[] = []

  const replaceWithReference = async ({
    values,
    parent,
    objType,
    updatedNestedPath,
  }: {
    values: Values[]
    parent: InstanceElement
    objType: ObjectType
    updatedNestedPath: string[]
  }): Promise<ReferenceExpression[]> => {
    // eslint-disable-next-line no-use-before-define
    const refInstances = await generateInstancesForType({
      entries: values,
      objType,
      nestName: true,
      parent,
      transformationConfigByType,
      transformationDefaultConfig,
      normalized: true,
      nestedPath: updatedNestedPath,
      getElemIdFunc,
    })
    additionalInstances.push(...refInstances)
    return refInstances.map(refInst => new ReferenceExpression(refInst.elemID, refInst))
  }

  const extractFields: TransformFunc = async ({ value, field, path }) => {
    if (field === undefined) {
      return value
    }
    const parentType = field.parent.elemID.name
    const { standaloneFields } = (
      transformationConfigByType[parentType]
      ?? transformationDefaultConfig
    )
    if (standaloneFields === undefined) {
      return value
    }
    const fieldExtractionDefinition = standaloneFields.find(def => def.fieldName === field.name)

    if (fieldExtractionDefinition === undefined || isReferenceExpression(value)) {
      return value
    }

    const refOrListType = await field.getType()
    const refType = isListType(refOrListType) ? await refOrListType.getInnerType() : refOrListType
    if (!isObjectType(refType)) {
      log.error(`unexpected type encountered when extracting nested fields - skipping path ${path} for instance ${inst.elemID.getFullName()}`)
      return value
    }

    if (Array.isArray(value)) {
      return replaceWithReference({
        values: value,
        parent: inst,
        objType: refType,
        updatedNestedPath: [...nestedPath, field.name],
      })
    }
    return (await replaceWithReference({
      values: [value],
      parent: inst,
      objType: refType,
      updatedNestedPath: [...nestedPath, field.name],
    }))[0]
  }

  const updatedInst = await transformElement({
    element: inst,
    transformFunc: extractFields,
    strict: false,
  })
  return [updatedInst, ...additionalInstances]
}

const getListDeepInnerType = async (
  type: TypeElement,
): Promise<ObjectType | PrimitiveType | MapType> => {
  if (!isListType(type)) {
    return type
  }
  return getListDeepInnerType(await type.getInnerType())
}

/**
 * Normalize the element's values, by nesting swagger additionalProperties under the
 * additionalProperties field in order to align with the type.
 *
 * Note: The reverse will need to be done pre-deploy (not implemented for fetch-only)
 */
const normalizeElementValues = (instance: InstanceElement): Promise<InstanceElement> => {
  const transformAdditionalProps: TransformFunc = async ({ value, field, path }) => {
    if (!_.isPlainObject(value)) {
      return value
    }

    const fieldType = path?.isEqual(instance.elemID)
      ? await instance.getType()
      : await field?.getType()

    if (fieldType === undefined) {
      return value
    }
    const fieldInnerType = await getListDeepInnerType(fieldType)
    if (
      !isObjectType(fieldInnerType)
      || fieldInnerType.fields[ADDITIONAL_PROPERTIES_FIELD] === undefined
      || !isMapType(await fieldInnerType.fields[ADDITIONAL_PROPERTIES_FIELD].getType())
    ) {
      return value
    }

    const additionalProps = _.merge(
      _.pickBy(
        value,
        (_val, key) => !Object.keys(fieldInnerType.fields).includes(key),
      ),
      // if the value already has additional properties, give them precedence
      value[ADDITIONAL_PROPERTIES_FIELD],
    )
    return {
      ..._.omit(value, Object.keys(additionalProps)),
      [ADDITIONAL_PROPERTIES_FIELD]: additionalProps,
    }
  }

  return transformElement({
    element: instance,
    transformFunc: transformAdditionalProps,
    strict: false,
  })
}

const toInstance = async (args: InstanceCreationParams): Promise<InstanceElement> => (
  args.normalized ? toBasicInstance(args) : normalizeElementValues(await toBasicInstance(args))
)

/**
 * Generate instances for the specified types based on the entries from the API responses,
 * using the endpoint's specific config and the adapter's defaults.
 */
const generateInstancesForType = ({
  entries,
  objType,
  nestName,
  parent,
  transformationConfigByType,
  transformationDefaultConfig,
  normalized,
  nestedPath,
  getElemIdFunc,
}: {
  entries: Values[]
  objType: ObjectType
  nestName?: boolean
  parent?: InstanceElement
  transformationConfigByType: Record<string, TransformationConfig>
  transformationDefaultConfig: TransformationDefaultConfig
  normalized?: boolean
  nestedPath?: string[]
  getElemIdFunc?: ElemIdGetter
}): Promise<InstanceElement[]> => {
  const standaloneFields = transformationConfigByType[objType.elemID.name]?.standaloneFields
  return awu(entries)
    .map((entry, index) => toInstance({
      entry,
      type: objType,
      nestName,
      parent,
      transformationConfigByType,
      transformationDefaultConfig,
      normalized,
      nestedPath,
      defaultName: `unnamed_${index}`, // TODO improve
      getElemIdFunc,
    }))
    .flatMap(inst => (
      standaloneFields === undefined
        ? [inst]
        : extractStandaloneFields(inst, {
          transformationConfigByType,
          transformationDefaultConfig,
          nestedPath: [...(nestedPath ?? [objType.elemID.name]), inst.elemID.name],
          getElemIdFunc,
        })
    )).toArray()
}

// const isAdditionalPropertiesOnlyObjectType = (type: ObjectType): boolean => (
//   _.isEqual(Object.keys(type.fields), [ADDITIONAL_PROPERTIES_FIELD])
// )

// const isItemsOnlyObjectType = (type: ObjectType): boolean => (
//   _.isEqual(Object.keys(type.fields), [ARRAY_ITEMS_FIELD])
// )

// const normalizeType = async (type: ObjectType | undefined): Promise<ObjectType | undefined> => {
//   if (type !== undefined && isItemsOnlyObjectType(type)) {
//     const itemsType = await type.fields.items.getType()
//     if (isListType(itemsType) && isObjectType(await itemsType.getInnerType())) {
//       return itemsType.getInnerType() as Promise<ObjectType>
//     }
//   }
//   return type
// }

// type GetEntriesParams = {
//   typeName: string
//   paginator: Paginator
//   objectTypes: Record<string, ObjectType>
//   typesConfig: Record<string, TypeSwaggerConfig>
//   typeDefaultConfig: TypeSwaggerDefaultConfig
//   contextElements?: Record<string, InstanceElement[]>
//   requestContext?: Record<string, unknown>
//   nestedFieldFinder: FindNestedFieldFunc
//   computeGetArgs: ComputeGetArgsFunc
//   getElemIdFunc?: ElemIdGetter
//   reversedSupportedTypes: Record<string, string[]>
// }

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
  // TODON fix types to use the original ones - but need to also address additionalProperties?
  return {
    elements: elements.filter(isInstanceElement), // TODON do something smarter with the types
    configChanges: getUniqueConfigSuggestions(configSuggestions),
    errors,
  }
}
