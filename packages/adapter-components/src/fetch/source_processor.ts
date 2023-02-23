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
  TAdditionalClientArgs extends Record<string, unknown> = {},
  Action extends string = ActionName
> = {
  additionalDefs: Partial<ApiDefinitions<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>>
  predefinedTypes: Record<string, TypeElement>
}

export const processSources = async <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  TAdditionalClientArgs extends Record<string, unknown> = {},
  Action extends string = ActionName
>(_defs: ApiDefinitions<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>):
    Promise<ProcessedSources<ClientOptions, PaginationOptions, TAdditionalClientArgs, Action>> => {
  // TODON
  /*
  1. process all endpoints by specific verbs (by default read-only ones - GET / HEAD / OPTIONS, but configurable)
  2. for every type defined as a resource / element - assume its name is the name from the swagger (or the renamed one
    using typeNameOverrides), and search for all "top-level" resources returning it up to
    nesting level 2 (configurable?)
    + write its path. if found, can add an extractor for it.
    TODON should probably be done only in "development" / experimental mode and written to logs -
    and in practice, defined manually in the definitions. to avoid mistakes.
  3. can try to be smart about pagination later...
  4. extract all schemas to object types, as before.
    we should only use the ones we need! - can potentially save some time by only using them as the "roots"?
    since we know what they are. can also have a "parse all" option for development
    can also decide to omit results that have fields identified as "pagination" fields, and keep the rest?
  */
  const additionalDefs = {}
  const predefinedTypes = {}
  return {
    additionalDefs,
    predefinedTypes,
  }
}
