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
import { values as lowerdashValues } from '@salto-io/lowerdash'
import WorkatoClient from './client/client'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { WorkatoConfig, DEFAULT_RESOURCES } from './types'
import extractFieldsFilter from './filters/extract_fields'
import fieldReferencesFilter from './filters/field_references'
import { endpointToTypeName } from './transformers/transformer'
import { WORKATO, DEFAULT_NAME_FIELD, DEFAULT_PATH_FIELD } from './constants'

const log = logger(module)
const { isDefined } = lowerdashValues
const {
  returnFullEntry, simpleGetArgs, getTypeAndInstances,
} = elementUtils.ducktype

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
        fetch: config.fetch,
        apiResources: config.apiResources ?? { resources: DEFAULT_RESOURCES },
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
    const allResources = this.userConfig.fetch.includeResources
      .map(resourceName => ({
        resourceName,
        endpoint: this.userConfig.apiResources?.resources[
          resourceName].endpoint as elementUtils.ducktype.EndpointConfig,
      }))
      // an earlier validation ensures the include resources only reference valid resources
      .filter(({ endpoint }) => isDefined(endpoint))
    const [independentEndpoints, dependentEndpoints] = _.partition(
      allResources,
      r => _.isEmpty(r.endpoint.dependsOn)
    )

    const elementGenerationParams = {
      adapterName: WORKATO,
      client: this.client,
      endpointToTypeName,
      nestedFieldFinder: returnFullEntry,
      computeGetArgs: simpleGetArgs,
      defaultNameField: DEFAULT_NAME_FIELD,
      defaultPathField: DEFAULT_PATH_FIELD,
    }
    const contextElements: Record<string, Element[]> = Object.fromEntries(await Promise.all(
      independentEndpoints.map(async ({ resourceName, endpoint }) => [
        endpoint.url,
        await getTypeAndInstances({
          ...elementGenerationParams,
          typeName: resourceName,
          endpoint,
        }),
      ])
    ))
    const dependentElements = await Promise.all(
      dependentEndpoints.map(({ resourceName, endpoint }) => getTypeAndInstances({
        ...elementGenerationParams,
        typeName: resourceName,
        endpoint,
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
