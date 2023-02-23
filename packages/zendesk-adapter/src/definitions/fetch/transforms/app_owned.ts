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

// TODON generalize and move to adapter-components - keyBy (maybe even make this configurable?)
export const transform: definitions.fetch.ResourceTransformFunc = ({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)) {
    // TODON improve
    throw new Error('Could not transform business hours schedule value')
  }
  if (!Array.isArray(value.parameters) || !value.parameters.every(param => param.name !== undefined)) {
    // TODON pass in service id context to help logging?
    // TODON allow throwing and catch in a better way
    throw new Error('unexpected parameters value')
  }
  return {
    value: {
      ...value,
      parameters: _.keyBy(value.parameters, 'name'),
    },
  }
}
