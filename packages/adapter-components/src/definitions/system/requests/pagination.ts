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
import { Values } from '@salto-io/adapter-api'
import { PaginationFuncCreator } from '../../../client'

// TODON decide if should move a level up to match the api.ts structure?

export type PaginationDefinitions = {
  funcCreator: PaginationFuncCreator // TODON should probably adjust + have headers / query args / params
  clientArgs?: {
    headers?: Record<string, string>
    queryArgs?: Record<string, string>
    params?: Record<string, Values>
  }
}
