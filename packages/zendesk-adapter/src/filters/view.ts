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
import { InstanceElement, Value, Values } from '@salto-io/adapter-api'
import { applyInPlaceforInstanceChangesOfType } from '@salto-io/adapter-utils'
import { values } from '@salto-io/lowerdash'
import { FilterCreator } from '../filter'
import { VIEW_TYPE_NAME } from '../constants'

const valToString = (val: Value): string | string[] => (_.isArray(val) ? val.map(String) : val?.toString())

/**
 * Deploys views
 */
const filterCreator: FilterCreator = () => ({
  name: 'viewFilter',
  preDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    typeNames: [VIEW_TYPE_NAME],
    func: (instance: InstanceElement) => {
      instance.value = {
        ...instance.value,
        all: (instance.value.conditions.all ?? []) // transformation? keep as custom code (for transformation)?
          .map((e: Values) => ({ ...e, value: valToString(e.value) })),
        any: (instance.value.conditions.any ?? [])
          .map((e: Values) => ({ ...e, value: valToString(e.value) })),
        output: { // same - can either transform as pick + some mapping, or keep custom
          ...instance.value.execution,
          group_by: instance.value.execution.group_by?.toString(),
          sort_by: instance.value.execution.sort_by?.toString(),
          columns: instance.value.execution.columns?.filter(_.isPlainObject)
            .map((c: Values) => c.id).filter(values.isDefined) ?? [],
        },
      }
    },
  }),
  onDeploy: changes => applyInPlaceforInstanceChangesOfType({ // TODON one-way, can skip
    changes,
    typeNames: [VIEW_TYPE_NAME],
    func: (instance: InstanceElement) => {
      instance.value = _.omit(instance.value, ['all', 'any', 'output'])
    },
  }),
})

export default filterCreator
