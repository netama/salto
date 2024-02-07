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
import { ActionName, AdapterOperations, ChangeValidator, ElemIdGetter, InstanceElement } from '@salto-io/adapter-api'
import { definitions, filterUtils } from '@salto-io/adapter-components'
import { types } from '@salto-io/lowerdash'
import { Client } from '../client'

// TODON move inside adapter-components? or keep here?

// TODON export either from here or from adapter-components / adapter-api -
// and reuse as base line where relevant in existing adapters?
export interface AdapterParams<
  Credentials,
  Co extends definitions.UserConfig,
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName,
> {
  filterCreators: filterUtils.AdapterFilterCreator<
    definitions.UserConfig,
    filterUtils.FilterResult,
    {},
    ClientOptions,
    PaginationOptions,
    Action
  >[]
  clients: Record<ClientOptions, Client<Credentials>>
  definitions: types.PickyRequired<
    definitions.ApiDefinitions<ClientOptions, PaginationOptions, Action>,
    'clients' | 'pagination' | 'fetch'
  >
  config: Co
  configInstance?: InstanceElement // TODON templatize on Co?
  getElemIdFunc?: ElemIdGetter
  additionalChangeValidators?: Record<string, ChangeValidator>
  adapterName: string
  accountName: string
}

export interface AdapterImplConstructor<
  Credentials,
  Co extends definitions.UserConfig,
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName,
> {
  new (args: AdapterParams<Credentials, Co, ClientOptions, PaginationOptions, Action>): AdapterOperations
}
