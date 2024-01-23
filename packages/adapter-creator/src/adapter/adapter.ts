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
import {
  FetchResult, AdapterOperations, DeployResult,
  DeployModifiers, FetchOptions, ElemIdGetter, InstanceElement, isObjectType,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils, deployment as deploymentUtils, elements as elementUtils } from '@salto-io/adapter-components'
import { logDuration, safeJsonStringify } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import { Client } from '../client'
import { FETCH_CONFIG, Config, createConfigType, API_COMPONENTS_CONFIG, extendApiDefinitionsFromSwagger } from '../config'
import { Filter, filtersRunner } from '../filter'
import changeValidator from '../change_validator'
import { AdapterParams } from './types'
import { analyzeConfig } from '../utils/config_initializer'

const { createPaginator } = clientUtils
const { computeGetArgs, findDataField, getAllElements } = elementUtils
const { generateTypes } = elementUtils.swagger
const { getChangeGroupIdsFuncWithConfig } = deploymentUtils.grouping
const log = logger(module) // TODON move inside so that it has the account context???

// TODON add a creator for this? and only use member functions where strictly needed
// should adapters _inherit_ from this or replace it? can technically do both...
// (same as with the client from adapter-components)
// TODON restrict Config template
// TODON keep this so that if someone wants to customize, they can just copy-paste?
// (though might end up becoming more different over time)
export class AdapterImpl<Credentials, Co extends Config> implements AdapterOperations {
  protected createFiltersRunner: () => Required<Filter>
  protected client: Client<Credentials>
  // private userConfig: Co
  protected fetchQuery: elementUtils.query.ElementQuery
  // private getElemIdFunc?: ElemIdGetter
  protected adapterName: string
  protected accountName: string
  protected userConfig: Co // TODON rename to config? but not exactly
  protected configInstance?: InstanceElement
  protected getElemIdFunc?: ElemIdGetter
  protected paginator: clientUtils.Paginator

  public constructor({
    adapterName,
    accountName,
    filterCreators,
    client,
    config,
    configInstance,
    getElemIdFunc,
    paginate,
  }: AdapterParams<Credentials, Co>) {
    this.adapterName = adapterName // TODON move to closure instead?
    this.accountName = accountName // TODON same
    this.client = client
    this.getElemIdFunc = getElemIdFunc
    const paginator = createPaginator({
      client: this.client,
      paginationFuncCreator: paginate,
    })
    this.paginator = paginator
    // this.paginator = paginator
    this.fetchQuery = elementUtils.query.createElementQuery(config[FETCH_CONFIG])
    this.createFiltersRunner = () => (
      filtersRunner({ client, paginator, config, fetchQuery: this.fetchQuery }, filterCreators)
    )
    this.userConfig = config // TODON add back when using the infra! (in inheriting adapter?)
    this.configInstance = configInstance // TODON check if really needed
  }

  @logDuration('generating types from swagger')
  private async getAllSwaggerTypes(): Promise<elementUtils.swagger.ParsedTypes> {
    return _.defaults({}, ...await Promise.all(
      collections.array.makeArray(this.userConfig[API_COMPONENTS_CONFIG].sources?.swagger).map(defs => (generateTypes(
        this.adapterName,
        {
          swagger: defs,
          ...this.userConfig[API_COMPONENTS_CONFIG].definitions,
        },
        undefined,
        undefined,
        true,
      )))
    ))
  }

  /**
   * Fetch configuration elements in the given sap account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async getElements(): Promise<elementUtils.FetchElements> {
    // TODON next - share the type defs and don't distinguish between swagger and ducktype at all
    const { allTypes, parsedConfigs } = await this.getAllSwaggerTypes()
    log.debug('Full parsed configuration from swaggers: %s', safeJsonStringify(parsedConfigs))

    // TODON is there a case where some of the defaults should come from the types?
    // e.g. pagination or client? - if so - can customize at that level...
    // TODON add client name as arg for fetching types? or auth (like in openapi - though focused on what's supported)
    const extendedApiConfig = extendApiDefinitionsFromSwagger(this.userConfig, parsedConfigs)
    // TODON input something that will contain all http responses, and log it in a single "line"?
    const res = await getAllElements({
      adapterName: this.adapterName,
      apiConfig: extendedApiConfig,
      shouldAddRemainingTypes: true,
      supportedTypes: extendedApiConfig.supportedTypes,
      fetchQuery: this.fetchQuery,
      paginator: this.paginator,
      nestedFieldFinder: findDataField,
      computeGetArgs,
      getElemIdFunc: this.getElemIdFunc,
      objectTypes: this.userConfig[API_COMPONENTS_CONFIG].sources?.alwaysDuckType
        ? undefined
        : _.pickBy(allTypes, isObjectType),
    })
    if (this.userConfig[API_COMPONENTS_CONFIG].initializing && this.configInstance !== undefined) {
      await analyzeConfig({
        adapterName: this.adapterName,
        extendedApiConfig,
        elements: res.elements,
      })
    }
    return res
  }

  /**
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  // TODON consider adding helper util functions for steps we want to formalize?
  // (e.g. getting elements, running initial transformations, running filters, de-dup-ing elements etc)
  async fetch({ progressReporter }: FetchOptions): Promise<FetchResult> {
    // TODON allow to add dependencies between elements from different sections?
    // TODON can we define the swagger-vs-ducktype-vs-something-else on the individual type level?
    log.debug(`going to fetch ${this.accountName} (${this.adapterName}) account configuration`)
    progressReporter.reportProgress({ message: 'Fetching elements' })

    const { elements, configChanges, errors } = await this.getElements()

    log.debug('going to run filters on %d fetched elements', elements.length)
    progressReporter.reportProgress({ message: 'Running filters for additional information' })

    const result = await this.createFiltersRunner().onFetch(elements) || {}

    const updatedConfig = this.configInstance && configChanges
      ? configUtils.getConfigWithExcludeFromConfigChanges({
        configChanges,
        currentConfig: this.configInstance,
        configType: createConfigType({ adapterName: this.adapterName }),
        adapterName: this.adapterName,
      }) : undefined

    const fetchErrors = (errors ?? []).concat(result.errors ?? [])

    return { elements, errors: fetchErrors, updatedConfig }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  // eslint-disable-next-line class-methods-use-this
  async deploy(): Promise<DeployResult> { // TODON make this smarter based on the existence of some deploy config?
    throw new Error('Not implemented.')
    // TODON add default behavior? separately?
  }

  // eslint-disable-next-line class-methods-use-this
  public get deployModifiers(): DeployModifiers {
    return {
      changeValidator,
      // TODON bring back + upgrade config and use correct part, allow for adding more
      // getChangeGroupIds: getChangeGroupIdsFuncWithConfig(this.userConfig),
      getChangeGroupIds: getChangeGroupIdsFuncWithConfig({ customizations: {} }),
    }
  }
}
