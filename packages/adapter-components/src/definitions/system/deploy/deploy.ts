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
import { Change, InstanceElement, Values } from '@salto-io/adapter-api'
import { DefaultWithCustomizations } from '../shared'
import { DeployRequestDefinition } from './request'
import { DeployResponseTransformationDefinition } from './transformation'
import { ChangeIdFunction } from '../../../deployment/grouping'
import { InstanceChangeAndGroup } from './types'

export type ValueReferenceResolver = (args: { value: Values }) => Values

type FilterCondition = (args: InstanceChangeAndGroup) => boolean

export type DeployableRequestDefinition<ClientOptions extends string> = {
  // when provided, only changes matching the condition will be used in this request
  condition?: FilterCondition
  // TODON add polling - SALTO-5414
  // TODON allow customizations
  request: DeployRequestDefinition<ClientOptions>
  fromResponse?: DeployResponseTransformationDefinition

  // when true (and matched condition), do not proceed to next requests
  earlyReturn?: boolean
}

export type InstanceDeployApiDefinitions<Action extends string, ClientOptions extends string> = {
  // TODON implement (add a task) - check on instance value
  // guard?: ArgsWithCustomizer<boolean, ValidationDefinitions>

  // a sorted list of requests to make in order to deploy a change of this type
  requestsByAction: DefaultWithCustomizations<DeployableRequestDefinition<ClientOptions>[], Action>

  // for modifications, whether to make any request if the before and after values are identical
  // note that if there is _any_ difference in the values, all requests will be made
  // default: false
  deployEqualValues?: boolean

  // types that should be deployed first when listed inside the same change group
  // TODON see if need to make this more granular + better cycle detection
  dependsOnTypes?: string[]

  // how many changes of this type can be deployed in parallel
  // default = unlimited (max concurrency)
  // note: max concurrency can also be set by using a non-positive number
  concurrency?: number

  // // TODON turn into an infra task (can reuse fetch patterns)
  // batching?: {
  //   // -1 = unlimited
  //   // default: each request is sent separately
  //   maxBatchSize: number
  //   // TODON need to group together
  // }

  // by default, actions are taken from the change action. this fuction can be used to customize this behavior
  toActionName?: (change: Change<InstanceElement>) => Action

  // TODON add a separate infra task?
  referenceResolution?: {
    // when to deploy references -
    // - early resolution happens in the beginning of the change group's deploy logic, and restored before exiting
    // - on_demand resolution is done only for the relevant deploy requests and never persisted
    // default is on_demand
    // TODON extend more, add smarter logic to avoid too-early resolution for undefined values
    when?: 'on_demand' | 'early'
    // TODON allow additional resolvers - TBD whether needed at the type level, or can be done globally for now
    // TODON make sure this can handle template expressions correctly as well
  }

  changeGroupId?: ChangeIdFunction
  // TODON later - custom change validators by type?
}

export type DeployApiDefinitions<Action extends string, ClientOptions extends string> = {
  // TODON allow to "view" the rest of the plan's changes (should change in the context core passes to the adapter),
  // and not only the change group, to allow depending on changes in other groups and splitting the groups better?
  // e.g. modify-instead-of-add if the parent implicitly created the child?
  instances: DefaultWithCustomizations<InstanceDeployApiDefinitions<Action, ClientOptions>>
}

export type DeployApiDefinitionsNoDefault<Action extends string, ClientOptions extends string> = {
  instances: Record<string, InstanceDeployApiDefinitions<Action, ClientOptions>>
}
