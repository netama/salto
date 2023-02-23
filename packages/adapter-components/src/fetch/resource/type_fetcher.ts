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
import objectHash from 'object-hash'
import stableStringify from 'json-stable-stringify'
import { Values, isPrimitiveValue } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ElementQuery } from '../query'
// TODON move to types.ts so can define in a better place?
import { Requester } from '../request/requester'
import { TypeResourceFetcher, ValueGeneratedItem } from '../types'
import { HTTPEndpointIdentifier } from '../../definitions/system'
import { GeneratedItem } from '../../definitions/system/shared'
import { DependsOnDefinition, FetchResourceDefinition } from '../../definitions/system/fetch/resource'
import { computeArgCombinations } from './request_parameters'
import { findUnresolvedArgs } from '../../elements' // TODON move
import { recurseIntoSubresources } from './subresources'
import { createValueTransformer, ARG_PLACEHOLDER_MATCHER } from '../utils'

const log = logger(module)

// type name -> identifier -> value
// export type ResourceAggregator = {
//   // process an incoming fragment and aggregate under the specified identifier
//   process: (fragment: IdentifiedItem) => void
//   // wait until all requests related to the specified type have completed
//   waitForResourcesOfType(typeName: string): Promise<void>
//   // TODON improve to make this return partial errors as the return value
//   getAllResources: (query: ElementQuery, typeName?: string) => FetchItemGenerator
// }

// const findDependencies = (context: ContextWithDependencies): (() => ContextParams[]) => {
//   const dependsOnContext = Object.values(context).filter(isDependsOnDefinition).map(def => def.typeName)
//   return () => []
// }

// TODON move to new location
export const replaceParams = (origValue: string, paramValues: Record<string, unknown>): string => (
  origValue.replace(
    ARG_PLACEHOLDER_MATCHER,
    val => {
      // TODON changed to _.get - make sure doesn't break anything
      const replacement = _.get(paramValues, val.slice(1, -1)) ?? val
      if (!isPrimitiveValue(replacement)) {
        throw new Error(`Cannot replace param ${val} in ${origValue} with non-primitive value ${replacement}`)
      }
      return replacement.toString()
    }
  )
)

// TODON move
export const serviceIdCreator = (
  serviceIdFields: string[], typeName: string,
): (
  (entry: Values) => string
) => entry => (
  stableStringify({
    typeName,
    ids: _.pick(entry, serviceIdFields),
  })
)

// TODON adjust to customizer later
const calculateContextArgs = ({ contextDef, initialRequestContext, availableResources }: {
  contextDef?: FetchResourceDefinition['context']
  initialRequestContext?: Record<string, unknown>
  availableResources: Record<string, ValueGeneratedItem[] | undefined>
}): Record<string, unknown[]> => {
  // initial args take precedence over hardcoded args if there's a conflict
  const { dependsOn, hardcoded } = contextDef ?? {}
  const predefinedArgs = _.mapValues(
    _.defaults(
      {},
      initialRequestContext ?? {},
      hardcoded ?? {},
    ),
    collections.array.makeArray,
  )

  const remainingDependsOnArgs: Record<string, DependsOnDefinition> = _.omit(dependsOn, Object.keys(predefinedArgs))

  return _.defaults(
    {},
    predefinedArgs,
    _(remainingDependsOnArgs)
      .mapValues(arg => (availableResources[arg.parentTypeName]
        ?.flatMap(item =>
          createValueTransformer<{}, Values>(arg.transformValue)({
            typeName: arg.parentTypeName,
            value: { ...item.value, ...item.context },
            context: item.context, // TODON duplicate data, simplify
          }))
        .filter(lowerdashValues.isDefined)
      ))
      .pickBy(lowerdashValues.isDefined)
      .mapValues(values => _.uniqBy(values, objectHash)) // TODON make sure safe, can also use stableStringify
      .value(),
  )
  // TODON if there are required args that were not covered, fail? (need to define which args are required for that...)
}

export const createTypeResourceFetcher = ({
  adapterName,
  typeName,
  defs,
  typeToEndpoints,
  query,
  requester,
  initialRequestContext,
}: {
  adapterName: string
  typeName: string
  defs: Record<string, FetchResourceDefinition>
  typeToEndpoints: Record<string, HTTPEndpointIdentifier[]>
  query: ElementQuery
  requester: Requester
  initialRequestContext?: Record<string, unknown>
}): TypeResourceFetcher | undefined => {
  if (!query.isTypeMatch(typeName)) {
    log.info('[%s] type %s does not match query, skipping it and all its dependencies', adapterName, typeName)
    return undefined // getEmptyTypeResourceFetcher()
  }
  const endpoints = typeToEndpoints[typeName] ?? []

  let done = false
  const items: GeneratedItem[] = []

  const getItems: TypeResourceFetcher['getItems'] = () => {
    if (!done) {
      return undefined
    }
    // TODON if a more accurate type guard exists, use it and cast?
    const validItems = _.filter(items, item => lowerdashValues.isPlainObject(item.value)) as ValueGeneratedItem[]
    if (validItems.length < items.length) {
      // TODON add better logging
      log.warn('[%s] omitted %d items of type %s that did not match the value guard', adapterName, items.length - validItems.length, typeName)
    }

    return validItems
  }

  const fetch: TypeResourceFetcher['fetch'] = async ({ availableResources, typeFetcherCreator }) => {
    // TODON allow customizing!
    const def = defs[typeName]
    // TODON support customizing in each part
    const contextPossibleArgs = calculateContextArgs({
      contextDef: def.context,
      initialRequestContext,
      availableResources,
    })
    try {
      const itemsWithContext = (await Promise.all(endpoints.map(endpoint => {
        const allArgs = findUnresolvedArgs(endpoint.path) // TODON get from all parts of the definition!
        const relevantArgRoots = _.uniq(allArgs.map(arg => arg.split('.')[0]).filter(arg => arg.length > 0)) // TODON move
        const contexts = computeArgCombinations(contextPossibleArgs, relevantArgRoots)
        return requester.request({
          endpointIdentifier: endpoint,
          contexts,
          callerIdentifier: {
            typeName,
          },
        })
      }))).flat()

      // TODOM make sure these are _all_ generated items, not only the ones relevant for this type -
      // and pass the others to the other "waiting" resource managers.
      // in current approach, should only pass "top-level" ones - but if we do flatten the graph,
      // then these can identify any resource - if the context has the "caller" id,
      // then the combined id is an array and we can use a trie?

      const recurseIntoFetcher = recurseIntoSubresources({ def, typeFetcherCreator, availableResources })

      const allFragments = await Promise.all(itemsWithContext.map(async item => {
        const nestedResources = await recurseIntoFetcher(item)
        const fieldValues = Object.entries(nestedResources).map(([fieldName, fieldItems]) => ({
          [fieldName]: fieldItems.map(({ value }) => value),
        }))
        return {
          ...item,
          value: _.defaults({}, item.value, ...fieldValues),
          context: item.context,
        }
      }))
      const toServiceID = serviceIdCreator(def.serviceIDFields ?? [], typeName)
      const groupedFragments = _.groupBy(allFragments, ({ value }) => toServiceID(value))
      // TODON recursively merge arrays?
      const mergedFragments = _(groupedFragments)
        .mapValues(fragments => ({
          typeName,
          // concat arrays
          value: _.mergeWith({}, ...fragments.map(fragment => fragment.value), (first: unknown, second: unknown) => (
            (Array.isArray(first) && Array.isArray(second))
              ? first.concat(second)
              : undefined
          )),
          context: {
            fragments,
          },
        }))
        .mapValues(item => collections.array.makeArray(
          createValueTransformer<{ fragments: GeneratedItem[] }, Values>(def.mergeAndTransform)(item)
        ))
        .value()

      Object.values(mergedFragments).flat().forEach(item => items.push(item))
      done = true
      return {
        success: true,
      }
    } catch (e) {
      log.error('[%s] Error caught while fetching %s: %s. stack: %s', adapterName, typeName, e, (e as Error).stack)
      done = true
      if (_.isError(e)) {
        return {
          success: false,
          // TODON fix error type
          errors: [e], // TODON instead aggregate errors from all calls?
        }
      }
      return {
        success: false,
        errors: [new Error(String(e))], // TODON
      }
    }
  }

  // TODON for now value filtering is in the instance generator, see if can move to earlier by adding isResourceMatch
  return {
    fetch,
    done: () => done,
    getItems,
  }
}
