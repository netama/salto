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
  FetchResult, AdapterOperations, DeployResult, Element,
  DeployModifiers, FetchOptions, ElemIdGetter, InstanceElement, isObjectType, TypeMap,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils, elements as elementUtils } from '@salto-io/adapter-components'
import { logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { Client } from '../client'
import { FETCH_CONFIG, Config, createConfigType, API_COMPONENTS_CONFIG } from '../config'
import { Filter, filtersRunner } from '../filter'
import changeValidator from '../change_validator'
import { AdapterParams } from './types'

const { createPaginator } = clientUtils
const { computeGetArgs, findDataField } = elementUtils
const { generateTypes, getAllInstances } = elementUtils.swagger
const { getAllElements } = elementUtils.ducktype
const log = logger(module) // TODON move inside so that it has the account context???

// TODON add a creator for this? and only use member functions where strictly needed
// should adapters _inherit_ from this or replace it? can technically do both...
// (same as with the client from adapter-components)
// TODON restrict Config template
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
    // this.userConfig = config // TODON add back when using the infra! (in inheriting adapter?)
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

  // TODON refactor...
  private apiSwaggerDefinitions(
    parsedConfigs: Record<string, configUtils.RequestableTypeSwaggerConfig>,
    componentName: string,
  ): configUtils.AdapterSwaggerApiConfig {
    // TODON reuse util
    const defs = this.userConfig[API_COMPONENTS_CONFIG].swagger?.[componentName]
    if (defs === undefined) {
      throw new Error(`no swagger component named ${componentName} found`)
    }
    return {
      ...defs,
      // user config takes precedence over parsed config
      types: {
        ...parsedConfigs,
        ..._.mapValues(
          defs.types,
          (def, typeName) => ({ ...parsedConfigs[typeName], ...def })
        ),
      },
    }
  }

  @logDuration('generating types from swagger')
  private async getSwaggerTypes(componentName: string): Promise<elementUtils.swagger.ParsedTypes> {
    const defs = this.userConfig[API_COMPONENTS_CONFIG].swagger?.[componentName]
    if (defs === undefined) {
      throw new Error(`no swagger component named ${componentName} found`)
    }
    return generateTypes(
      this.adapterName,
      defs,
      undefined,
      undefined,
      true,
    )
  }

  @logDuration('getting instances from service')
  private async getSwaggerInstances(
    componentName: string,
    allTypes: TypeMap,
    parsedConfigs: Record<string, configUtils.RequestableTypeSwaggerConfig>,
  ): Promise<elementUtils.FetchElements<InstanceElement[]>> {
    const defs = this.userConfig[API_COMPONENTS_CONFIG].swagger?.[componentName]
    if (defs === undefined) {
      throw new Error(`no swagger component named ${componentName} found`)
    }
    return getAllInstances({
      adapterName: this.adapterName,
      paginator: this.paginator,
      objectTypes: _.pickBy(allTypes, isObjectType),
      apiConfig: this.apiSwaggerDefinitions(parsedConfigs, componentName),
      supportedTypes: defs.supportedTypes,
      fetchQuery: this.fetchQuery,
    })
  }

  async fetchSwaggerElements(componentName: string): Promise<elementUtils.FetchElements<Element[]>> {
    log.debug(`going to fetch ${this.adapterName} component ${componentName} (swagger) account configuration`)
    const { allTypes, parsedConfigs } = await this.getSwaggerTypes(componentName)
    const { elements: instances } = await this.getSwaggerInstances(componentName, allTypes, parsedConfigs)
    const elements = [
      ...Object.values(allTypes),
      ...instances,
    ]
    return { elements }
  }

  async fetchDucktypeElements(componentName: string): Promise<elementUtils.FetchElements<Element[]>> {
    log.debug(`going to fetch ${this.adapterName} component ${componentName} (ducktype) account configuration`)
    const defs = this.userConfig[API_COMPONENTS_CONFIG].ducktype?.[componentName]
    if (defs === undefined) {
      throw new Error(`no ducktype component named ${componentName} found`)
    }
    return getAllElements({
      adapterName: this.adapterName,
      types: defs.types,
      shouldAddRemainingTypes: true,
      supportedTypes: defs.supportedTypes,
      fetchQuery: this.fetchQuery,
      paginator: this.paginator,
      nestedFieldFinder: findDataField,
      computeGetArgs,
      typeDefaults: defs.typeDefaults,
      getElemIdFunc: this.getElemIdFunc,
    })
  }

  /**
   * Fetch configuration elements in the given sap account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  // TODON generalize and move to shared adapter code
  async getElements(): Promise<elementUtils.FetchElements<Element[]>> {
    const allResults = await Promise.all([
      ...Object.keys(this.userConfig[API_COMPONENTS_CONFIG].swagger ?? {}).map(
        componentName => this.fetchSwaggerElements(componentName)
      ),
      ...Object.keys(this.userConfig[API_COMPONENTS_CONFIG].ducktype ?? {}).map(
        componentName => this.fetchDucktypeElements(componentName)
      ),
    ])
    const elements = allResults.flatMap(res => res.elements)
    return { elements }
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
        configType: createConfigType(this.adapterName),
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
    }
  }
}
