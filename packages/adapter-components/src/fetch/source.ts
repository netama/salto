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
import { ActionName, TypeElement } from '@salto-io/adapter-api'
// import { types } from '@salto-io/lowerdash'
import { ApiDefinitions } from '../definitions'

export type ProcessedSources<
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string = ActionName
> = {
  additionalDefs: Partial<ApiDefinitions<ClientOptions, PaginationOptions, Action>>
  predefinedTypes: Record<string, TypeElement>
}

// TODON also relevant for deploy, move to its own location
export const processSources = async <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string = ActionName
>(_defs: ApiDefinitions<ClientOptions, PaginationOptions, Action>):
    Promise<ProcessedSources<ClientOptions, PaginationOptions, Action>> => {
  // TODO
  const additionalDefs = {}
  const predefinedTypes = {}
  return {
    additionalDefs,
    predefinedTypes,
  }
}
