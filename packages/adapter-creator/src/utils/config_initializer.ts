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
import _, { toLower } from 'lodash'
import { Element, isObjectType } from '@salto-io/adapter-api'
import { config as configUtils, elements as elementUtils } from '@salto-io/adapter-components'
import { prettifyWord, safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { values as lowerdashValues, promises } from '@salto-io/lowerdash'

const { DATA_FIELD_ENTIRE_OBJECT } = configUtils
const { findDataField, findUnresolvedArgs } = elementUtils
const { isDefined } = lowerdashValues
const { mapValuesAsync } = promises.object
const log = logger(module)

const argNamePartsLower = (argName: string): string[] => (
  argName.replace('_', ' ').split(' ').flatMap(prettifyWord)
    .filter(x => x.length > 0)
    .map(toLower)
)

type ArgSource = {
  typeName: string
  fieldName: string
  isSelfReference?: boolean
}
type EndpointDef = {
  url: string
  args: Record<string, ArgSource>
}

export const analyzeConfig = async ({
  elements,
  extendedApiConfig,
}: {
  adapterName: string
  elements: Element[]
  extendedApiConfig: configUtils.AdapterApiConfig
}): Promise<void> => {
  log.debug('--- config initialization suggestions block ---')
  const allTypes = _.keyBy(elements.filter(isObjectType), e => e.elemID.typeName)
  const { types: typeConfig, typeDefaults: typeDefaultConfig } = extendedApiConfig
  const defaultDataField = typeDefaultConfig.transformation.dataField
  const requestableTypes = _.pickBy(typeConfig, ({ request }) => request?.url !== undefined)

  // suggested supportedTypes mapping
  // TODON instead of assuming findDataField, choose based on the nestedFieldFinder passed into getAllElements
  const typeToDataField = await mapValuesAsync(
    allTypes,
    async (type, typeName) => (await findDataField(
      type,
      undefined, // fieldsToOmit were already omitted
      typeConfig[typeName]?.transformation?.dataField ?? defaultDataField,
    )) ?? { field: undefined, type },
  )

  const supportedTypes = _( // TODON suffix - e.g. ApplicationRep
    Object.entries(typeToDataField)
      .filter(([parent]) => typeConfig[parent]?.request?.url !== undefined)
      .filter(([parent, child]) => (
        child.type.elemID.typeName !== parent
        || extendedApiConfig.types[parent].transformation?.isSingleton === true))
      .map(([parent, child]) => ({ child: child.type.elemID.typeName, parent }))
  )
    .groupBy(({ child }) => child)
    .mapValues(values => values.flatMap(val => val.parent))
    .value()
  // log.info('supportedTypes: %s', safeJsonStringify(supportedTypes))

  // explicit data fields
  const fullDataFieldMapping = _.mapValues(typeToDataField, val => val.field?.elemID.name ?? DATA_FIELD_ENTIRE_OBJECT)
  const dataFieldMapping = _.pickBy(
    fullDataFieldMapping,
    (fieldName, typeName) => requestableTypes[typeName] !== undefined && fieldName !== defaultDataField
  )
  // log.info('data fields (requestable, non-default): %s', safeJsonStringify(dataFieldMapping))

  // suggestions from heuristics for recurseInto
  // TODON improve heuristics to cover more cases, handle conflicts due to case-sensitive naming?
  // const urlToType: Record<string, string> = Object.fromEntries(
  //   Object.entries(requestableTypes).map(([typeName, conf]) => [conf.request?.url, typeName])
  // )
  const contextToType = _(
    Object.entries(requestableTypes).map(([typeName, conf]) => ({ args: findUnresolvedArgs(conf.request?.url ?? ''), typeName }))
  )
    .groupBy(({ args }: { args: string[] }) => args.sort().join(','))
    .mapValues(values => values.flatMap(val => val.typeName))
    .value()
  const typeToArgNames = _(requestableTypes)
    .mapValues(({ request }) => ({
      url: request?.url ?? '',
      args: findUnresolvedArgs(request?.url ?? ''),
    }))
    // .pickBy(({ args }) => args.length !== 0)
    .pickBy(isDefined)
    .value()

  const typeAndFieldLowercase = _(allTypes)
    .mapKeys((_typeDef, typeName) => typeName.toLowerCase())
    // TODON only keep primitive fields?
    .mapValues(typeDef => ({
      typeName: typeDef.elemID.typeName,
      // TODON also strip _ (underscore) prefix/suffix
      fieldNames: Object.fromEntries(Object.keys(typeDef.fields).map(f => [_.trim(f, '_').toLowerCase(), f])),
    }))
    .value()

  const potentialMatches: Record<string, EndpointDef> = _(typeToArgNames)
    // .pickBy(isDefined)
    .mapValues(({ args, url }, targetTypeName) => ({
      url,
      args: Object.fromEntries(args.map(arg => {
        const findMatch = (): Partial<ArgSource> => {
          const lowercaseArgParts = argNamePartsLower(arg)
          const partPotentialMatches = _.rangeRight(0, lowercaseArgParts.length).map(i => {
            const typeNameLower = lowercaseArgParts.slice(0, i).join('') || targetTypeName.toLowerCase()
            const fieldNameLower = lowercaseArgParts.slice(i).join('')
            const { typeName, fieldNames } = typeAndFieldLowercase[typeNameLower] ?? {}
            const fieldName = fieldNames?.[fieldNameLower]
            if (i === 0 && fieldName === undefined) {
              return {
                typeName: undefined,
                fieldName: undefined,
              }
            }
            return {
              typeName,
              fieldName,
              ...(typeName === targetTypeName ? { isSelfReference: true } : {}),
            }
          })
          return (partPotentialMatches.find(res => res.fieldName !== undefined)
            ?? partPotentialMatches.find(res => res.typeName !== undefined)
            ?? {})
        }
        const bestMatch = _.defaults({}, findMatch(), {
          typeName: 'FIX_OR_REMOVE',
          fieldName: 'FIX_OR_REMOVE',
        })
        return [arg, bestMatch]
      })),
    }))
    .value()

  // log.info('potentialMatches: %s', safeJsonStringify(potentialMatches))

  const typeToParentAndArgs = _(potentialMatches) // TODON should be by context, not by url
    .mapValues((def, typeName) => {
      const sortedArgs = Object.keys(def.args) // TODON make sure remains sorted, add smarter subsets
      if (sortedArgs.length === 0) {
        return def
      }
      const nearestParent = _.range(0, sortedArgs.length).map(i => {
        const parentArgs = sortedArgs.slice(0, i)
        const potentialParents = contextToType[parentArgs.sort().join(',')]?.filter(parent => parent !== typeName)
        if (potentialParents === undefined) {
          return undefined
        }
        const remainingArgs: Record<string, ArgSource> = _.omit(def.args, parentArgs)
        const remainingArgsParentTypes = _.uniq(Object.values(remainingArgs).map(arg => arg.typeName))
        if (remainingArgsParentTypes.length === 0) {
          // prefer parent directly related to the args
          return { validParents: _.sortBy(potentialParents, parent => [
            // TODON go through supportedTypes as well!
            !(
              Object.values(def.args).map(arg => arg.typeName).includes(parent)),
          ]) }
        }
        if (remainingArgsParentTypes.length === 1) {
          const requiredParent = remainingArgsParentTypes[0]
          const parentSupportedTypes = new Set(supportedTypes[requiredParent] ?? [])
          if (potentialParents.some(parent => parentSupportedTypes.has(parent))) {
            return { validParents: [requiredParent] }
          }
        }
        return undefined
        // TODON log other cases, suggest dependsOn?
      }).find(isDefined)
      return {
        ...def,
        ...(nearestParent ?? {}),
      }
    })
    .value()

  const hasSelfRefArg = (endpointDef: EndpointDef): boolean => (
    Object.values(endpointDef.args).some((argSource => argSource.isSelfReference))
  )
  const dependentTypeToParentAndArgs = _.pickBy(typeToParentAndArgs, ({ args }) => !_.isEmpty(args))
  const potentialMatchesNoSelfRef = _.omitBy(dependentTypeToParentAndArgs, hasSelfRefArg)
  const potentialMatchesWithSelfRef = _.pickBy(dependentTypeToParentAndArgs, hasSelfRefArg)

  log.info('--- config input for review: %s', safeJsonStringify({
    potentialMatchesNoSelfRef,
    supportedTypes,
    dataFieldMapping,
    potentialMatchesWithSelfRef, // probably not useful?
  }))
  // TODON generate config blocks - based on supported types to find parent
  // + standalone fields, and fieldTypeOverrides based on reversed supported-types to find child to override

  // TODON:
  // suggestions from heursitics for dataField
  // suggestions from heuristics for idFields uniqueness??
  // suggestions for standaloneFields?
  // suggestions for fieldTypeOverrides / inconsistencies with swagger doc?
  // suggestions for paginationFields and strategy?
  // suggestions for reference rules
  // then - a combination of all together as the current config (which will change)?
  // or use a helper script after comments?
  // log.info('')
  // log.debug('--- config initialization suggestions block done ---')
  // TODON have option to turn into change suggestion?
}
