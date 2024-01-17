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
import { ActionName } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { SUPPORT_DEPLOY_CONFIG } from './deploy'
import { CHANGE_GROUP_CONFIG } from './change_groups'
import { ClientOptions } from '../../../requests'

// TODON move to helper utility since will need to duplicate in all components

export const deploy: definitions.deploy.DeployApiDefinitions<ActionName, ClientOptions> = _.merge(
  {},
  SUPPORT_DEPLOY_CONFIG,
  CHANGE_GROUP_CONFIG,
)
