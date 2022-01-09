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
  FetchResult, AdapterOperations, DeployResult, Element, DeployModifiers, FetchOptions,
} from '@salto-io/adapter-api'
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-components'
import { logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import SlackClient from './client/client'
import { SlackConfig } from './config'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { SLACK } from './constants'
import changeValidator from './change_validator'
import fieldReferencesFilter from './filters/field_references'

const log = logger(module)
const { createPaginator, getWithCursorPagination } = clientUtils
const { findDataField, computeGetArgs } = elementUtils
const { getAllElements } = elementUtils.ducktype

export const DEFAULT_FILTERS = [
  // fieldReferencesFilter should run after all elements were created
  fieldReferencesFilter,
]

export interface SlackAdapterParams {
  filterCreators?: FilterCreator[]
  client: SlackClient
  config: SlackConfig
}

export default class SlackAdapter implements AdapterOperations {
  private createFiltersRunner: () => Required<Filter>
  private client: SlackClient
  private paginator: clientUtils.Paginator
  private userConfig: SlackConfig

  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: SlackAdapterParams) {
    this.userConfig = config
    this.client = client
    const paginator = createPaginator({
      client: this.client,
      paginationFuncCreator: () => getWithCursorPagination(), // TODON
    })
    this.paginator = paginator
    this.createFiltersRunner = () => filtersRunner(
      {
        client,
        paginator,
        config,
      },
      filterCreators,
    )
  }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<Element[]> {
    return getAllElements({
      adapterName: SLACK,
      types: this.userConfig.apiDefinitions.types,
      includeTypes: this.userConfig.fetch.includeTypes,
      paginator: this.paginator,
      nestedFieldFinder: findDataField,
      computeGetArgs,
      typeDefaults: this.userConfig.apiDefinitions.typeDefaults,
    })
  }

  /**
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch({ progressReporter }: FetchOptions): Promise<FetchResult> {
    log.debug('going to fetch slack account configuration..')
    progressReporter.reportProgress({ message: 'Fetching types and instances' })
    const elements = await this.getElements()
    log.debug('going to run filters on %d fetched elements', elements.length)
    progressReporter.reportProgress({ message: 'Running filters for additional information' })
    await this.createFiltersRunner().onFetch(elements)
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

  // eslint-disable-next-line class-methods-use-this
  public get deployModifiers(): DeployModifiers {
    return {
      changeValidator,
    }
  }
}
