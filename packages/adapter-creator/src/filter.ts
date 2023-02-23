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
import { SaltoError } from '@salto-io/adapter-api'
import { filterUtils } from '@salto-io/adapter-components'
import { Client } from './client'
import { Config } from './config'

export const { filtersRunner } = filterUtils

export type FilterResult = {
  errors?: SaltoError[]
}

export type Filter = filterUtils.Filter<FilterResult>

export type FilterContext = Pick<Config, 'fetch' | 'apiComponents' | 'references'>
export type FilterCreator<Credentials> = filterUtils.FilterCreator<Client<Credentials>, FilterContext>
