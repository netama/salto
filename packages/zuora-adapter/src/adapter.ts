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
  FetchResult, AdapterOperations, DeployResult, TypeElement, InstanceElement,
  ObjectType, isListType, isObjectType, isMapType, Values,
} from '@salto-io/adapter-api'
import { client as clientUtils, logDuration } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import ZuoraClient, { UnauthorizedError } from './client/client'
import {
  ZuoraConfig, API_MODULES_CONFIG, DependsOnConfig,
} from './config'
import { FilterCreator, Filter, filtersRunner } from './filter'
import billingSettingsFilter from './filters/billing_settings'
import fieldReferencesFilter from './filters/field_references'
import customObjectsFilter from './filters/custom_objects'
import customObjectSplitFilter from './filters/custom_object_split'
import { generateTypes, ModuleTypeDefs } from './transformers/type_elements'
import { GET_ENDPOINT_SCHEMA_ANNOTATION, GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION, ADDITIONAL_PROPERTIES_FIELD } from './constants'
import { generateInstancesForType } from './transformers/instance_elements'
import { filterEndpointsWithDetails } from './transformers/endpoints'

const { makeArray } = collections.array
const { toArrayAsync } = collections.asynciterable
const log = logger(module)

export const DEFAULT_FILTERS = [
  // customObjectsFilter should run before everything else
  customObjectsFilter,
  billingSettingsFilter,
  // fieldReferencesFilter should run after all elements were created
  fieldReferencesFilter,
  // customObjectSplitFilter should run at the end - splits elements to divide to multiple files
  customObjectSplitFilter,
]

const ARG_PLACEHOLDER_MATCHER = /\{([\w_]+)\}/g

export interface ZuoraAdapterParams {
  filterCreators?: FilterCreator[]
  client: ZuoraClient
  config: ZuoraConfig
}

const computeGetArgs = ({
  endpointName,
  contextElements,
  dependsOn,
}: {
  endpointName: string
  contextElements?: Record<string, InstanceElement[]>
  dependsOn: Record<string, DependsOnConfig>
}): { getArgs: clientUtils.ClientGetParams; calculatedParams?: Values }[] => {
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
    const argName = urlParams[0].slice(1, -1)
    const referenceDetails = dependsOn[argName]
    const contextInstances = (contextElements[referenceDetails.endpoint] ?? [])
    if (!contextInstances) {
      throw new Error(`no instances found for ${referenceDetails.endpoint}, cannot call endpoint ${endpointName}`)
    }
    const potentialParams = contextInstances.map(e => e.value[referenceDetails.field])
    return potentialParams.map(p => ({
      getArgs: {
        url: endpointName.replace(ARG_PLACEHOLDER_MATCHER, p),
      },
      calculatedParams: { [argName]: p },
    }))
  }
  return [{ getArgs: { url: endpointName } }]
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
      config,
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
    }: {
      endpointName: string
      dependsOn: Record<string, DependsOnConfig>
      responseSchema: ObjectType
      contextElements?: Record<string, InstanceElement[]>
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
          const args = computeGetArgs({
            endpointName,
            contextElements,
            dependsOn,
          })

          const results = (await Promise.all(
            args.map(async ({ getArgs, calculatedParams }) => ({
              result: (await toArrayAsync(await this.client.get(getArgs))).flat(),
              // TODON ended up not needing - keeping for now, but can remove if not used
              calculatedParams,
            }))
          )).flatMap(({ result }) => makeArray(result))

          // TODON support extracting multiple data fields?
          const entries = (results
            .flatMap(result => (dataFieldName !== undefined
              ? makeArray(result[dataFieldName] ?? []) as Values[]
              : makeArray(result)))
            .flatMap(result => (extractValues
              ? Object.values(result as Values) // TODON handle casts better
              : makeArray(result ?? []))))
          return entries
        }

        const entries = await getEntries()
        return generateInstancesForType({
          entries,
          objType,
        })
      } catch (e) {
        log.error(`Could not fetch ${endpointName}: ${e}. %s`, e.stack)
        if (e instanceof UnauthorizedError) {
          throw e
        }
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
    // TODO use a real DAG instead, without interfering with parallelizing the requests -
    // run on leaves, starting each one as all its dependencies are complete
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
            independentEndpoints.map(async ({
              endpoint, dependsOn, doNotPersist,
            }) =>
              [
                endpoint,
                {
                  instances: await getInstancesForType({
                    endpointName: endpoint,
                    dependsOn,
                    responseSchema: typesByModuleAndEndpoint[moduleName][endpoint] as ObjectType,
                  }),
                  doNotPersist,
                },
              ])
          )
        )
        const dependentElements = await Promise.all(
          dependentEndpoints.map(async ({
            endpoint, dependsOn, doNotPersist,
          }): Promise<InstanceElement[]> => (doNotPersist
            ? []
            : getInstancesForType({
              endpointName: endpoint,
              dependsOn,
              responseSchema: typesByModuleAndEndpoint[moduleName][endpoint] as ObjectType,
              contextElements: _.mapValues(contextElements, val => val.instances),
            })))
        )
        return [
          // instances can be marked as doNotPersist in order to avoid conflicts if a more-complete
          // version of them is fetched using a dependent endpoint
          ...Object.values(contextElements)
            .flatMap(({ doNotPersist, instances }) => (doNotPersist ? [] : instances)),
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

    log.debug('going to run filters on %d fetched elements', elements.length)
    await this.filtersRunner.onFetch(elements)
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
}
