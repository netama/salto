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
import objectHash from 'object-hash'
import stableStringify from 'json-stable-stringify'
import { logger } from '@salto-io/logging'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { ContextWithDependencies, isDependsOnDefinition } from '../../definitions/system/fetch'
import { ElementQuery } from '../query'
// TODON move to types.ts so can define in a better place?
import { Requester } from '../requester'
import { TypeResourceFetcher } from '../types'
import { HTTPEndpointIdentifier } from 'src/definitions'
import { GeneratedItem } from 'src/definitions/system/shared'
import { FetchResourceDefinition } from 'src/definitions/system/fetch/resource'
import { computeArgCombinations } from './request_parameters'
import { findUnresolvedArgs } from 'src/elements'
import { Values, isPrimitiveValue } from '@salto-io/adapter-api'
import { recurseIntoSubresources } from './subresources'

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

const getEmptyTypeResourceFetcher = (): TypeResourceFetcher => ({
  fetch: async () => ({ success: true }),
  done: () => true,
  getItems: () => [],
})

export const ARG_PLACEHOLDER_MATCHER = /\{([\w_]+)\}/g

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
): ((entry: Values) => string) => entry => (
  stableStringify({
    typeName,
    ids: _.pick(entry, serviceIdFields),
  })
)

// TODON adjust to customizer later
const calculateContextArgs = ({ args, initialRequestContext, availableResources }: {
  args: ContextWithDependencies['args'] | undefined,
  initialRequestContext?: Record<string, unknown>
  availableResources: Record<string, GeneratedItem[] | undefined>
}): Record<string, unknown[]> => {
  const predefinedArgs = _.mapValues(initialRequestContext ?? {}, collections.array.makeArray)
  if (args === undefined) {
    // make a single request for the empty context
    return predefinedArgs
  }

  const remainingArgs: ContextWithDependencies['args'] = _.omit(args, Object.keys(predefinedArgs))

  return _.defaults(
    {},
    predefinedArgs,
    _(remainingArgs)
      .mapValues(arg => isDependsOnDefinition(arg)
        ? availableResources[arg.typeName]?.map(item => _.pick({ ...item.value, ...item.context }, arg.fieldName))
        : collections.array.makeArray(arg.value))
      .pickBy(lowerdashValues.isDefined)
      .mapValues(values => _.uniqBy(values, objectHash)) // TODON make sure safe, can also use stableStringify
      .value(),
  )
  // TODON if there are required args that were not covered, fail? (need to define which args are required for that...)
}

export const createTypeResourceFetcher = ({
  adapterName,
  accountName,
  typeName,
  defs,
  typeToEndpoints,
  query,
  requester,
  initialRequestContext,
}: {
  adapterName: string
  accountName: string
  typeName: string
  defs: Record<string, FetchResourceDefinition>
  typeToEndpoints: Record<string, HTTPEndpointIdentifier[]>
  query: ElementQuery
  requester: Requester
  initialRequestContext?: Record<string, unknown>
}): TypeResourceFetcher => {
  if (!query.isTypeMatch(typeName)) {
    log.info('type %s does not match query, skipping it and all its dependencies', typeName)
    return getEmptyTypeResourceFetcher()
  }
  const endpoints = typeToEndpoints[typeName]
  if (endpoints === undefined) {
    log.error('no endpoints found for type %s (account %s adapter %s), not fetching type', typeName, accountName, adapterName)
    return getEmptyTypeResourceFetcher()
  }

  let done = false
  const items: GeneratedItem[] = []

  const getItems: TypeResourceFetcher['getItems'] = () => {
    if (!done) {
      return undefined
    }
    return items
  }

  const fetch: TypeResourceFetcher['fetch'] = async ({ availableResources, typeFetcherCreator }) => {
    // TODON allow customizing!
    const def = defs[typeName]
    const resourceContext = def.context
    const contextPossibleArgs = (resourceContext?.custom?.(resourceContext.args) ?? calculateContextArgs)({
      args: resourceContext?.args,
      initialRequestContext,
      availableResources,
    })
    try {
      const itemsWithContext = (await Promise.all(endpoints.map(endpoint => {
        const allArgs = findUnresolvedArgs(endpoint.path) // TODON get from all parts of the definition!
        const relevantArgRoots = _.uniq(allArgs.map(arg => arg.split('.')[0]).filter(arg => arg.length > 0)) // TODON move
        const contexts = computeArgCombinations(contextPossibleArgs, relevantArgRoots)
        return collections.asynciterable.awu(requester.request({
          endpointIdentifier: endpoint,
          contexts,
          callerIdentifier: {
            typeName,
          }
        })).toArray()
      }))).flat()

      const recurseIntoFetcher = recurseIntoSubresources({ def, typeFetcherCreator, availableResources })
  
      const fragments = await Promise.all(itemsWithContext.map(async item => {
        const nestedResources = await recurseIntoFetcher(item)
        const fieldValues = Object.entries(nestedResources).map(([fieldName, fieldItems]) => ({
          [fieldName]: fieldItems.map(({ value }) => value)
        }))
        return {
          ...item,
          value: _.defaults({}, item.value, ...fieldValues),
        }
      }))
      const toServiceID = serviceIdCreator(def.serviceIDFields ?? [], typeName)
      const groupedFragments = _.groupBy(fragments, toServiceID)
      // TODON recursively merge arrays?
      const mergedFragments = _(groupedFragments)
        .mapValues(fragments => ({
          fragments,
          // concat arrays
          value: _.mergeWith({}, ...fragments.map(fragment => fragment.value), (first: unknown, second: unknown) => (
          (Array.isArray(first) && Array.isArray(second))
            ? first.concat(second)
            : undefined
          ))
        }))
        .mapValues(item => def.transform?.(item) ?? item.value)
        .value()

      Object.values(mergedFragments).forEach(item => items.push(item))
      done = true
      return {
        success: true,
      }
    } catch (e) {
      log.error('Error caught while fetching %s: %s. stack: %s', typeName, e, (e as Error).stack)
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
        errors: [new Error(String(e))] // TODON
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
