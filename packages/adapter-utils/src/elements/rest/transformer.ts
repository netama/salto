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
import { InstanceElement, ObjectType, isListType, isMapType, isObjectType, Values } from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { HTTPClientInterface, UnauthorizedError, ClientGetParams } from '../../client'
import { AdapterApiConfig, UserFetchConfig, DependsOnConfig, ElementTranslationDefaultsConfig, ElementTranslationConfig } from './endpoint_config'
import { generateInstancesForType } from './instance_elements'
import { ADDITIONAL_PROPERTIES_FIELD } from './type_elements'
import { filterEndpointsWithDetails } from './endpoint_filter'
import { findDataField } from './field_finder'

const { makeArray } = collections.array
const { toArrayAsync } = collections.asynciterable
const log = logger(module)

const ARG_PLACEHOLDER_MATCHER = /\{([\w_]+)\}/g

export const computeGetArgs = ({
  url,
  contextElements,
  dependsOn,
}: {
  url: string
  contextElements?: Record<string, InstanceElement[]>
  dependsOn?: Record<string, DependsOnConfig>
}): ClientGetParams[] => {
  if (url.includes('{')) {
    if (contextElements === undefined || dependsOn === undefined || _.isEmpty(dependsOn)) {
      throw new Error(`cannot resolve endpoint ${url} - missing context`)
    }

    const urlParams = url.match(ARG_PLACEHOLDER_MATCHER)
    if (urlParams === null) {
      // TODO catch earlier in the validation
      throw new Error(`invalid endpoint definition ${url}`)
    }
    if (urlParams.length > 1) {
      // not needed yet (when it is, we will need to decide which combinations to use)
      throw new Error(`too many variables in endpoint ${url}`)
    }
    const argName = urlParams[0].slice(1, -1)
    const referenceDetails = dependsOn[argName]
    const contextInstances = (contextElements[referenceDetails.endpoint] ?? [])
    if (!contextInstances) {
      throw new Error(`no instances found for ${referenceDetails.endpoint}, cannot call endpoint ${url}`)
    }
    const potentialParams = contextInstances.map(e => e.value[referenceDetails.field])
    return potentialParams.map(p => ({
      url: url.replace(ARG_PLACEHOLDER_MATCHER, p),
    }))
  }
  return [{ url }]
}

/**
 * Fetch all instances for the specified type, generating the needed API requests
 * based on the endpoint configuration. For endpoints that depend on other endpoints,
 * use the already-fetched elements as context in order to determine the right requests.
 */
const getInstancesForType = async ({
  client,
  url,
  type,
  contextElements,
  dependsOn,
  translation,
  translationDefaults,
  dataField,
}: {
  client: HTTPClientInterface
  url: string
  type: ObjectType
  contextElements?: Record<string, InstanceElement[]>
  dependsOn?: Record<string, DependsOnConfig>
  translation?: ElementTranslationConfig
  translationDefaults: ElementTranslationDefaultsConfig
  dataField?: string
}): Promise<InstanceElement[]> => {
  try {
    const dataFieldName = dataField ?? findDataField(
      type,
      translationDefaults.topLevelIndicatorFields,
      translationDefaults.topLevelFieldsToOmit,
    )

    const getType = (): { objType: ObjectType; extractValues?: boolean } => {
      const dataFieldType = (dataFieldName !== undefined
        ? type.fields[dataFieldName].type
        : type)

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
        url,
        contextElements,
        dependsOn,
      })

      const results = (await Promise.all(
        args.map(async getArgs => ((await toArrayAsync(await client.get(getArgs))).flat()))
      )).flatMap(makeArray)

      const entries = (results
        .flatMap(result => (dataFieldName !== undefined
          ? makeArray(result[dataFieldName] ?? []) as Values[]
          : makeArray(result)))
        .flatMap(result => (extractValues
          ? Object.values(result as Values)
          : makeArray(result ?? []))))
      return entries
    }

    const entries = await getEntries()
    return generateInstancesForType({
      entries,
      objType,
      translation,
      translationDefaults,
    })
  } catch (e) {
    log.error(`Could not fetch ${url}: ${e}. %s`, e.stack)
    if (e instanceof UnauthorizedError) {
      throw e
    }
    return []
  }
}

/**
 * Get all instances from all types included in the fetch configuration.
 */
export const getAllInstances = async ({
  client,
  typeByEndpoint,
  apiConfig,
  fetchConfig,
}: {
  client: HTTPClientInterface
  typeByEndpoint: Record<string, ObjectType>
  apiConfig: AdapterApiConfig
  fetchConfig: UserFetchConfig
}): Promise<InstanceElement[]> => {
  const fetchEndpoints = filterEndpointsWithDetails(
    apiConfig,
    fetchConfig,
    typeByEndpoint,
  )

  // for now assuming flat dependencies for simplicity.
  // will replace with a DAG (with support for concurrency) when needed
  const [independentEndpoints, dependentEndpoints] = _.partition(
    fetchEndpoints,
    e => _.isEmpty(e.request?.dependsOn)
  )

  const contextElements: Record<string, {
    instances: InstanceElement[]
    doNotPersist?: boolean
  }> = Object.fromEntries(
    await Promise.all(
      independentEndpoints.map(async ({ url, dataField, request, translation }) =>
        [
          url,
          {
            instances: await getInstancesForType({
              client,
              url,
              dependsOn: request?.dependsOn,
              type: typeByEndpoint[url],
              translation,
              translationDefaults: apiConfig.translationDefaults,
              dataField,
            }),
            doNotPersist: translation?.doNotPersist,
          },
        ])
    )
  )
  const dependentElements = await Promise.all(
    dependentEndpoints.map(async ({ url, dataField, request, translation }) => (
      translation?.doNotPersist
        ? []
        : getInstancesForType({
          client,
          url,
          dependsOn: request?.dependsOn,
          type: typeByEndpoint[url],
          contextElements: _.mapValues(contextElements, val => val.instances),
          translation,
          translationDefaults: apiConfig.translationDefaults,
          dataField,
        })
    ))
  )

  return [
    // instances can be marked as doNotPersist in order to avoid conflicts if a more-complete
    // version of them is fetched using a dependent endpoint
    ...Object.values(contextElements)
      .flatMap(({ doNotPersist, instances }) => (doNotPersist ? [] : instances)),
    ...dependentElements.flat(),
  ].flat()
}
