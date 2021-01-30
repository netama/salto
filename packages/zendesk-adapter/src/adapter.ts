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
import {
  FetchResult, AdapterOperations, DeployResult, Element, DeployOptions,
} from '@salto-io/adapter-api'
import { elements as elementUtils, logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import ZendeskClient from './client/client'
import { ZendeskConfig, DEFAULT_ENDPOINTS } from './config'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { ZENDESK, DEFAULT_NAME_FIELD, DEFAULT_PATH_FIELD, PAGINATION_FIELDS, FIELDS_TO_OMIT } from './constants'

const log = logger(module)
const {
  findNestedField, simpleGetArgs, getAllElements,
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
        apiDefinitions: config.apiDefinitions ?? { endpoints: DEFAULT_ENDPOINTS },
      },
      filterCreators,
    )
  }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<Element[]> {
    return getAllElements({
      adapterName: ZENDESK,
      endpoints: this.userConfig.apiDefinitions?.endpoints ?? DEFAULT_ENDPOINTS,
      includeEndpoints: this.userConfig.fetch.includeEndpoints,
      client: this.client,
      nestedFieldFinder: findNestedField,
      computeGetArgs: simpleGetArgs,
      defaultExtractionFields: {
        fieldsToOmit: FIELDS_TO_OMIT,
        nameField: DEFAULT_NAME_FIELD,
        pathField: DEFAULT_PATH_FIELD,
        topLevelFieldsToOmit: PAGINATION_FIELDS,
      },
    })
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
