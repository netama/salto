/*
*                      Copyright 2020 Salto Labs Ltd.
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
  FetchResult, AdapterOperations, ChangeGroup, DeployResult, Element,
} from '@salto-io/adapter-api'
import { naclCase } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { decorators } from '@salto-io/lowerdash'
import WorkatoClient from './client/client'
import { WorkatoConfig, API_CONFIG, DISABLE_FILTERS, EndpointConfig } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import extractFieldsFilter from './filters/extract_fields'
import referencesFilter from './filters/references'
import { generateType } from './transformers/type_elements'
import { toInstance } from './transformers/instance_elements'
import { endpointToTypeName } from './transformers/transformer'

const log = logger(module)

export const DEFAULT_FILTERS = [
  extractFieldsFilter,
  referencesFilter,
]

export interface WorkatoAdapterParams {
  filterCreators?: FilterCreator[]
  client: WorkatoClient
  config: WorkatoConfig
}

const logDuration = (message: string): decorators.InstanceMethodDecorator =>
  decorators.wrapMethodWith(
    async (original: decorators.OriginalCall): Promise<unknown> => (
      log.time(original.call, message)
    )
  )

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
    const getTypeAndInstances = async ({
      endpoint,
      queryParams,
      fieldsToOmit,
      hasDynamicFields,
    }: EndpointConfig): Promise<Element[]> => {
      const entries = (await this.client.get(endpoint, queryParams)).result.map(entry =>
        (fieldsToOmit !== undefined
          ? _.omit(entry, fieldsToOmit)
          : entry
        ))

      // escape "field" names with '.'
      // TODON instead handle in filter? (not sure if "." is consistent enough for actual nesting)
      const naclEntries = entries.map(e => _.mapKeys(e, (_val, key) => naclCase(key)))

      // endpoints with dynamic fields will be associated with the dynamic_keys type

      const type = generateType(
        endpointToTypeName(endpoint),
        naclEntries,
        hasDynamicFields === true,
      )

      const instances = naclEntries.map((entry, index) => toInstance({
        entry,
        type,
        nameField: this.userConfig[API_CONFIG].defaultNameField,
        defaultName: `inst_${index}`,
        fieldsToOmit,
        hasDynamicFields,
      }))
      return [type, ...instances]
    }

    return (await Promise.all(
      this.userConfig[API_CONFIG].getEndpoints.map(getTypeAndInstances)
    )).flat()
  }

  /**
   * Fetch configuration elements in the given workato account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    log.debug('going to fetch workato account configuration..')
    const elements = await this.getElements()

    if (this.userConfig[DISABLE_FILTERS]) {
      log.info('Not running filters based on user configuration')
      return { elements }
    }

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  async deploy(changeGroup: ChangeGroup): Promise<DeployResult> {
    // TODON add preDeploy step for re-escaping fields parsed as JSON (if needed)
    throw new Error(`Not implemented. ${this.client !== undefined} ${changeGroup.changes.length}`)
  }
}
