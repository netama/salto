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
import { Values } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, DefaultWithCustomizations, FilterCondition } from '../shared'
import { HTTPRequest } from './request'
import { DeployResponseTransformationDefinitions } from './transformation'
import { ChangeIdFunction } from '../../../deployment/grouping'

export type ValueReferenceResolver = (args: { value: Values }) => Values

export type ValidationDefinitions = {
  schema: unknown // TODON decide - can be Joi / something else
}

// TODON:
// Ori: (make sure nacls are not updated when doing this) applied changes should only reflect the
// changes that succeeeded? figure out how to restore

export type DeployableRequestDefinitions = {
  // TODON decide if and how to resolve template expressions - maybe add this in default?
  // TODON decide if also to resolve references here + whether to "fail" if there are any leftover references
  // after this step is done?
  additionalResolvers?: ValueReferenceResolver[]
  // when provided, only changes matching the condition will be used in this request
  condition?: FilterCondition // TODON add easy way to validate schemas with typeguards
  // TODON use
  validate?: ArgsWithCustomizer<boolean, ValidationDefinitions>
  // dependsOn: string[] // resource names that should be deployed successfully before this one
  request: HTTPRequest // TODON add client
  fromResponse?: DeployResponseTransformationDefinitions // TODON rename type

  // when true (and matched condition), do not proceed to next requests
  earlyReturn?: boolean
  // TODON also add in - change validators? (already added change group id)
}

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type InstanceDeployApiDefinitions<
  Action extends string,
> = {
  requestsByAction?: DefaultWithCustomizations<
    DeployableRequestDefinitions[],
    Action
  >
  // TODON use getChangeGroupIdsFunc first with the assigned ones, then with the rest
  changeGroupId?: ChangeIdFunction
  // TODON decide if worth adding here or keep as filter format with filtering by type (so can keep order)
  // preDeploy
  // onDeploy
}

export type DeployApiDefinitions<Action extends string> = {
  // TODON requests will move inside client since dependent on endpoint
  // TODON allow to "view" the rest of the plan's changes (should change in the context core passes to the adapter),
  // and not only the change group, to allow depending on changes in other groups and splitting the groups better?
  // e.g. modify-instead-of-add if the parent implicitly created the child?
  instances: DefaultWithCustomizations<InstanceDeployApiDefinitions<Action>> // TODON elements or changes?
  // TODON default MUST be shared across components, because we don't know how to pick it -
  // unless ****requiring an entry*****?
}

export type DeployApiDefinitionsNoDefault<Action extends string> = {
  instances: Record<string, InstanceDeployApiDefinitions<Action>>
}
