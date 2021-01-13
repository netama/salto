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
  FetchResult, AdapterOperations, DeployResult, Element, isInstanceElement, Values, DeployOptions,
} from '@salto-io/adapter-api'
import { naclCase } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections, decorators, values as lowerdashValues } from '@salto-io/lowerdash'
import ZendeskClient, { ClientGetParams } from './client/client'
import { ZendeskConfig, API_CONFIG, DISABLE_FILTERS, EndpointConfig } from './types'
import { FilterCreator, Filter, filtersRunner } from './filter'
import { generateType, addGetEndpointAnnotations } from './transformers/type_elements'
import { toInstance } from './transformers/instance_elements'
import { endpointToTypeName, findNesteField } from './transformers/transformer'
import { PAGINATION_FIELDS } from './constants'

const log = logger(module)
const { makeArray } = collections.array
const { isDefined } = lowerdashValues

const ARG_PLACEHOLDER_MATCHER = /\$\{([\w._]+)\}/g
// const EXACT_ARG_PLACEHODER_MATCHER = /^\{([\w._]+)\}$/
// TODON only supporting what we need for now - '${.<fieldName>}'
const EXACT_ARG_PLACEHODER_MATCHER = /^\$\{\.([\w_]+)\}$/

export const DEFAULT_FILTERS = [
]

export interface ZendeskAdapterParams {
  filterCreators?: FilterCreator[]
  client: ZendeskClient
  config: ZendeskConfig
}

const logDuration = (message: string): decorators.InstanceMethodDecorator =>
  decorators.wrapMethodWith(
    async (original: decorators.OriginalCall): Promise<unknown> => (
      log.time(original.call, message)
    )
  )

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
        api: config.api,
      },
      filterCreators,
    )
  }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<Element[]> {
    const getTypeAndInstances = async (
      {
        endpoint,
        queryParams,
        paginationField,
        fieldsToOmit,
        hasDynamicFields,
        nameField,
        pathField,
        keepOriginal,
      }: EndpointConfig,
      contextElements?: Record<string, Element[]>,
    ): Promise<Element[]> => {
      const computeGetArgs = (): ClientGetParams[] => {
        const queryArgs = _.omitBy(queryParams, val => EXACT_ARG_PLACEHODER_MATCHER.test(val))
        const recursiveQueryArgs = _.mapValues(
          _.pickBy(queryParams, val => EXACT_ARG_PLACEHODER_MATCHER.test(val)),
          // TODON for now only variables inside the entry are supported - extend
          val => ((entry: Values): string => entry[val.slice(3, -1)])
        )
        // TODON split queryParams into fixed, recursive, and depending on other element types
        // TODON determine fetch order based on that (or just run in configuration order?)
        if (contextElements !== undefined) {
          if (endpoint.includes('$')) {
            // TODON just one for now - check if need to extend
            const urlParams = endpoint.match(ARG_PLACEHOLDER_MATCHER)
            if (urlParams === null) {
              // TODON catch earlier in the validation
              throw new Error(`invalid endpoint definition ${endpoint}`)
            }
            if (urlParams.length > 1) {
              // TODON add handling
              throw new Error(`too many variables in endpoint ${endpoint}`)
            }
            // TODON improve
            const [referenceEndpoint, field] = urlParams[0].slice(2, -1).split('.')
            const contextInstances = (contextElements[`/${referenceEndpoint}`] ?? []).filter(
              isInstanceElement
            )
            if (!contextInstances) {
              throw new Error(`no instances found for ${referenceEndpoint}, cannot call endpoint ${endpoint}`)
            }
            const potentialParams = contextInstances.map(e => e.value[field])
            return potentialParams.map(p => ({
              endpointName: endpoint.replace(ARG_PLACEHOLDER_MATCHER, p),
              queryArgs,
              recursiveQueryArgs,
              paginationField,
            }))
          }
        }
        return [{ endpointName: endpoint, queryArgs, recursiveQueryArgs, paginationField }]
      }
      const getEntries = async (): Promise<Values[]> => {
        const getArgs = computeGetArgs()
        return (await Promise.all(
          // TODON anything to do on error? collect so we can report and suggest to disable?
          getArgs.map(args => this.client.get(args))
        )).flatMap(r => r.result.map(entry =>
          (fieldsToOmit !== undefined
            ? _.omit(entry, fieldsToOmit)
            : entry
          )))
      }

      const entries = await getEntries()

      // escape "field" names with '.'
      // TODON instead handle in filter? (not sure if "." is consistent enough for actual nesting)
      const naclEntries = entries.map(e => _.mapKeys(e, (_val, key) => naclCase(key)))

      // endpoints with dynamic fields will be associated with the dynamic_keys type

      const { type, nestedTypes } = generateType(
        endpointToTypeName(endpoint),
        naclEntries,
        hasDynamicFields === true,
      )
      const nestedFieldDetails = findNesteField(type)
      addGetEndpointAnnotations(type, endpoint, nestedFieldDetails?.field.name)

      const instances = naclEntries.flatMap((entry, index) => {
        if (nestedFieldDetails !== undefined && !keepOriginal) {
          return makeArray(entry[nestedFieldDetails.field.name]).flatMap(
            (nestedEntry, nesteIndex) => toInstance({
              entry: nestedEntry,
              type: nestedFieldDetails.type,
              nameField: nameField ?? this.userConfig[API_CONFIG].defaultNameField,
              pathField: pathField ?? this.userConfig[API_CONFIG].defaultPathField,
              defaultName: `inst_${index}_${nesteIndex}`, // TODON improve
              fieldsToOmit,
              hasDynamicFields,
            })
          ).filter(isDefined)
        }
        // TODON same for dynamicFields types?

        log.info(`storing full entry for ${type.elemID.name}`)
        return toInstance({
          entry,
          type,
          nameField: nameField ?? this.userConfig[API_CONFIG].defaultNameField,
          pathField,
          defaultName: `inst_${index}`,
          // we only omit the pagination fields at the top level
          fieldsToOmit: [...PAGINATION_FIELDS, ...(fieldsToOmit ?? [])],
          hasDynamicFields,
        })
      })
      return [type, ...nestedTypes, ...instances].filter(isDefined)
    }

    // for now assuming flat dependencies for simplicity
    // TODO use a real DAG instead (without interfering with parallelizing the requests),
    // (not yet needed for zendesk, but keeping for now)
    const [independentEndpoints, dependentEndpoints] = _.partition(
      this.userConfig[API_CONFIG].getEndpoints.map(e => ({
        ...e,
        fieldsToOmit: [...e.fieldsToOmit ?? [], ...this.userConfig[API_CONFIG].fieldsToOmit ?? []],
      })),
      e => _.isEmpty(e.dependsOn)
    )
    const contextElements: Record<string, Element[]> = Object.fromEntries(await Promise.all(
      independentEndpoints.map(async e => [e.endpoint, await getTypeAndInstances(e)])
    ))
    const dependentElements = await Promise.all(
      dependentEndpoints.map(e => getTypeAndInstances(e, contextElements))
    )
    return [
      ...Object.values(contextElements).flat(),
      ...dependentElements.flat(),
    ]
  }

  /**
   * Fetch configuration elements in the given Zendesk account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    log.debug('going to fetch zendesk account configuration..')
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
  async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    // TODON add preDeploy step for re-escaping fields parsed as JSON (if needed)
    throw new Error(`Not implemented. ${this.client !== undefined} ${changeGroup.changes.length}`)
  }
}
