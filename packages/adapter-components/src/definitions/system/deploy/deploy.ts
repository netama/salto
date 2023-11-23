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
import { Values } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, DefaultWithCustomizations } from '../shared'
import { HTTPRequest } from './request'
import { DeployResponseTransformationDefinitions } from './transformation'
import { ChangeIdFunction } from '../../../deployment/grouping'
import { InstanceChangeAndGroup } from './types'

export type ValueReferenceResolver = (args: { value: Values }) => Values

export type ValidationDefinitions = {
  // TODO
  // schema: unknown
}

type FilterCondition = (args: InstanceChangeAndGroup) => boolean

export type DeployableRequestDefinitions<ClientOptions extends string> = {
  // TODON decide if and how to resolve template expressions - maybe add this in default?
  // TODON decide if also to resolve references here + whether to "fail" if there are any leftover references
  // after this step is done?
  additionalResolvers?: ValueReferenceResolver[]
  // when provided, only changes matching the condition will be used in this request
  condition?: FilterCondition // TODON add easy way to validate schemas with typeguards
  // TODO finish defining and use
  validate?: ArgsWithCustomizer<boolean, ValidationDefinitions>
  // dependsOn: string[] // resource names that should be deployed successfully before this one within the group
  request: HTTPRequest<ClientOptions>
  fromResponse?: DeployResponseTransformationDefinitions // TODON rename type, use transformation + service id defs?

  // when true (and matched condition), do not proceed to next requests
  earlyReturn?: boolean
}

export type InstanceDeployApiDefinitions<
  Action extends string,
  ClientOptions extends string
> = {
  requestsByAction?: DefaultWithCustomizations<
    DeployableRequestDefinitions<ClientOptions>[],
    Action
  >
  changeGroupId?: ChangeIdFunction
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
