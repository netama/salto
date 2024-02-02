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
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { Value, Values } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'

const valToString = (val: Value): string | string[] => (_.isArray(val) ? val.map(String) : val?.toString())

// TODON missing type guard (in current code as well)
// TODON consider only working with value to simplify function? or adding a wrapper
export const transform: definitions.deploy.DeployAdjustRequest = ({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)
    || !lowerdashValues.isPlainObject(value.conditions)
  ) {
    throw new Error('!') // TODON add type guard
  }

  const tempValue = value as Values // TODON avoid

  return {
    value: {
      ..._.omit(value, 'conditions', 'execution'),
      all: (tempValue.conditions.all ?? []) // transformation? keep as custom code (for transformation)?
        .map((e: Values) => ({ ...e, value: valToString(e.value) })),
      any: (tempValue.conditions.any ?? [])
        .map((e: Values) => ({ ...e, value: valToString(e.value) })),
      output: { // same - can either transform as pick + some mapping, or keep custom
        ...tempValue.execution,
        group_by: tempValue.execution.group_by?.toString(),
        sort_by: tempValue.execution.sort_by?.toString(),
        columns: tempValue.execution.columns?.filter(_.isPlainObject)
          .map((c: Values) => c.id).filter(lowerdashValues.isDefined) ?? [],
      },
    },
  }
}
