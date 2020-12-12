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
import {
  FetchResult, AdapterOperations, ChangeGroup, DeployResult, TypeElement,
  ObjectType, InstanceElement, getChangeElement, isInstanceElement, isObjectType,
} from '@salto-io/adapter-api'
import { resolveValues } from '@salto-io/adapter-utils'
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { decorators } from '@salto-io/lowerdash'
import WorkdayClient from './client/client'
import { WorkdayConfig, API_MODULES_CONFIG, DISABLE_FILTERS, WorkdayApiModuleConfig } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import {
  GET_API_PREFIX, PUT_REQUEST_SCHEMA_ANNOTATION, REQUEST_FOR_PUT_ENDPOINT_ANNOTATION,
} from './constants'
import { findResponseType, getLookUpName, toPutRequest, findFields } from './transformers/transformer'
import widReferencesFilter from './filters/wid_references'
import { generateTypes } from './transformers/type_elements'
import { generateInstancesForType } from './transformers/instance_elements'
import { ClientOperationMessageTypes } from './client/types'

const log = logger(module)

export const DEFAULT_FILTERS = [
  widReferencesFilter,
]

export interface WorkdayAdapterParams {
  filterCreators?: FilterCreator[]
  client: WorkdayClient
  config: WorkdayConfig
}

const logDuration = (message: string): decorators.InstanceMethodDecorator =>
  decorators.wrapMethodWith(
    async (original: decorators.OriginalCall): Promise<unknown> => (
      log.time(original.call, message)
    )
  )

const isEndpointAllowed = (apiName: string, config: WorkdayApiModuleConfig): boolean => (
  (config.includeRegex ?? []).some(r => new RegExp(r).test(apiName))
  && (config.excludeRegex ?? []).every(r => !(new RegExp(r).test(apiName)))
)

const filterEndpoints = (
  modulesConfig: Record<string, WorkdayApiModuleConfig>,
  typesByClientAndEndpoint: ClientOperationMessageTypes,
  prefix: string,
): Record<string, string[]> => {
  const allEndpoints = _.mapValues(
    modulesConfig,
    (_c, name) => Object.keys(typesByClientAndEndpoint[name] ?? {})
      .filter(apiName => apiName.startsWith(prefix))
  )
  const allowedEndpoints = _.mapValues(
    modulesConfig,
    (conf, name) => allEndpoints[name].filter(apiName => isEndpointAllowed(apiName, conf))
  )
  log.info('Based on the configuration, going to use the following endpoints: %s', JSON.stringify(allowedEndpoints))
  log.debug('For reference, these are all the %s endpoints: %s', prefix, JSON.stringify(allEndpoints))
  return allowedEndpoints
}

export default class WorkdayAdapter implements AdapterOperations {
  private filtersRunner: Required<Filter>
  private client: WorkdayClient
  private userConfig: WorkdayConfig

  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: WorkdayAdapterParams) {
    this.userConfig = config
    this.client = client
    this.filtersRunner = filtersRunner(
      this.client,
      filterCreators
    )
  }

  @logDuration('generating types from wsdl')
  private async getAllTypes(): Promise<Record<string, TypeElement>> {
    const allTypeDefs = await this.client.getAllTypes()
    const typesByClientAndEndpoint = await this.client.getEndpointTypeNames()
    return generateTypes(allTypeDefs, typesByClientAndEndpoint)
  }

  @logDuration('generating instances from service')
  private async getInstances(types: Record<string, TypeElement>): Promise<InstanceElement[]> {
    // this is cached in the client, so it's ok to call again
    const typesByClientAndEndpoint = await this.client.getEndpointTypeNames()

    const getInstancesForType = async (
      cliName: string,
      apiName: string,
    ): Promise<InstanceElement[]> => {
      const responseSchemaName = typesByClientAndEndpoint[cliName][apiName]?.output
      const outputSchema = types[responseSchemaName] as ObjectType
      try {
        const { fieldName, objType } = findResponseType(apiName, outputSchema)
        const entries = (await this.client.get(cliName, apiName, fieldName)).result
        return generateInstancesForType(
          entries,
          objType,
        )
      } catch (e) {
        log.error(`Could not fetch ${apiName}: ${e}. %s`, e.stack)
        return []
      }
    }

    const fetchEndpoints = filterEndpoints(
      this.userConfig[API_MODULES_CONFIG],
      typesByClientAndEndpoint,
      GET_API_PREFIX,
    )

    return (await Promise.all(
      Object.entries(fetchEndpoints).map(([cliName, apiNames]) => apiNames
        .map(apiName => getInstancesForType(cliName, apiName))).flat()
    )).flat()
  }

  /**
   * Fetch configuration elements in the given workday account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    log.debug('going to fetch workday account configuration..')
    const types = await this.getAllTypes()
    const instances = await this.getInstances(types)

    const elements = [
      ...Object.values(types),
      ...instances,
    ]

    if (this.userConfig[DISABLE_FILTERS]) {
      log.info('Not running filters based on user configuration')
      return { elements }
    }

    // TODON get config change suggestions

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given workday account.
   */
  @logDuration('deploying account configuration')
  async deploy(changeGroup: ChangeGroup): Promise<DeployResult> {
    // TODON add change validators

    const changedInstances = changeGroup.changes.map(getChangeElement).filter(isInstanceElement)

    const referencedTypes = _.keyBy(
      changedInstances.map(inst => inst.type),
      t => t.elemID.getFullName(),
    )
    const requestSchemas: Record<string, ObjectType> = _.pickBy(_.mapValues(
      referencedTypes,
      t => t.annotations[PUT_REQUEST_SCHEMA_ANNOTATION]?.value
    ), isObjectType)

    const resolvedInstances = changedInstances
      .map(instance => resolveValues(instance, getLookUpName))

    const results = await Promise.all(resolvedInstances.map(async inst => {
      const schemaType = requestSchemas[inst.type.elemID.getFullName()]
      const [cliName, apiName] = schemaType.annotations[REQUEST_FOR_PUT_ENDPOINT_ANNOTATION].split('.')

      try {
        const { dataFieldName, referenceFieldName } = findFields(schemaType, inst.type)
        if (!isEndpointAllowed(apiName, this.userConfig[API_MODULES_CONFIG][cliName])) {
          throw new Error(`Endpoint ${cliName}.${apiName} blocked by configuration - cannot deploy`)
        }
        // TODON use the other ids too (persist reference on fetch)
        await this.client.put(
          cliName, apiName, toPutRequest(inst, dataFieldName, referenceFieldName)
        )
        // TODON check if can ever have errors without throwing
        return {
          successIDs: inst.elemID,
          errors: [],
        }
      } catch (e) {
        log.error('error deploying change group: %s, stack: %o', e, e.stack)
        return {
          successIDs: [],
          errors: [e],
        }
      }
    }))
    const successIDs = new Set(results.flatMap(res => res.successIDs).map(id => id.getFullName()))
    return {
      errors: results.flatMap(res => res.errors),
      appliedChanges: changeGroup.changes.filter(
        c => successIDs.has(getChangeElement(c).elemID.getFullName())
      ),
    }
  }
}
