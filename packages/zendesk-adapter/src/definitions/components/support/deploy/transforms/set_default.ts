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
import { getChangeData, isInstanceElement, isReferenceExpression } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { getParents } from '@salto-io/adapter-utils'
import { DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME } from '../../../../../constants'

// TODON continue after others are done
// assuming not yet resolved?
export const setDefaultFlag: definitions.DeployTransformRequest = item => {
  const { value, context } = item
  const firstParent = getParents(getChangeData(context.change))?.[0]
  const newValue = {
    ...value,
    default: value.default = (
      isReferenceExpression(firstParent) && isInstanceElement(firstParent.value)
      && firstParent.value.value[DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME] === item.value
    ),
  }
  return {
    value: newValue,
  }
}
