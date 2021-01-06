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
  FetchResult, AdapterOperations, DeployResult, TypeElement, DeployOptions, InstanceElement,
  ObjectType, isListType, isObjectType, isMapType, Values,
} from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { decorators, values as lowerdashValues } from '@salto-io/lowerdash'
import ZuoraClient, { ClientGetParams } from './client/client'
import { ZuoraConfig, DISABLE_FILTERS, API_MODULES_CONFIG, ZuoraApiModuleConfig, DependsOnConfig } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import fieldReferencesFilter from './filters/field_references'
import { generateTypes, ModuleTypeDefs } from './transformers/type_elements'
import { GET_ENDPOINT_SCHEMA_ANNOTATION, GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION, ADDITIONAL_PROPERTIES_FIELD } from './constants'
import { generateInstancesForType } from './transformers/instance_elements'
import { getNameField } from './transformers/transformer'

const { isDefined } = lowerdashValues
const log = logger(module)

export const DEFAULT_FILTERS = [
  fieldReferencesFilter,
]

const ARG_PLACEHOLDER_MATCHER = /\{([\w_]+)\}/g

export interface ZuoraAdapterParams {
  filterCreators?: FilterCreator[]
  client: ZuoraClient
  config: ZuoraConfig
}

const logDuration = (message: string): decorators.InstanceMethodDecorator =>
  decorators.wrapMethodWith(
    async (original: decorators.OriginalCall): Promise<unknown> => (
      log.time(original.call, message)
    )
  )

const isEndpointAllowed = (apiName: string, config: ZuoraApiModuleConfig): boolean => (
  (config.include ?? []).some(r => new RegExp(r.endpointRegex).test(apiName))
  && (config.excludeRegex ?? []).every(r => !(new RegExp(r).test(apiName)))
)

const filterEndpointsWithDetails = (
  modulesConfig: Record<string, ZuoraApiModuleConfig>,
  typesByModuleAndEndpoint: Record<string, ModuleTypeDefs>,
): Record<string, {
  endpoint: string
  dependsOn: Record<string, DependsOnConfig>
  nameField?: string
  doNotPersist?: boolean
}[]> => {
  const allGetEndpoints = _.mapValues(
    modulesConfig,
    (_c, name) => Object.keys(typesByModuleAndEndpoint[name] ?? {})
  )

  const allowedEndpoints = _.mapValues(
    modulesConfig,
    (conf, name) => allGetEndpoints[name].filter(apiName => isEndpointAllowed(apiName, conf))
  )
  const endpointsWithDeps = _.mapValues(
    allowedEndpoints,
    (endpoints, moduleName) => endpoints
      .map(endpoint => ({
        endpoint,
        dependsOn: Object.assign(
          {},
          ...((modulesConfig[moduleName].include ?? [])
            .filter(include => new RegExp(include.endpointRegex).test(endpoint))
            .filter(include => include.dependsOn !== undefined)
            .map(include => include.dependsOn)),
        ) as Record<string, DependsOnConfig>,
        nameField: (modulesConfig[moduleName].include ?? [])
          .filter(include => new RegExp(include.endpointRegex).test(endpoint))
          .map(include => include.nameField)
          .find(isDefined),
        doNotPersist: (modulesConfig[moduleName].include ?? [])
          .filter(include => new RegExp(include.endpointRegex).test(endpoint))
          .some(include => include.doNotPersist),
      }))
  )
  // TODO to make sure we still parallelize as many of the requests as possible,
  // need to use DAG and run on leaves, starting each one as all its dependencies are complete
  log.info('Based on the configuration, going to use the following endpoints: %s', JSON.stringify(endpointsWithDeps))
  log.debug('For reference, these are all the endpoints: %s', JSON.stringify(allGetEndpoints))
  return endpointsWithDeps
}

const computeGetArgs = ({
  endpointName,
  dataFieldName,
  extractValues,
  contextElements,
  dependsOn,
}: {
  endpointName: string
  dataFieldName?: string
  extractValues?: boolean
  contextElements?: Record<string, InstanceElement[]>
  dependsOn: Record<string, DependsOnConfig>
}): ClientGetParams[] => {
  if (endpointName.includes('{')) {
    if (contextElements === undefined || _.isEmpty(dependsOn)) {
      throw new Error(`cannot resolve endpoint ${endpointName} - missing context`)
    }

    const urlParams = endpointName.match(ARG_PLACEHOLDER_MATCHER)
    if (urlParams === null) {
      // TODON catch earlier in the validation
      throw new Error(`invalid endpoint definition ${endpointName}`)
    }
    if (urlParams.length > 1) {
      // TODON add handling (need to decide how to combine - all n^k combos or something simpler)
      throw new Error(`too many variables in endpoint ${endpointName}`)
    }
    // TODON improve
    const referenceDetails = dependsOn[urlParams[0].slice(1, -1)]
    const contextInstances = (contextElements[referenceDetails.endpoint] ?? [])
    if (!contextInstances) {
      throw new Error(`no instances found for ${referenceDetails.endpoint}, cannot call endpoint ${endpointName}`)
    }
    const potentialParams = contextInstances.map(e => e.value[referenceDetails.field])
    return potentialParams.map(p => ({
      endpointName: endpointName.replace(ARG_PLACEHOLDER_MATCHER, p),
      dataFieldName,
      extractValues,
    }))
  }
  return [{ endpointName, dataFieldName, extractValues }]
}

export default class ZuoraAdapter implements AdapterOperations {
  private filtersRunner: Required<Filter>
  private client: ZuoraClient
  private userConfig: ZuoraConfig

  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: ZuoraAdapterParams) {
    this.userConfig = config
    this.client = client
    this.filtersRunner = filtersRunner(
      this.client,
      filterCreators
    )
  }

  @logDuration('generating types from swagger')
  // eslint-disable-next-line class-methods-use-this
  private async getAllTypes(): Promise<Record<string, ModuleTypeDefs>> {
    return generateTypes(this.userConfig[API_MODULES_CONFIG])
  }

  @logDuration('generating instances from service')
  private async getInstances(types: Record<string, ModuleTypeDefs>): Promise<InstanceElement[]> {
    const getInstancesForType = async ({
      endpointName,
      dependsOn,
      responseSchema,
      contextElements,
      fieldsToOmit,
      nameField,
    }: {
      endpointName: string
      nameField: string
      dependsOn: Record<string, DependsOnConfig>
      responseSchema: ObjectType
      contextElements?: Record<string, InstanceElement[]>
      fieldsToOmit?: string[]
    }): Promise<InstanceElement[]> => {
      try {
        const dataFieldName: string | undefined = responseSchema.annotations[
          GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION
        ]

        const getType = (): { objType: ObjectType; extractValues?: boolean } => {
          const dataFieldType = (dataFieldName !== undefined
            ? responseSchema.fields[dataFieldName].type
            : responseSchema)

          if (
            dataFieldName !== undefined
            && isObjectType(dataFieldType)
            && Object.keys(dataFieldType.fields).length === 1
            && dataFieldType.fields[ADDITIONAL_PROPERTIES_FIELD] !== undefined
          ) {
            const propsType = dataFieldType.fields[ADDITIONAL_PROPERTIES_FIELD].type
            if (isMapType(propsType) && isObjectType(propsType.innerType)) {
              return {
                objType: propsType.innerType,
                extractValues: true,
              }
            }
          }
          return {
            // guaranteed to be an ObjectType by the way we choose the data fields
            objType: (isListType(dataFieldType)
              ? dataFieldType.innerType
              : dataFieldType) as ObjectType,
          }
        }

        const { objType, extractValues } = getType()

        const getEntries = async (): Promise<Values[]> => {
          const getArgs = computeGetArgs({
            endpointName,
            dataFieldName,
            contextElements,
            dependsOn,
            extractValues,
          })

          return (await Promise.all(
            getArgs.map(args => this.client.get(args))
          )).flatMap(r => r.result)
        }

        const entries = await getEntries()
        return generateInstancesForType(
          entries,
          objType,
          nameField,
          fieldsToOmit,
        )
      } catch (e) {
        log.error(`Could not fetch ${endpointName}: ${e}. %s`, e.stack)
        return []
      }
    }

    // TODON assuming shared base url across modules - this is true for Zuora but not in general
    const typesByModuleAndEndpoint = _.mapValues(
      types,
      moduleTypes => Object.fromEntries(
        Object.values(moduleTypes)
          .flatMap(type =>
            (type.annotations[GET_ENDPOINT_SCHEMA_ANNOTATION] ?? [])
              .map((getEndpoint: string) => [getEndpoint, type]))
      ) as Record<string, TypeElement>
    )
    const fetchEndpoints = filterEndpointsWithDetails(
      this.userConfig[API_MODULES_CONFIG],
      typesByModuleAndEndpoint,
    )

    // for now assuming flat dependencies for simplicity
    // TODO use a real DAG instead (without interfering with parallelizing the requests)
    return (await Promise.all(
      Object.entries(fetchEndpoints).map(async ([
        moduleName,
        endpoints,
      ]): Promise<InstanceElement[]> => {
        const [independentEndpoints, dependentEndpoints] = _.partition(
          endpoints,
          e => _.isEmpty(e.dependsOn)
        )

        // TODON move duplicated code to function
        const contextElements: Record<string, {
          instances: InstanceElement[]
          doNotPersist?: boolean
        }> = Object.fromEntries(
          await Promise.all(
            independentEndpoints.map(async ({ endpoint, dependsOn, nameField, doNotPersist }) =>
              [
                endpoint,
                {
                  instances: await getInstancesForType({
                    endpointName: endpoint,
                    nameField: getNameField(this.userConfig, moduleName, nameField),
                    dependsOn,
                    responseSchema: typesByModuleAndEndpoint[moduleName][endpoint] as ObjectType,
                    fieldsToOmit: this.userConfig[API_MODULES_CONFIG][moduleName].fieldsToOmit,
                  }),
                  doNotPersist,
                },
              ])
          )
        )
        const dependentElements = await Promise.all(
          dependentEndpoints.map(({ endpoint, dependsOn, nameField }) => getInstancesForType({
            endpointName: endpoint,
            nameField: getNameField(this.userConfig, moduleName, nameField),
            dependsOn,
            responseSchema: typesByModuleAndEndpoint[moduleName][endpoint] as ObjectType,
            contextElements: _.mapValues(contextElements, val => val.instances),
            fieldsToOmit: this.userConfig[API_MODULES_CONFIG][moduleName].fieldsToOmit,
          }))
        )
        return [
          // instances can be marked as doNotPersist in order to avoid conflicts if a more-complete
          // version of them is fetched using a dependent endpoint
          ...Object.values(contextElements)
            .flatMap(items => (items.doNotPersist ? [] : items.instances)),
          ...dependentElements.flat(),
        ]
      }).flat()
    )).flat()
  }

  /**
   * Fetch configuration elements in the given zuora account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    log.debug('going to fetch zuora account configuration..')
    const typesByModule = await this.getAllTypes()
    const instances = await this.getInstances(typesByModule)

    const elements = [
      ...Object.values(typesByModule).flatMap(typeMap => Object.values(typeMap)),
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
   * Deploy configuration elements to the given zuora account.
   */
  @logDuration('deploying account configuration')
  async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    // TODON add change validators
    // TODON move to a deploy file
    throw new Error(`Not implemented. ${this.client !== undefined} ${changeGroup.changes.length}`)
  }
}
