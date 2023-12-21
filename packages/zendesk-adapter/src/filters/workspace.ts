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
import {
  InstanceElement, Values,
} from '@salto-io/adapter-api'
import { applyInPlaceforInstanceChangesOfType } from '@salto-io/adapter-utils'
import { values } from '@salto-io/lowerdash'
import { FilterCreator } from '../filter'

const WORKSPACE_TYPE_NAME = 'workspace'

/**
 * Deploys workspaces
 * rename selected_macros to macros + map object to id for deploy, then restore
 */
const filterCreator: FilterCreator = () => ({
  name: 'workspaceFilter',
  preDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    typeNames: [WORKSPACE_TYPE_NAME],
    func: (instance: InstanceElement) => {
      instance.value = {
        ...instance.value,
        macros: (instance.value.selected_macros ?? []) // TODON can be one-way for deploy + renaming a field
          .filter(_.isPlainObject)
          .map((e: Values) => e.id)
          .filter(values.isDefined),
      }
    },
  }),
  onDeploy: changes => applyInPlaceforInstanceChangesOfType({ // restore
    changes,
    typeNames: [WORKSPACE_TYPE_NAME],
    func: (instance: InstanceElement) => {
      instance.value = _.omit(instance.value, ['macros'])
    },
  }),
})

export default filterCreator
