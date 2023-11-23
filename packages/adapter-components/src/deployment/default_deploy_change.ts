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
import {
  ActionName,
  Change,
  ElemID,
  getChangeData,
  InstanceElement,
  isAdditionOrModificationChange,
  isModificationChange,
  isEqualValues,
  SaltoElementError,
} from '@salto-io/adapter-api'
import { AdapterHTTPClient } from '../client/http_client'
import { AdapterApiConfig, AdapterSwaggerApiConfig } from '../config'
import { ClientRateLimitConfig } from '../definitions'
import { filterIgnoredValues } from './filtering'
import { assignServiceId, deployChange, ResponseResult } from './deploy_steps'

/**
 * Deploy change with the standard "add", "modify", "remove" endpoints
 */
export const defaultDeployChange = async <
  TCredentials,
  TRateLimitConfig extends ClientRateLimitConfig,
  TActionName extends string = ActionName,
>({
  change,
  client,
  apiDefinitions, // TODON switch to new config
  fieldsToIgnore,
  queryParams,
  convertError,
  deployEqualValues = false,
}: {
  change: Change<InstanceElement>
  client: AdapterHTTPClient<TCredentials, TRateLimitConfig>
  apiDefinitions: AdapterApiConfig | AdapterSwaggerApiConfig<TActionName | 'add'>
  fieldsToIgnore?: string[]
  queryParams?: Record<string, string>
  convertError: (elemID: ElemID, error: Error) => Error | SaltoElementError
  deployEqualValues?: boolean
}): Promise<ResponseResult> => {
  if (isModificationChange(change) && !deployEqualValues) {
    // TODON get rid of the flag? not sure
    const valuesBefore = (await filterIgnoredValues(change.data.before.clone(), fieldsToIgnore ?? [], [])).value
    const valuesAfter = (await filterIgnoredValues(change.data.after.clone(), fieldsToIgnore ?? [], [])).value

    if (isEqualValues(valuesBefore, valuesAfter)) {
      return undefined
    }
  }

  const { deployRequests } = apiDefinitions.types[getChangeData(change).elemID.typeName]
  try {
    const response = await deployChange({
      change,
      client,
      endpointDetails: deployRequests,
      fieldsToIgnore,
      queryParams,
    })

    if (isAdditionOrModificationChange(change)) {
      assignServiceId({
        response,
        change,
        apiDefinitions,
        dataField: deployRequests?.add?.deployAsField, // TODON from zd, see if relevant for others - if not wrap in zd
      })
    }
    return response
  } catch (err) {
    throw convertError(getChangeData(change).elemID, err)
  }
}
