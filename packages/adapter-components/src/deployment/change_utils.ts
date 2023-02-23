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
import { Change, getChangeData, InstanceElement, toChange } from '@salto-io/adapter-api'
import { getParents, resolveChangeElement, references, GetLookupNameFunc } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'

const { awu } = collections.asynciterable
const log = logger(module)
const { isArrayOfRefExprToInstances } = references

// TODON useful or not? if so add tests (missing)
export const createAdditionalParentChanges = async ({
  childrenChanges,
  getLookUpName,
  shouldResolve = true,
}: {
  childrenChanges: Change<InstanceElement>[]
  getLookUpName: GetLookupNameFunc
  shouldResolve?: boolean
}): Promise<Change<InstanceElement>[] | undefined> => {
  const childrenInstance = getChangeData(childrenChanges[0])
  const parents = getParents(childrenInstance)
  if (_.isEmpty(parents) || !isArrayOfRefExprToInstances(parents)) {
    log.error(`Failed to update the following ${
      childrenInstance.elemID.typeName} instances since they have no valid parent: ${
      childrenChanges.map(getChangeData).map(e => e.elemID.getFullName())}`)
    return undefined
  }
  const changes = parents.map(parent => toChange({
    before: parent.value.clone(), after: parent.value.clone(),
  }))
  return shouldResolve
    ? awu(changes).map(change => resolveChangeElement(change, getLookUpName)).toArray()
    : changes
}
