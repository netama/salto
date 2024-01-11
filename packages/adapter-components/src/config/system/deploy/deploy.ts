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
import { ActionName, Values } from '@salto-io/adapter-api'
import { DefaultWithCustomizations, FilterCondition } from '../shared'
import { HTTPRequest } from './request'
import { DeployResponseTransformationConfig } from './transformation'
import { ChangeIdFunction } from 'src/deployment/grouping'

export type ValueReferenceResolver = (args: { value: Values }) => Values

export type DeployableRequestConfig = {
  // TODON decide if and how to resolve template expressions - maybe add this in default?
  // TODON decide if also to resolve references here + whether to "fail" if there are any leftover references
  // after this step is done?
  additionalResolvers?: ValueReferenceResolver[]
  // when provided, only changes matching the condition will be used in this request
  condition?: FilterCondition
  // dependsOn: string[] // resource names that should be deployed successfully before this one
  request: HTTPRequest
  fromResponse?: DeployResponseTransformationConfig // TODON rename type

  // when true (and matched condition), do not proceed to next requests
  earlyReturn?: boolean
  // TODON also add in - change validators? (already added change group id)
}

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type InstanceDeployApiConfig<A extends string = ActionName> = {
  requestsByAction?: DefaultWithCustomizations<DeployableRequestConfig | DeployableRequestConfig[], A>
  // TODON use getChangeGroupIdsFunc first with the assigned ones, then with the rest
  changeGroupId?: ChangeIdFunction
  // TODON decide if worth adding here or keep as filter format with filtering by type (so can keep order)
  // preDeploy
  // onDeploy
}

export type DeployApiConfig = {
  // TODON requests will move inside client since dependent on endpoint
  instances: DefaultWithCustomizations<InstanceDeployApiConfig> // TODON elements or changes?
}
