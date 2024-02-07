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
import { Change, getChangeData, InstanceElement, isAdditionChange, isModificationChange } from '@salto-io/adapter-api'

export const shouldDeployIntervals = (change: Change<InstanceElement>): boolean => {
  if (isAdditionChange(change) && (getChangeData(change).value.intervals !== undefined)) {
    return true
  }
  if (isModificationChange(change)
    && (!_.isEqual(change.data.before.value.intervals, change.data.after.value.intervals))) {
    return true
  }
  return false
}
