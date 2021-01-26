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
import { Element, ObjectType, Field, isListType, isObjectType, Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ClientGetParams, HTTPClientInterface } from '../../client'
import { EndpointConfig } from '../../config'
import { naclCase } from '../../nacl_case_utils'
import { generateType, addGetEndpointAnnotations } from './type_elements'
import { toInstance } from './instance_elements'

const { makeArray } = collections.array
const { isDefined } = lowerdashValues
const log = logger(module)

export type FindNestedFieldFunc = (type: ObjectType, fieldsToIgnore?: string[]) => {
  field: Field
  type: ObjectType
} | undefined

export const findNestedField: FindNestedFieldFunc = (type, fieldsToIgnore) => {
  const excludedFields = new Set(fieldsToIgnore ?? [])
  const potentialFields = (Object.values(type.fields)
    .filter(field => !excludedFields.has(field.name)))

  if (potentialFields.length > 1) {
    log.info('found more than one nested field for type %s: %s, extracting full entry',
      type.elemID.name, potentialFields.map(f => f.name))
    return undefined
  }
  if (potentialFields.length === 0) {
    log.info('could not find nested fields for type %s, extracting full entry',
      type.elemID.name)
    return undefined
  }
  const nestedField = potentialFields[0]
  const nestedType = (isListType(nestedField.type)
    ? nestedField.type.innerType
    : nestedField.type)

  if (!isObjectType(nestedType)) {
    log.info('unexpected field type for type %s field %s (%s), extracting full entry',
      type.elemID.name, nestedField.name, nestedType.elemID.getFullName())
    return undefined
  }

  return {
    field: nestedField,
    type: nestedType,
  }
}

type ComputeGetArgsFunc = (
  endpoint: EndpointConfig,
  contextElements?: Record<string, Element[]>,
) => ClientGetParams[]

export const simpleGetArgs: ComputeGetArgsFunc = (
  {
    endpoint,
    queryParams,
    recursiveQueryByResponseField,
    paginationField,
  },
) => {
  const recursiveQueryArgs = _.mapValues(
    recursiveQueryByResponseField,
    val => ((entry: Values): string => entry[val])
  )
  return [{ endpointName: endpoint, queryArgs: queryParams, recursiveQueryArgs, paginationField }]
}

export type TypeNameFunc = (endpointName: string) => string

export const getTypeAndInstances = async ({
  adapterName,
  client,
  endpointToTypeName,
  nestedFieldFinder,
  computeGetArgs,
  endpointConf,
  defaultNameField,
  defaultPathField,
  topLevelFieldsToOmit,
  contextElements,
}: {
  adapterName: string
  client: HTTPClientInterface
  endpointToTypeName: TypeNameFunc
  nestedFieldFinder: FindNestedFieldFunc
  computeGetArgs: ComputeGetArgsFunc
  endpointConf: EndpointConfig // TODON split into two?
  defaultNameField: string
  defaultPathField: string
  topLevelFieldsToOmit?: string[]
  contextElements?: Record<string, Element[]>
}): Promise<Element[]> => {
  const {
    endpoint, fieldsToOmit, hasDynamicFields, nameField, pathField, keepOriginal,
  } = endpointConf

  const getEntries = async (): Promise<Values[]> => {
    const getArgs = computeGetArgs(endpointConf, contextElements)
    // TODO add error handling
    return (await Promise.all(
      getArgs.map(args => client.get(args))
    )).flatMap(r => r.result.map(entry =>
      (fieldsToOmit !== undefined
        ? _.omit(entry, fieldsToOmit)
        : entry
      )))
  }

  const entries = await getEntries()

  // escape "field" names with '.'
  // TODON instead handle in filter? (not sure if "." is consistent enough for actual nesting)
  const naclEntries = entries.map(e => _.mapKeys(e, (_val, key) => naclCase(key)))

  // endpoints with dynamic fields will be associated with the dynamic_keys type

  const { type, nestedTypes } = generateType({
    adapterName,
    name: endpointToTypeName(endpoint),
    entries: naclEntries,
    hasDynamicFields: hasDynamicFields === true,
  })
  const nestedFieldDetails = nestedFieldFinder(type, topLevelFieldsToOmit)
  addGetEndpointAnnotations(type, endpoint, nestedFieldDetails?.field.name)

  const instances = naclEntries.flatMap((entry, index) => {
    if (nestedFieldDetails !== undefined && !keepOriginal) {
      return makeArray(entry[nestedFieldDetails.field.name]).flatMap(
        (nestedEntry, nesteIndex) => toInstance({
          adapterName,
          entry: nestedEntry,
          type: nestedFieldDetails.type,
          nameField: nameField ?? defaultNameField,
          pathField: pathField ?? defaultPathField,
          defaultName: `inst_${index}_${nesteIndex}`, // TODON improve
          fieldsToOmit,
          hasDynamicFields,
        })
      ).filter(isDefined)
    }

    log.info(`storing full entry for ${type.elemID.name}`)
    return toInstance({
      adapterName,
      entry,
      type,
      nameField: nameField ?? defaultNameField,
      pathField: pathField ?? defaultPathField,
      defaultName: `inst_${index}`, // TODON improve
      // we only omit the pagination fields at the top level
      fieldsToOmit: [...(topLevelFieldsToOmit ?? []), ...(fieldsToOmit ?? [])],
      hasDynamicFields,
    })
  })
  return [type, ...nestedTypes, ...instances].filter(isDefined)
}
