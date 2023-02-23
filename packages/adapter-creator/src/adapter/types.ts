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
import { AdapterOperations, ElemIdGetter, InstanceElement } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { Client } from '../client'
import { Config } from '../config'
import { FilterCreator } from '../filter'

// TODON move inside adapter-components? or keep here?

// TODON export either from here or from adapter-components / adapter-api -
// and reuse as base line where relevant in existing adapters? (not a priority though)
export interface AdapterParams<Credentials, Co extends Config> {
  filterCreators: FilterCreator<Credentials>[]
  client: Client<Credentials> // TODON switch to parent?
  config: Co
  configInstance?: InstanceElement // TODON templatize on Co?
  // callback function to get an existing elemId or create a new one by the ServiceIds values
  getElemIdFunc?: ElemIdGetter
  paginate: clientUtils.PaginationFuncCreator // TODON define method instead?
  adapterName: string
  accountName: string
}

export interface AdapterImplConstructor<Credentials, Co extends Config> {
  new (args: AdapterParams<Credentials, Co>): AdapterOperations
}
