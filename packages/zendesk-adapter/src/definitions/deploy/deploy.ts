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
import { ActionName } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { DEPLOY_DEFAULTS } from './defaults'
import { SUPPORT_DEPLOY_DEF } from './support'
import { GUIDE_DEPLOY_DEF } from './guide'

export const createDeployDefinitions = (): definitions.deploy.DeployApiDefinitions<ActionName> => ({
  instances: {
    default: DEPLOY_DEFAULTS,
    customizations: {
      ...GUIDE_DEPLOY_DEF, // TODON decide if should disable defs when not enabled in user config?
      ...SUPPORT_DEPLOY_DEF,
    },
  },
})
