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
import { Change, ElemID, getChangeData, InstanceElement, ReadOnlyElementsSource, isAdditionOrModificationChange, isAdditionChange } from '@salto-io/adapter-api'
import { inspectValue } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { createUrl } from '../fetch/resource/request_parameters'
import { HTTPReadClientInterface, HTTPWriteClientInterface } from '../client/http_client'
import { DeploymentRequestsByAction, AdapterApiConfig, getConfigWithDefault } from '../config'
import { ResponseValue } from '../client'
import { filterIgnoredValues, filterUndeployableValues } from './filtering'

const log = logger(module)

export type ResponseResult = ResponseValue | ResponseValue[] | undefined

/**
 * Deploy a single change to the service using the given details
 *
 * @param change The change to deploy. The change is expected to be fully resolved
 * (meaning without any ReferenceExpression or StaticFiles)
 * @param client The client to use to make the request
 * @param endpointDetails The details of of what endpoints to use for each action
 * @param fieldsToIgnore Fields to omit for the deployment
 * @param additionalUrlVars Additional url vars to add to the request url
 * @param queryParams Query params to add to the request url
 * @returns: The response data of the request
 */
export const deployChange = async ({
  change,
  client,
  endpointDetails,
  fieldsToIgnore = [],
  additionalUrlVars,
  queryParams,
  elementsSource,
}:{
  change: Change<InstanceElement>
  client: HTTPWriteClientInterface & HTTPReadClientInterface
  endpointDetails?: DeploymentRequestsByAction
  fieldsToIgnore?: string[] | ((path: ElemID) => boolean)
  additionalUrlVars?: Record<string, string>
  queryParams?: Record<string, string>
  elementsSource?: ReadOnlyElementsSource
}): Promise<ResponseResult> => {
  const instance = getChangeData(change)
  log.debug(`Starting deploying instance ${instance.elemID.getFullName()} with action '${change.action}'`)
  const endpoint = endpointDetails?.[change.action]
  if (endpoint === undefined) {
    throw new Error(`No endpoint of type ${change.action} for ${instance.elemID.typeName}`)
  }
  const valuesToDeploy = (await filterIgnoredValues(
    await filterUndeployableValues(getChangeData(change), change.action, elementsSource),
    fieldsToIgnore,
    endpoint.fieldsToIgnore,
    elementsSource,
  )).value

  const url = createUrl({
    instance,
    baseUrl: endpoint.url,
    urlParamsToFields: endpoint.urlParamsToFields,
    additionalUrlVars,
  })
  const data = endpoint.deployAsField
    ? { [endpoint.deployAsField]: valuesToDeploy }
    : valuesToDeploy

  if (_.isEmpty(valuesToDeploy) && isAdditionOrModificationChange(change)) {
    return undefined
  }
  log.trace(`deploying instance ${instance.elemID.getFullName()} with params ${inspectValue({ method: endpoint.method, url, queryParams, data }, { compact: true, depth: 6 })}`)
  const response = await client[endpoint.method]({
    url,
    data: endpoint.omitRequestBody ? undefined : data,
    queryParams,
  })
  return response.data
}

export const assignServiceId = ({
  change, apiDefinitions, response, dataField, addAlsoOnModification = false,
}: {
  change: Change<InstanceElement>
  apiDefinitions: AdapterApiConfig
  response: ResponseResult
  dataField?: string
  addAlsoOnModification?: boolean
}): void => {
  if (!(isAdditionChange(change) || addAlsoOnModification)) {
    return
  }
  if (Array.isArray(response)) {
    log.warn(
      'Received an array for the response of the deploy. Not assigning service id. Action: %s, elem id: %s',
      change.action, getChangeData(change).elemID.getFullName()
    )
    return
  }
  const transformationConfig = getConfigWithDefault(
    apiDefinitions.types[getChangeData(change).elemID.typeName]?.transformation,
    apiDefinitions.typeDefaults.transformation,
  )
  const data = dataField
    ? response?.[dataField]
    : response
  const serviceIdField = transformationConfig.serviceIdField ?? 'id'
  const serviceId = _.get(data, serviceIdField)
  if (serviceId !== undefined) {
    _.set(getChangeData(change).value, serviceIdField, serviceId)
    return
  }
  log.warn('Received unexpected response, could not assign service id to change %s from response %o', getChangeData(change).elemID.getFullName(), response)
}
