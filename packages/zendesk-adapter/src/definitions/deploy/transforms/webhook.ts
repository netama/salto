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
import { createSaltoElementError, getChangeData, isModificationChange } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'

export const AUTH_TYPE_TO_PLACEHOLDER_AUTH_DATA: Record<string, unknown> = {
  bearer_token: { token: '123456' },
  basic_auth: { username: 'user@name.com', password: 'password' },
  api_key: { name: 'tempHeader', value: 'tempValue' },
}

/**
 * Removes the authentication data from webhook if it wasn't changed
 */
export const transform: definitions.DeployTransformRequest = ({ value, context }) => {
  if (isModificationChange(context.change)) {
    if (_.isEqual(
      context.change.data.before.value.authentication,
      context.change.data.after.value.authentication,
    )) {
      delete value.authentication
    } else if (value.authentication === undefined) {
      value.authentication = null
    }
  }
  if (value.authentication) {
    const placeholder = AUTH_TYPE_TO_PLACEHOLDER_AUTH_DATA[value.authentication.type]
    if (placeholder === undefined) {
      throw createSaltoElementError({ // caught by deployChanges
        message: `Unknown auth type was found for webhook: ${value.authentication.type}`,
        severity: 'Error',
        elemID: getChangeData(context.change).elemID, // TODON see if want to catch generally, and just throw here?
      })
    }
    value.authentication.data = placeholder
  }
  return { value }
}
