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
import { types } from '@salto-io/lowerdash'
import { ActionName } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { ClientOptions } from './requests'

// TODON move to adapter-components if recurs outside zendesk

export type DeployDefWithDefault = types.PickyRequired<definitions.deploy.DeployApiDefinitions<ActionName, ClientOptions>['instances'], 'customizations'>
export type DeployDefNoDefault = definitions.deploy.DeployApiDefinitionsNoDefault<ActionName, ClientOptions>['instances']
export type InstanceDeployApiDefinitions = definitions.deploy.InstanceDeployApiDefinitions<ActionName, ClientOptions>
export type DeployableRequestDefinitions = definitions.deploy.DeployableRequestDefinitions<ClientOptions>
