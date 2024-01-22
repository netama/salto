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
import { Values } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'

// TODON missing type guard (in current code as well)
export const transform: definitions.DeployTransformRequest = ({ value }) => ({
  value: {
    ..._.omit(value, 'selected_macros'),
    macros: (value.selected_macros ?? [])
      .filter(_.isPlainObject)
      .map((e: Values) => e.id)
      .filter(lowerdashValues.isDefined),
  },
})
