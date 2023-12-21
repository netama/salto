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
import { getChangeData } from '@salto-io/adapter-api'
import { applyInPlaceforInstanceChangesOfType } from '@salto-io/adapter-utils'
import { FilterCreator } from '../filter'
import { MACRO_TYPE_NAME } from '../constants'

/**
 * This filter adds the restriction field as null to a macro with no restriction field.
 */
const filterCreator: FilterCreator = () => ({
  name: 'macroFilter',
  preDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    typeNames: [MACRO_TYPE_NAME],
    additionalCondition: change => getChangeData(change).value.restriction === undefined,
    func: inst => { inst.value.restriction = null },
  }),
  onDeploy: changes => applyInPlaceforInstanceChangesOfType({ // restore
    changes,
    typeNames: [MACRO_TYPE_NAME],
    additionalCondition: change => getChangeData(change).value.restriction === null,
    func: inst => { delete inst.value.restriction },
  }),
})

export default filterCreator
