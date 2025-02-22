/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import {
  InstanceElement,
  Values,
  ObjectType,
  isObjectType,
  ReferenceExpression,
  isReferenceExpression,
  isListType,
  ElemIdGetter,
  SaltoError,
  CORE_ANNOTATIONS,
} from '@salto-io/adapter-api'
import { TransformFunc, safeJsonStringify, transformValues, ERROR_MESSAGES } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { toBasicInstance } from '../instance_elements'
import { UnauthorizedError, Paginator, PageEntriesExtractor, HTTPError } from '../../client'
import {
  TypeSwaggerDefaultConfig,
  TransformationConfig,
  TransformationDefaultConfig,
  AdapterSwaggerApiConfig,
  TypeSwaggerConfig,
  getConfigWithDefault,
  getTransformationConfigByType,
} from '../../config_deprecated'
import { InvalidSingletonType } from '../../fetch/element/type_utils'
import { findDataField, FindNestedFieldFunc } from '../field_finder'
import { computeGetArgs as defaultComputeGetArgs, ComputeGetArgsFunc } from '../../fetch/resource/request_parameters'
import { getElementsWithContext } from '../element_getter'
import { TimeoutError } from '../../client/http_client'
import { ElementQuery } from '../../fetch/query'
import { FetchElements } from '../../fetch'
import { ARRAY_ITEMS_FIELD } from '../../openapi/type_elements/swagger_parser'
import { shouldRecurseIntoEntry } from '../../fetch/resource/subresources'

const { makeArray } = collections.array
const { toArrayAsync, awu } = collections.asynciterable
const { isPlainRecord } = lowerdashValues
const log = logger(module)

class InvalidTypeConfig extends Error {}

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
  const allInstances: InstanceElement[] = [inst]
  if (_.isEmpty(transformationConfigByType[inst.refType.elemID.name]?.standaloneFields)) {
    return allInstances
  }

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
    allInstances.push(...refInstances)
    return refInstances.map(refInst => new ReferenceExpression(refInst.elemID, refInst))
  }

  const extractFields: TransformFunc = async ({ value, field, path }) => {
    if (field === undefined) {
      return value
    }
    const parentType = field.parent.elemID.name
    const { standaloneFields } = transformationConfigByType[parentType] ?? transformationDefaultConfig
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
      log.error(
        `unexpected type encountered when extracting nested fields - skipping path ${path} for instance ${inst.elemID.getFullName()}`,
      )
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
    return (
      await replaceWithReference({
        values: [value],
        parent: inst,
        objType: refType,
        updatedNestedPath: [...nestedPath, field.name],
      })
    )[0]
  }
  inst.value =
    (await transformValues({
      transformFunc: extractFields,
      type: await inst.getType(),
      values: inst.value,
      strict: false,
    })) ?? inst.value
  return allInstances
}

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
    .map((entry, index) =>
      toBasicInstance({
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
      }),
    )
    .flatMap(inst =>
      standaloneFields === undefined
        ? [inst]
        : extractStandaloneFields(inst, {
            transformationConfigByType,
            transformationDefaultConfig,
            nestedPath: [...(nestedPath ?? [objType.elemID.name]), inst.elemID.name],
            getElemIdFunc,
          }),
    )
    .toArray()
}

const isAdditionalPropertiesOnlyObjectType = (type: ObjectType): boolean =>
  _.isEmpty(type.fields) && type.annotations[CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES] !== false

const isItemsOnlyObjectType = (type: ObjectType): boolean => _.isEqual(Object.keys(type.fields), [ARRAY_ITEMS_FIELD])

const normalizeType = async (type: ObjectType | undefined): Promise<ObjectType | undefined> => {
  if (type !== undefined && isItemsOnlyObjectType(type)) {
    const itemsType = await type.fields.items.getType()
    if (isListType(itemsType) && isObjectType(await itemsType.getInnerType())) {
      return itemsType.getInnerType() as Promise<ObjectType>
    }
  }
  return type
}

type GetEntriesParams = {
  typeName: string
  paginator: Paginator
  objectTypes: Record<string, ObjectType>
  typesConfig: Record<string, TypeSwaggerConfig>
  typeDefaultConfig: TypeSwaggerDefaultConfig
  contextElements?: Record<string, InstanceElement[]>
  requestContext?: Record<string, unknown>
  nestedFieldFinder: FindNestedFieldFunc
  computeGetArgs: ComputeGetArgsFunc
  getElemIdFunc?: ElemIdGetter
  reversedSupportedTypes: Record<string, string[]>
}

export const extractPageEntriesByNestedField =
  (fieldName?: string): PageEntriesExtractor =>
  page => {
    const allEntries = fieldName !== undefined ? makeArray(_.get(page, fieldName)) : makeArray(page)
    const [validEntries, invalidEntries] = _.partition(allEntries, isPlainRecord)
    if (invalidEntries.length > 0) {
      log.error('omitted %d invalid entries: %s', invalidEntries.length, safeJsonStringify(invalidEntries))
    }
    return validEntries
  }

const getEntriesForType = async (params: GetEntriesParams): Promise<{ entries: Values[]; objType: ObjectType }> => {
  const {
    typeName,
    paginator,
    typesConfig,
    typeDefaultConfig,
    objectTypes,
    contextElements,
    requestContext,
    nestedFieldFinder,
    computeGetArgs,
    reversedSupportedTypes,
  } = params
  const type = await normalizeType(objectTypes[typeName])
  const typeConfig = typesConfig[typeName]
  if (type === undefined || typeConfig === undefined) {
    // should never happen
    throw new InvalidTypeConfig(`could not find type ${typeName}`)
  }
  const { request, transformation } = typeConfig
  if (request === undefined) {
    // a type with no request config cannot be fetched
    throw new InvalidTypeConfig(`Invalid type config - type ${type.elemID.adapter}.${typeName} has no request config`)
  }

  const { fieldsToOmit, dataField } = getConfigWithDefault(transformation, typeDefaultConfig.transformation)
  const requestWithDefaults = getConfigWithDefault(request, typeDefaultConfig.request ?? {})

  const nestedFieldDetails = await nestedFieldFinder(type, fieldsToOmit, dataField)

  const getType = async (): Promise<{ objType: ObjectType; extractValues?: boolean }> => {
    if (nestedFieldDetails === undefined) {
      return {
        objType: type,
      }
    }

    const dataFieldType = await nestedFieldDetails.field.getType()

    // special case - should probably move to adapter-specific filter if does not recur
    if (dataField !== undefined && isObjectType(dataFieldType) && isAdditionalPropertiesOnlyObjectType(dataFieldType)) {
      const propsType = dataFieldType.annotations[CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]?.refType?.value
      if (isObjectType(propsType)) {
        return {
          objType: propsType,
          extractValues: true,
        }
      }
    }

    const fieldType = isListType(dataFieldType) ? await dataFieldType.getInnerType() : dataFieldType
    if (!isObjectType(fieldType)) {
      throw new Error(`data field type ${fieldType.elemID.getFullName()} must be an object type`)
    }
    return { objType: fieldType }
  }

  const { objType, extractValues } = await getType()

  const getEntries = async (): Promise<Values[]> => {
    const args = computeGetArgs(requestWithDefaults, contextElements, requestContext, reversedSupportedTypes)

    const results = (
      await Promise.all(
        args.map(async getArgs =>
          (
            await toArrayAsync(paginator(getArgs, extractPageEntriesByNestedField(nestedFieldDetails?.field.name)))
          ).flat(),
        ),
      )
    ).flatMap(makeArray)

    const entries = results.flatMap(result =>
      extractValues && _.isPlainObject(result) ? Object.values(result as object) : makeArray(result),
    )

    return entries
  }

  const entries = await getEntries()

  const { recurseInto } = requestWithDefaults
  if (recurseInto === undefined) {
    return { entries, objType }
  }

  const getExtraFieldValues = async (entry: Values): Promise<[string, Values | Values[]][]> =>
    (
      await Promise.all(
        recurseInto
          .filter(({ conditions }) => shouldRecurseIntoEntry(entry, requestContext, conditions))
          .map(async nested => {
            const nestedRequestContext = Object.fromEntries(
              nested.context.map(contextDef => [contextDef.name, _.get(entry, contextDef.fromField)]),
            )
            try {
              const { entries: nestedEntries } = await getEntriesForType({
                ...params,
                typeName: nested.type,
                requestContext: {
                  ...(requestContext ?? {}),
                  ...nestedRequestContext,
                },
              })
              if (nested.isSingle) {
                if (nestedEntries.length === 1) {
                  return [nested.toField, nestedEntries[0]] as [string, Values]
                }
                log.warn(
                  `Expected a single value in recurseInto result for ${typeName}.${nested.toField} but received: ${nestedEntries.length}, keeping as list`,
                )
              }
              return [nested.toField, nestedEntries] as [string, Values[]]
            } catch (error) {
              if (nested.skipOnError) {
                log.info(
                  `Failed getting extra field values for field ${nested.toField} in ${typeName} entry: ${safeJsonStringify(entry)}, and the field will be omitted. Error: ${error.message}`,
                )
                return undefined
              }
              log.warn(
                `Failed getting extra field values for field ${nested.toField} in ${typeName} entry: ${safeJsonStringify(entry)}, not creating instance. Error: ${error.message}`,
              )
              throw error
            }
          }),
      )
    ).filter(lowerdashValues.isDefined)

  const filledEntries = (
    await Promise.all(
      entries.map(async entry => {
        try {
          const extraFields = await getExtraFieldValues(entry)
          return { ...entry, ...Object.fromEntries(extraFields) }
        } catch {
          // We already write a log in getExtraFieldValues
          return undefined
        }
      }),
    )
  ).filter(lowerdashValues.isDefined)

  return { entries: filledEntries, objType }
}

/**
 * Fetch all instances for the specified type, generating the needed API requests
 * based on the endpoint configuration. For endpoints that depend on other endpoints,
 * use the already-fetched elements as context in order to determine the right requests.
 */
const getInstancesForType = async (params: GetEntriesParams): Promise<InstanceElement[]> => {
  const { typeName, typesConfig, typeDefaultConfig, getElemIdFunc } = params
  const transformationConfigByType = getTransformationConfigByType(typesConfig)
  const transformationDefaultConfig = typeDefaultConfig.transformation
  try {
    const { entries, objType } = await getEntriesForType(params)
    if (objType.isSettings && entries.length > 1) {
      log.warn(`Expected one instance for singleton type: ${typeName} but received: ${entries.length}`)
      throw new InvalidSingletonType(
        `Could not fetch type ${typeName}, singleton types should not have more than one instance`,
      )
    }
    return await generateInstancesForType({
      entries,
      objType,
      transformationConfigByType,
      transformationDefaultConfig,
      getElemIdFunc,
    })
  } catch (e) {
    log.warn(`Could not fetch ${typeName}: ${e}. %s`, e.stack)
    if (
      e instanceof UnauthorizedError ||
      e instanceof InvalidTypeConfig ||
      e instanceof TimeoutError ||
      e instanceof InvalidSingletonType ||
      (e instanceof HTTPError && (e.response.status === 403 || e.response.status === 401))
    ) {
      throw e
    }
    return []
  }
}

/**
 * Get all instances from all types included in the fetch configuration.
 */
export const getAllInstances = async ({
  paginator,
  apiConfig,
  fetchQuery,
  supportedTypes,
  objectTypes,
  nestedFieldFinder = findDataField,
  computeGetArgs = defaultComputeGetArgs,
  getElemIdFunc,
}: {
  paginator: Paginator
  apiConfig: Pick<AdapterSwaggerApiConfig, 'types' | 'typeDefaults'>
  fetchQuery: Pick<ElementQuery, 'isTypeMatch'>
  supportedTypes: Record<string, string[]>
  objectTypes: Record<string, ObjectType>
  nestedFieldFinder?: FindNestedFieldFunc
  computeGetArgs?: ComputeGetArgsFunc
  getElemIdFunc?: ElemIdGetter
}): Promise<FetchElements<InstanceElement[]>> => {
  const { types, typeDefaults } = apiConfig

  const reversedSupportedTypes = _(
    Object.entries(supportedTypes).flatMap(([typeName, wrapperTypes]) =>
      wrapperTypes.map(wrapperType => ({ wrapperType, typeName })),
    ),
  )
    .groupBy(entry => entry.wrapperType)
    .mapValues(typeEntry => typeEntry.map(value => value.typeName))
    .value()

  const elementGenerationParams = {
    paginator,
    typesConfig: types,
    objectTypes,
    typeDefaultConfig: typeDefaults,
    nestedFieldFinder,
    computeGetArgs,
    getElemIdFunc,
    reversedSupportedTypes,
  }

  return getElementsWithContext<InstanceElement>({
    fetchQuery,
    types: apiConfig.types,
    supportedTypes,
    typeElementGetter: async args => {
      try {
        return {
          elements: await getInstancesForType({ ...elementGenerationParams, ...args }),
          errors: [],
        }
      } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 401) {
          const newError: SaltoError = {
            message: ERROR_MESSAGES.OTHER_ISSUES,
            detailedMessage: `Salto could not access the ${args.typeName} resource. Elements from that type were not fetched. Please make sure that this type is enabled in your service, and that the supplied user credentials have sufficient permissions to access this data. You can also exclude this data from Salto's fetches by changing the environment configuration. Learn more at https://help.salto.io/en/articles/6947061-salto-could-not-access-the-resource`,
            severity: 'Warning',
          }
          return { elements: [], errors: [newError] }
        }
        if (e instanceof InvalidSingletonType) {
          return {
            elements: [],
            errors: [{ message: ERROR_MESSAGES.OTHER_ISSUES, detailedMessage: e.message, severity: 'Warning' }],
          }
        }
        throw e
      }
    },
  })
}
