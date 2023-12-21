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
import { applyInPlaceforInstanceChangesOfType } from '@salto-io/adapter-utils'
import { FilterCreator } from '../../filter'
import { CUSTOM_OBJECT_TYPE_NAME } from '../../constants'

const customObjectFilter: FilterCreator = () => ({
  name: 'addFieldOptionsFilter',
  preDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    typeNames: [CUSTOM_OBJECT_TYPE_NAME],
    func: instance => { // copy values (seen in other places -> pattern?)
      instance.value.title = instance.value.raw_title
      instance.value.title_pluralized = instance.value.raw_title_pluralized
      instance.value.description = instance.value.raw_description
    },
  }),
  onDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    typeNames: [CUSTOM_OBJECT_TYPE_NAME],
    func: instance => { // restore
      delete instance.value.title
      delete instance.value.title_pluralized
      delete instance.value.description
    },
  }),
})

export default customObjectFilter
