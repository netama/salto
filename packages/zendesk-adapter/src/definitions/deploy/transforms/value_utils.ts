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
import _ from 'lodash'
import { definitions } from '@salto-io/adapter-components'
import { values as lowerdashValues } from '@salto-io/lowerdash'

export const omitByValue = (
  path: string, valueToOmit: unknown,
): definitions.deploy.DeployAdjustRequest => ({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error('!') // TODON add type guard
  }

  return {
    value: _.get(value, path) === valueToOmit
      ? _.omit(value, path)
      : value,
  }
}

export const replaceByValue = ({ path, oldValues, newValue }: {
  path: string
  oldValues: unknown[]
  newValue: unknown
}): definitions.deploy.DeployAdjustRequest => ({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error('!') // TODON add type guard
  }

  return {
    value: oldValues.find(v => _.isEqual(v, _.get(value, path))) !== undefined
      ? _.set(value, path, newValue) // TODON assumes cloned! (see comment below)
      : value,
  }
}

export const undefinedToNull = (path: string): definitions.deploy.DeployAdjustRequest => (({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error('!') // TODON add type guard
  }

  if (_.get(value, path) !== undefined) {
    return { value }
  }
  const newVal = _.cloneDeep(value) // TODON for safety should clone in infra if reaching transform? so assume ok?
  _.set(newVal, path, null)
  return {
    value: newVal,
  }
})
