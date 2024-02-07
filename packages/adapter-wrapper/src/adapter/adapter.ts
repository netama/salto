/*
 *                      Copyright 2024 Salto Labs Ltd.
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
  FetchResult,
  AdapterOperations,
  DeployResult,
  DeployModifiers,
  FetchOptions,
  ElemIdGetter,
  InstanceElement,
  isObjectType,
  ActionName,
  isInstanceChange,
  DeployOptions,
  Change,
  getChangeData,
  SaltoError,
  isSaltoError,
  ChangeValidator,
} from '@salto-io/adapter-api'
import {
  config as configUtils,
  definitions as definitionUtils,
  fetch as fetchUtils,
  filterUtils,
  elements as elementUtils,
  deployment,
  references as referenceUtils,
} from '@salto-io/adapter-components'
import {
  createChangeElementResolver,
  logDuration,
  restoreChangeElement,
  safeJsonStringify,
} from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, objects, types } from '@salto-io/lowerdash'
import { Client } from '../client'
import { AdapterParams } from './types'
// import { analyzeConfig } from '../utils/config_initializer'

const log = logger(module)
const { awu } = collections.asynciterable
const { getElements } = fetchUtils
const { filterRunner } = filterUtils

type Filter = filterUtils.Filter<filterUtils.FilterResult>

// TODON add a creator for this? and only use member functions where strictly needed
// should adapters _inherit_ from this or replace it? can technically do both...
// (same as with the client from adapter-components)
// TODON restrict Config template
// TODON keep this so that if someone wants to customize, they can just copy-paste?
// (though might end up becoming more different over time)
export class AdapterImpl<
  Credentials,
  Co extends definitionUtils.UserConfig,
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName,
> implements AdapterOperations
{
  protected createFiltersRunner: () => Required<Filter>
  protected clients: Record<ClientOptions, Client<Credentials>>
  protected fetchQuery: fetchUtils.query.ElementQuery
  protected adapterName: string
  protected accountName: string
  protected userConfig: Co
  protected configInstance?: InstanceElement
  protected getElemIdFunc?: ElemIdGetter
  protected changeValidators: Record<string, ChangeValidator>
  protected definitions: types.PickyRequired<
    definitionUtils.ApiDefinitions<ClientOptions, PaginationOptions, Action>,
    'clients' | 'pagination' | 'fetch'
  >

  public constructor({
    adapterName,
    accountName,
    filterCreators,
    clients,
    config,
    configInstance,
    definitions,
    getElemIdFunc,
    additionalChangeValidators,
  }: AdapterParams<Credentials, Co, ClientOptions, PaginationOptions, Action>) {
    this.adapterName = adapterName // TODON move to closure instead?
    this.accountName = accountName // TODON same
    this.clients = clients
    this.getElemIdFunc = getElemIdFunc
    this.definitions = definitions
    this.fetchQuery = fetchUtils.query.createElementQuery(config.fetch)
    this.createFiltersRunner = () =>
      filterRunner<Co, filterUtils.FilterResult, {}, ClientOptions, PaginationOptions, Action>(
        {
          fetchQuery: this.fetchQuery,
          definitions: this.definitions,
          config: this.userConfig,
          getElemIdFunc: this.getElemIdFunc,
        },
        filterCreators,
        objects.concatObjects,
      )
    this.userConfig = config
    this.configInstance = configInstance // TODON check if really needed
    this.changeValidators = {
      ...deployment.changeValidators.getDefaultChangeValidators(),
      ...(this.definitions.deploy?.instances === undefined
        ? { deployNotSupported: deployment.changeValidators.deployNotSupportedValidator }
        : {}),
      ...additionalChangeValidators,
    }
  }

  @logDuration('generating types from swagger')
  private async getAllSwaggerTypes(): Promise<elementUtils.swagger.ParsedTypes> {
    return _.defaults(
      {},
      ...(await Promise.all(
        collections.array.makeArray(this.definitions.sources?.openAPI).map(def =>
          elementUtils.swagger.generateTypes(
            this.adapterName,
            // TODON re-implement for definitions
            {
              supportedTypes: {},
              typeDefaults: { transformation: { idFields: [] } },
              types: {},
              swagger: {
                url: def.url,
              },
            },
          ),
        ),
      )),
    )
  }

  /**
   * Fetch configuration elements in the given sap account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async getElements(): Promise<fetchUtils.FetchElements> {
    // TODON next - share the type defs and don't distinguish between swagger and ducktype at all
    const { allTypes, parsedConfigs } = await this.getAllSwaggerTypes()
    log.debug('Full parsed configuration from swaggers: %s', safeJsonStringify(parsedConfigs))

    // TODON is there a case where some of the defaults should come from the types?
    // e.g. pagination or client? - if so - can customize at that level...
    // TODON add client name as arg for fetching types? or auth (like in openapi - though focused on what's supported)
    // const extendedApiConfig = extendApiDefinitionsFromSwagger(this.userConfig, parsedConfigs)
    // TODON input something that will contain all http responses, and log it in a single "line"?
    const res = await getElements({
      adapterName: this.adapterName,
      fetchQuery: this.fetchQuery,
      definitions: this.definitions,
      getElemIdFunc: this.getElemIdFunc,
      predefinedTypes: _.pickBy(allTypes, isObjectType),
    })
    return res
  }

  /**
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch({ progressReporter }: FetchOptions): Promise<FetchResult> {
    log.debug(`going to fetch ${this.accountName} (${this.adapterName}) account configuration`)
    progressReporter.reportProgress({ message: 'Fetching elements' })

    const { elements, configChanges, errors } = await this.getElements()

    log.debug('going to run filters on %d fetched elements', elements.length)
    progressReporter.reportProgress({ message: 'Running filters for additional information' })

    const result = (await this.createFiltersRunner().onFetch(elements)) || {}

    const updatedConfig =
      this.configInstance && configChanges
        ? configUtils.getUpdatedCofigFromConfigChanges({
            configChanges,
            currentConfig: this.configInstance,
            configType: definitionUtils.createUserConfigType({ adapterName: this.adapterName }),
          })
        : undefined

    const fetchErrors = (errors ?? []).concat(result.errors ?? [])

    return { elements, errors: fetchErrors, updatedConfig }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  // TODON make this smarter based on the existence of some deploy config?
  @logDuration('deploying account configuration')
  async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    const [instanceChanges, nonInstanceChanges] = _.partition(changeGroup.changes, isInstanceChange)
    if (nonInstanceChanges.length > 0) {
      log.warn(
        `We currently can't deploy types. Therefore, the following changes will not be deployed: ${nonInstanceChanges.map(elem => getChangeData(elem).elemID.getFullName()).join(', ')}`,
      )
    }
    if (instanceChanges.length === 0) {
      log.warn(`no instance changes in group ${changeGroup.groupID}`)
      return {
        appliedChanges: [],
        errors: [],
      }
    }
    if (this.definitions.deploy?.instances === undefined) {
      // not supposed to happen if we didn't fail on a change validator
      return {
        appliedChanges: [],
        errors: [
          {
            message: 'no deploy definitions found, cannot deploy changes',
            severity: 'Error',
          },
        ],
      }
    }
    const lookupFunc = referenceUtils.generateLookupFunc(
      this.definitions.references?.rules ?? [],
      // TODON allow passing in a custom fieldReferenceResolverCreator
    )

    const changesToDeploy = instanceChanges.map(change => ({
      action: change.action,
      data: _.mapValues(change.data, (instance: InstanceElement) =>
        // TODON if can do in the infra in a "one-way" manner
        deployment.overrideInstanceTypeForDeploy({
          instance,
          // TODON not "symmetric" with fetch which gets the definitions and not the query
          defQuery: definitionUtils.queryWithDefault(this.definitions.fetch.instances),
        }),
      ),
    })) as Change<InstanceElement>[]
    const sourceChanges = _.keyBy(changesToDeploy, change => getChangeData(change).elemID.getFullName())
    const runner = this.createFiltersRunner()
    const deployDefQuery = definitionUtils.queryWithDefault(this.definitions.deploy.instances)
    const changeResolver = createChangeElementResolver({ getLookUpName: lookupFunc })
    const resolvedChanges = await awu(changesToDeploy)
      .map(async change =>
        deployDefQuery.query(getChangeData(change).elemID.typeName)?.referenceResolution?.when === 'early'
          ? changeResolver(change)
          : change,
      )
      .toArray()
    const saltoErrors: SaltoError[] = []
    try {
      await runner.preDeploy(resolvedChanges)
    } catch (e) {
      if (!isSaltoError(e)) {
        throw e
      }
      return {
        appliedChanges: [],
        errors: [e],
      }
    }
    const { deployResult } = await runner.deploy(resolvedChanges, changeGroup)
    const appliedChangesBeforeRestore = [...deployResult.appliedChanges]
    try {
      await runner.onDeploy(appliedChangesBeforeRestore)
    } catch (e) {
      if (!isSaltoError(e)) {
        throw e
      }
      saltoErrors.push(e)
    }

    const appliedChanges = await awu(appliedChangesBeforeRestore)
      .map(change => restoreChangeElement(change, sourceChanges, lookupFunc))
      .toArray()
    const restoredAppliedChanges = deployment.restoreInstanceTypeFromChange({
      appliedChanges,
      originalInstanceChanges: instanceChanges,
    })
    return {
      appliedChanges: restoredAppliedChanges,
      errors: deployResult.errors.concat(saltoErrors),
    }
  }

  public get deployModifiers(): DeployModifiers {
    const changeValidator = deployment.changeValidators.createChangeValidator({ validators: this.changeValidators })

    if (this.definitions.deploy?.instances !== undefined) {
      return {
        changeValidator,
        getChangeGroupIds: deployment.grouping.getChangeGroupIdsFuncWithConfig(this.definitions.deploy.instances),
        // TODON dependencyChanger
      }
    }
    return {
      changeValidator,
    }
  }
}
