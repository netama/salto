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
  FetchResult, AdapterOperations, DeployResult, Element,
} from '@salto-io/adapter-api'
import { elements as elementUtils, logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import WorkatoClient from './client/client'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { API_CONFIG, WorkatoConfig } from './types'
import extractFieldsFilter from './filters/extract_fields'
import fieldReferencesFilter from './filters/field_references'
import { endpointToTypeName } from './transformers/transformer'
import { WORKATO } from './constants'

const log = logger(module)
const {
  findNestedField, simpleGetArgs, getTypeAndInstances,
} = elementUtils.bootstrap

export const DEFAULT_FILTERS = [
  extractFieldsFilter,
  fieldReferencesFilter,
]

export interface WorkatoAdapterParams {
  filterCreators?: FilterCreator[]
  client: WorkatoClient
  config: WorkatoConfig
}

export default class WorkatoAdapter implements AdapterOperations {
  private filtersRunner: Required<Filter>
  private client: WorkatoClient
  private userConfig: WorkatoConfig

  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: WorkatoAdapterParams) {
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
    // TODON remove for workato? after demonstrating
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
      adapterName: WORKATO,
      client: this.client,
      endpointToTypeName,
      nestedFieldFinder: findNestedField,
      computeGetArgs: simpleGetArgs,
      defaultNameField: this.userConfig[API_CONFIG].defaultNameField,
      defaultPathField: this.userConfig[API_CONFIG].defaultPathField,
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
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    log.debug('going to fetch workato account configuration..')
    const elements = await this.getElements()

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  // eslint-disable-next-line class-methods-use-this
  async deploy(): Promise<DeployResult> {
    throw new Error('Not implemented.')
  }
}
