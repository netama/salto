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
import { definitions } from '@salto-io/adapter-components'
import { values as lowerdashValues } from '@salto-io/lowerdash'

export const transform: definitions.fetch.ResourceTransformFunc = ({ value }) => {
  if (!lowerdashValues.isPlainObject(value)) {
    // TODON improve
    throw new Error('Could not transform business hours schedule value')
  }
  // TODON add scheme guard instead of _.get
  const startYear = _.get(value, 'start_date')?.split('-')[0]
  const endYear = _.get(value, 'end_date')?.split('-')[0]
  // const startYear = value.start_date?.split('-')[0]
  // const endYear = value.end_date?.split('-')[0]
  return {
    value: {
      ...value,
      start_year: startYear,
      end_year: endYear,
    },
  }
}
