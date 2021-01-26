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
  Element, isInstanceElement, Values,
} from '@salto-io/adapter-api'
import { AdapterClientBase, ClientGetParams } from '../client'
import { UserBootstrapBaseConfig, EndpointConfig, API_CONFIG } from '../config'
import { logDuration } from '../decorators'
import { FilterCreator, filtersRunner, Filter } from '../filter_runner'
import { SimpleFetchBaseAdapter } from './base'

// TODON if using, move to shared code too
const ARG_PLACEHOLDER_MATCHER = /\$\{([\w._]+)\}/g
// const EXACT_ARG_PLACEHODER_MATCHER = /^\{([\w._]+)\}$/
// TODON only supporting what we need for now - '${.<fieldName>}'
const EXACT_ARG_PLACEHODER_MATCHER = /^\$\{\.([\w_]+)\}$/

export interface AdapterBaseParams<
  TClient extends AdapterClientBase,
  TContext
> {
  filterCreators?: FilterCreator<TClient, TContext>[]
  client: TClient
  config: UserBootstrapBaseConfig & TContext
}

export type ComputeGetArgsFunc = (
  endpoint: EndpointConfig,
  contextElements?: Record<string, Element[]>,
) => ClientGetParams[]

export const computeGetArgs: ComputeGetArgsFunc = (
  {
    endpoint,
    queryParams,
    paginationField,
  },
  contextElements,
) => {
  const queryArgs = _.omitBy(queryParams, val => EXACT_ARG_PLACEHODER_MATCHER.test(val))
  const recursiveQueryArgs = _.mapValues( // TODON generalize? or start with just workato?
    _.pickBy(queryParams, val => EXACT_ARG_PLACEHODER_MATCHER.test(val)),
    // TODON for now only variables inside the entry are supported - extend
    val => ((entry: Values): string => entry[val.slice(3, -1)])
  )
  // TODON split queryParams into fixed, recursive, and depending on other element types
  // TODON determine fetch order based on that (or just run in configuration order?)
  if (contextElements !== undefined) {
    if (endpoint.includes('$')) { // TODON can standardize inside the endpoint itself!
      // TODON just one for now - check if need to extend
      const urlParams = endpoint.match(ARG_PLACEHOLDER_MATCHER)
      if (urlParams === null) {
        // TODON catch earlier in the validation
        throw new Error(`invalid endpoint definition ${endpoint}`)
      }
      if (urlParams.length > 1) {
        // TODON add handling
        throw new Error(`too many variables in endpoint ${endpoint}`)
      }
      // TODON improve
      const [referenceEndpoint, field] = urlParams[0].slice(2, -1).split('.')
      const contextInstances = (contextElements[`/${referenceEndpoint}`] ?? []).filter(
        isInstanceElement
      )
      if (!contextInstances) {
        throw new Error(`no instances found for ${referenceEndpoint}, cannot call endpoint ${endpoint}`)
      }
      const potentialParams = contextInstances.map(e => e.value[field])
      return potentialParams.map(p => ({
        endpointName: endpoint.replace(ARG_PLACEHOLDER_MATCHER, p),
        queryArgs,
        recursiveQueryArgs,
        paginationField,
      }))
    }
  }
  return [{ endpointName: endpoint, queryArgs, recursiveQueryArgs, paginationField }]
}

export abstract class BootstrapBaseAdapter<
  TClient extends AdapterClientBase,
  TContext
> extends SimpleFetchBaseAdapter {
  protected filterRunnerImpl: Required<Filter>
  protected client: TClient
  protected userConfig: UserBootstrapBaseConfig & TContext

  public constructor({
    filterCreators = [],
    client,
    config,
  }: AdapterBaseParams<TClient, TContext>) {
    super()
    this.userConfig = config
    this.client = client
    this.filterRunnerImpl = filtersRunner(
      this.client,
      config,
      filterCreators,
    )
  }

  protected get filterRunner(): Required<Filter> {
    return this.filterRunnerImpl
  }

  protected abstract async getTypeAndInstances(
    endpointConf: EndpointConfig,
    contextElements?: Record<string, Element[]>,
  ): Promise<Element[]>

  @logDuration('generating instances and types from service')
  protected async getElements(): Promise<Element[]> {
    // for now assuming flat dependencies for simplicity
    // TODO use a real DAG instead (without interfering with parallelizing the requests),
    // (ended up not being needed for workato - will remove if there's no other use case,
    //  keeping for demonstration purposes)
    const [independentEndpoints, dependentEndpoints] = _.partition(
      this.userConfig[API_CONFIG].getEndpoints,
      e => _.isEmpty(e.dependsOn)
    )
    const contextElements: Record<string, Element[]> = Object.fromEntries(await Promise.all(
      independentEndpoints.map(async e => [e.endpoint, await this.getTypeAndInstances(e)])
    ))
    const dependentElements = await Promise.all(
      dependentEndpoints.map(e => this.getTypeAndInstances(e, contextElements))
    )
    return [
      ...Object.values(contextElements).flat(),
      ...dependentElements.flat(),
    ]
  }
}
