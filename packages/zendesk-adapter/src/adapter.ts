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
  FetchResult, AdapterOperations, DeployResult, Element, DeployOptions,
} from '@salto-io/adapter-api'
import { elements as elementUtils, logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import ZendeskClient from './client/client'
import { ZendeskConfig, API_CONFIG } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { endpointToTypeName } from './transformers/transformer'
import { PAGINATION_FIELDS, ZENDESK } from './constants'

const log = logger(module)
const {
  findNestedField, simpleGetArgs, getTypeAndInstances,
} = elementUtils.bootstrap

export const DEFAULT_FILTERS = [
]

export interface ZendeskAdapterParams {
  filterCreators?: FilterCreator[]
  client: ZendeskClient
  config: ZendeskConfig
}

export default class ZendeskAdapter implements AdapterOperations {
  private filtersRunner: Required<Filter>
  private client: ZendeskClient
  private userConfig: ZendeskConfig

  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: ZendeskAdapterParams) {
    this.userConfig = config
    this.client = client
    this.filtersRunner = filtersRunner(
      this.client,
      {
        api: config.api,
      },
      filterCreators,
    )
  }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<Element[]> {
    // for now assuming flat dependencies for simplicity
    // TODO use a real DAG instead (without interfering with parallelizing the requests),
    // (not yet needed for zendesk, but keeping for now)
    const [independentEndpoints, dependentEndpoints] = _.partition(
      this.userConfig[API_CONFIG].getEndpoints.map(e => ({
        ...e,
        fieldsToOmit: [...e.fieldsToOmit ?? [], ...this.userConfig[API_CONFIG].fieldsToOmit ?? []],
      })),
      e => _.isEmpty(e.dependsOn)
    )

    const elementGenerationParams = {
      adapterName: ZENDESK,
      client: this.client,
      endpointToTypeName,
      nestedFieldFinder: findNestedField,
      computeGetArgs: simpleGetArgs,
      defaultNameField: this.userConfig[API_CONFIG].defaultNameField,
      defaultPathField: this.userConfig[API_CONFIG].defaultPathField,
      topLevelFieldsToOmit: PAGINATION_FIELDS,
    }
    const contextElements: Record<string, Element[]> = Object.fromEntries(await Promise.all(
      independentEndpoints.map(async endpointConf => [
        endpointConf.endpoint,
        await getTypeAndInstances({
          ...elementGenerationParams,
          endpointConf,
        }),
      ])
    ))
    const dependentElements = await Promise.all(
      dependentEndpoints.map(endpointConf => getTypeAndInstances({
        ...elementGenerationParams,
        endpointConf,
        contextElements,
      }))
    )

    return [
      ...Object.values(contextElements).flat(),
      ...dependentElements.flat(),
    ]
  }

  /**
   * Fetch configuration elements in the given Zendesk account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> { // TODON can almost definitely be shared...
    log.debug('going to fetch zendesk account configuration..')
    const elements = await this.getElements()

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration') // TODON can be shared for these
  async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    // TODON add preDeploy step for re-escaping fields parsed as JSON (if needed)
    throw new Error(`Not implemented. ${this.client !== undefined} ${changeGroup.changes.length}`)
  }
}
