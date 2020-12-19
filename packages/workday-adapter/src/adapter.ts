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
  ObjectType, InstanceElement, getChangeElement, isInstanceElement, isObjectType, Change,
  isAdditionOrModificationChange,
  isAdditionChange,
} from '@salto-io/adapter-api'
import { resolveValues } from '@salto-io/adapter-utils'
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { collections, decorators } from '@salto-io/lowerdash'
import WorkdayClient from './client/client'
import { WorkdayConfig, API_MODULES_CONFIG, DISABLE_FILTERS, WorkdayApiModuleConfig } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import {
  GET_API_PREFIX, PUT_REQUEST_SCHEMA_ANNOTATION, REQUEST_FOR_PUT_ENDPOINT_ANNOTATION,
  WORKDAY_ID_FIELDNAME,
  ALL_IDS_FIELDNAME,
} from './constants'
import { findResponseType, getLookUpName, toPutRequest, findFields, fromIDRefDef } from './transformers/transformer'
import widReferencesFilter from './filters/wid_references'
import { generateTypes } from './transformers/type_elements'
import { generateInstancesForType, getWID } from './transformers/instance_elements'
import { ClientOperationMessageTypes } from './client/types'

const { makeArray } = collections.array

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
    // TODON move to a deploy file

    const instanceChanges = changeGroup.changes.filter(c =>
      isInstanceElement(getChangeElement(c))) as Change<InstanceElement>[]
    const changedInstances = instanceChanges.map(getChangeElement)

    const referencedTypes = _.keyBy(
      changedInstances.map(inst => inst.type),
      t => t.elemID.getFullName(),
    )
    const requestSchemas: Record<string, ObjectType> = _.pickBy(_.mapValues(
      referencedTypes,
      t => t.annotations[PUT_REQUEST_SCHEMA_ANNOTATION]?.value
    ), isObjectType)

    // TODON add support for remove too
    const nonRemoveInstanceChanges = instanceChanges.filter(isAdditionOrModificationChange)
    const results = await Promise.all(nonRemoveInstanceChanges.map(async change => {
      const inst = resolveValues(getChangeElement(change), getLookUpName)
      const schemaType = requestSchemas[inst.type.elemID.getFullName()]
      const [cliName, apiName] = schemaType.annotations[REQUEST_FOR_PUT_ENDPOINT_ANNOTATION].split('.')

      try {
        const { dataFieldName, referenceFieldName } = findFields(schemaType, inst.type)
        if (!isEndpointAllowed(apiName, this.userConfig[API_MODULES_CONFIG][cliName])) {
          throw new Error(`Endpoint ${cliName}.${apiName} blocked by configuration - cannot deploy`)
        }
        const res = await this.client.put(
          // TODON be more explicit when not including reference?
          cliName, apiName, toPutRequest(inst, dataFieldName, referenceFieldName)
        )

        // TODON improve (pick referenceFieldName if available)
        const idsFields = (Object.entries(res.result)
          .filter(([key, value]) => key.endsWith('_Reference') && makeArray(value.ID).length > 0)
          .map(([_key, value]) => value))
        if (idsFields.length > 1) {
          // the change was still applied - just log the error
          log.error('found %d id fields in put response %s - using %s',
            idsFields.length, JSON.stringify(res.result), JSON.stringify(idsFields[0]))
        }
        if (isAdditionChange(change)) {
          const wid = getWID(idsFields[0])
          if (wid !== undefined) {
            const newAfterInstance = change.data.after.clone()
            newAfterInstance.value[WORKDAY_ID_FIELDNAME] = wid
            newAfterInstance.value[ALL_IDS_FIELDNAME] = fromIDRefDef(idsFields[0])
            const updatedChange = {
              ...change,
              data: {
                after: newAfterInstance,
              },
            }
            return {
              appliedChanges: [updatedChange],
              errors: [],
            }
          }
        }
        return {
          appliedChanges: [change],
          errors: [],
        }
      } catch (e) {
        log.error('error deploying change group: %s, stack: %o', e, e.stack)
        return {
          appliedChanges: [],
          errors: [e],
        }
      }
    }))
    return {
      errors: results.flatMap(res => res.errors),
      appliedChanges: results.flatMap(res => res.appliedChanges),
    }
  }
}
