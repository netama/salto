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
import { createSaltoElementError, getChangeData } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { inspectValue } from '@salto-io/adapter-utils'

const idsAreNumbers = (ids: unknown): ids is number[] => (
  _.isArray(ids) && ids.every(Number.isInteger)
)

export const transformForOrder: (
  orderFieldName: string,
  addPositions?: boolean,
) => definitions.deploy.DeployTransformRequest = (orderFieldName, addPositions) => ({ value, ...args }) => {
  const mergedOrderIDs = (value.active ?? []).concat(value.inactive ?? [])

  const addPositionsToOrder = (ids: unknown): { id: number, position: number }[] => {
    // TODON move to schema guard (only if the values exist)
    if (!idsAreNumbers(ids)) {
      throw createSaltoElementError({ // caught in try block // TODON verify or remove...
        message: `Not all the ids are numbers: ${inspectValue(ids, { maxArrayLength: null })}`,
        severity: 'Error',
        elemID: getChangeData(args.context.change).elemID,
      })
    }
    return ids.map((id, position) => ({ id, position: position + 1 }))
  }

  return {
    value: {
      // TODON seems old code didn't remove these, make sure not needed (probably not since our invention)
      ..._.omit(value, 'active', 'inactive'),
      [orderFieldName]: addPositions ? addPositionsToOrder(mergedOrderIDs) : mergedOrderIDs,
    },
  }
}
