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
import { values as lowerdashValues } from '@salto-io/lowerdash'
import ZendeskClient from './client/client'
import { ZendeskConfig, DEFAULT_RESOURCES } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { ZENDESK, DEFAULT_NAME_FIELD, DEFAULT_PATH_FIELD, PAGINATION_FIELDS, FIELDS_TO_OMIT } from './constants'

const log = logger(module)
const { isDefined } = lowerdashValues
const {
  findNestedField, simpleGetArgs, getTypeAndInstances,
} = elementUtils.ducktype

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
        fetch: config.fetch,
        apiResources: config.apiResources ?? { resources: DEFAULT_RESOURCES },
      },
      filterCreators,
    )
  }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<Element[]> {
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
      .map(({ resourceName, endpoint }) => ({
        resourceName,
        endpoint: {
          ...endpoint,
          fieldsToOmit: endpoint.fieldsToOmit ?? FIELDS_TO_OMIT,
        },
      }))
    const [independentEndpoints, dependentEndpoints] = _.partition(
      allResources,
      r => _.isEmpty(r.endpoint.dependsOn)
    )

    const elementGenerationParams = {
      adapterName: ZENDESK,
      client: this.client,
      nestedFieldFinder: findNestedField,
      computeGetArgs: simpleGetArgs,
      defaultNameField: DEFAULT_NAME_FIELD,
      defaultPathField: DEFAULT_PATH_FIELD,
      topLevelFieldsToOmit: PAGINATION_FIELDS,
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
    log.debug('going to fetch zendesk account configuration..')
    const elements = await this.getElements()

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    // TODO add preDeploy step for re-escaping fields parsed as JSON (when implementing deploy)
    throw new Error(`Not implemented. ${this.client !== undefined} ${changeGroup.changes.length}`)
  }
}
