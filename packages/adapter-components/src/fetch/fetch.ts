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
import { InstanceElement, ElemIdGetter, ActionName, isObjectType } from '@salto-io/adapter-api'
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { types, values as lowerdashValues } from '@salto-io/lowerdash'
import { ElementQuery } from './query'
import { ApiDefinitions, mergeWithDefault } from '../definitions'
import { getUniqueConfigSuggestions } from '../elements/ducktype'
import { ProcessedSources } from './source_processor'
import { computeDependencies } from './dependencies'
import { getRequester } from './request/requester'
import { createResourceManager } from './resource/resource_manager'
import { getElementGenerator } from './element/element'
import { FetchElements } from '../elements'

const { isDefined } = lowerdashValues
const log = logger(module)

/**
 * Helper function for the adapter fetch implementation:
 * Given api definitions and a list of types, make the relevant API calls and convert the
 * response data into a list of elements (for the type, nested types and instances).
 *
 * Supports one level of dependency between the type's endpoints, using the dependsOn field
 * (note that it will need to be extended in order to support longer dependency chains).
 */
export const getElements = async <
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  TAdditionalClientArgs extends Record<string, unknown> = {},
  Action extends string = ActionName
>({
  adapterName,
  fetchQuery,
  definitions, // TODON sub-type to avoid depending on the deploy stuff?
  processedSources,
  // shouldAddRemainingTypes = true, // TODON see if still needed
  // computeGetArgs = defaultComputeGetArgs,
  getElemIdFunc,
  // getEntriesResponseValuesFunc, - TODON make sure no longer needed
  // isErrorTurnToConfigSuggestion,
  // customInstanceFilter,
  additionalRequestContext,
  // requestCache,
}: {
  adapterName: string
  fetchQuery: ElementQuery
  definitions: types.PickyRequired<ApiDefinitions<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>, 'clients' | 'pagination' | 'fetch'> // TODON maybe pick some?
  // objectTypes?: Record<string, ObjectType>
  processedSources?: ProcessedSources<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>
  // shouldAddRemainingTypes?: boolean
  // computeGetArgs?: ComputeGetArgsFunc
  getElemIdFunc?: ElemIdGetter
  isErrorTurnToConfigSuggestion?: (error: Error) => boolean
  customInstanceFilter?: (instances: InstanceElement[]) => InstanceElement[]
  additionalRequestContext? : Record<string, unknown>
  // TODON pass it to requesters to avoid multiple unneeded requests that are identical on the args
  // TODON use https://www.npmjs.com/package/json-stable-stringify for keys? + allow providing the cache as input to help with debugging? show Shir
  // TODON if using for reproduction as well - allow exporting / getting in from adapter,
  // and allow importing from location
  // requestCache?: Record<string, unknown> // TODON define type for caching requests and responses
}): Promise<FetchElements> => {
  // TODON assume only passing definitions for relevant components for this fetch? or adding to fetch query?
  const { predefinedTypes, additionalDefs } = processedSources ?? {}
  const mergedDefs = _.merge(
    additionalDefs,
    definitions,
  )
  const { clients, fetch, pagination /* , initializing */ } = mergedDefs

  // TODON make smart merge - the "top-level" defaults should only be set if isTopLevel is true!!!
  // and similarly in some other parts. if doing only once, can make this slightly less generic
  const instanceDefs = mergeWithDefault(fetch.instances)

  log.debug('original config: %s', safeJsonStringify(fetch.instances))
  log.debug('merged config: %s', safeJsonStringify(instanceDefs))

  const dependencies = computeDependencies<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>(mergedDefs)

  const requester = getRequester({
    adapterName,
    clients, // TODON should contain the client it's wrapping
    pagination,
    endpointToClient: dependencies.endpointToClient,
    // requestCache,
  })
  // TODON make sure the "omit" part of the field adjustments happens *only* when creating the final intsance,
  // so that it can be used up to that point
  const elementGenerator = getElementGenerator({
    adapterName,
    // TODON ensure some values are there? e.g. elemID, by requiring them in the default
    elementDefs: fetch.instances, // _.pickBy(_.mapValues(instanceDefs, def => def.element ?? {}), isDefined),
    // TODON decide if want openAPI to have generated object types, or only populated the config
    // TODON when extending to primitives as well, will need to adjust
    predefinedTypes: _.pickBy(predefinedTypes, isObjectType),
    fetchQuery,
    getElemIdFunc,
    // customInstanceFilter, // TODON check if can move to earlier
    // shouldAddRemainingTypes,
  })

  // TODON build dependency graph between:
  // 1. requests to resources (based on the generated resources)
  // 2. resources to resources (based on recurseInto in one direction, and context-dependsOn in the other)
  // 3. context dependencies (on the same edges?)
  // create "banks" by type + serialized service id using the json serialization library
  // figure out how to maintain references to parent resources before defining the elements -
  //   add some "resource" entity? (not sure needed in the current implementation though, since added as a child)
  // for each resource, maintain all the promises it's waiting for and where they should be assigned? or do implicitly
  // to get a resource, (later add filtering) traverse the dependency graph backwards to find all "roots" that don't
  // need more args.
  // maintain aggregated context by resource (should also be a graph? check old implementation of recurseInto)
  const resourceManager = createResourceManager({
    adapterName,
    resourceDefs: _.pickBy(_.mapValues(instanceDefs, def => def.resource), isDefined),
    typeToEndpoints: dependencies.typeToEndpoints,
    requester,
    elementGenerator,
    initialRequestContext: additionalRequestContext,
  })

  // TODON potentially replace customInstanceFilter with a condition that can be added even before the recurseInto?
  // so - filter on the request/response!!!

  // flow:
  // * resource fetchers use requesters to generate resources.
  // * resources are aggregated in the element generators
  // * when generate() is called, the element generators produce instances and types that match all resources
  await resourceManager.fetch(fetchQuery)
  // only after all queries have completed and all events have been processed we should generate the instances and types
  const { elements, errors, configChanges } = elementGenerator.generate()

  // TODON consider some play with service ids vs (potentially non-unique) instance names -
  // TODON maybe keep indexed by type + service id, and keep a generic option to add a fallback,
  // expanding what we have somewhere in jira?

  return {
    elements,
    configChanges: getUniqueConfigSuggestions(configChanges ?? []),
    errors,
  }
}
