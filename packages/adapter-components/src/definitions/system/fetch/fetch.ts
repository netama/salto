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

import { DefaultWithCustomizations } from '../shared'
import { FetchResourceDefinition } from './resource'
import { ElementFetchDefinitionWithCustomizer } from './element'

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type InstanceFetchApiDefinitions = {
  resource?: FetchResourceDefinition
  element?: ElementFetchDefinitionWithCustomizer // TODON rename type defs as well everywhere (instance or element?)
}

// TODON decide if should be here, or next to the implementation (under fetch)?
export type FetchApiDefinitions = {
  instances: DefaultWithCustomizations<InstanceFetchApiDefinitions>
}

export type FetchApiDefinitionsNoDefault = {
  // // to allow fetching modules separately? e.g. zendesk guide can have its own fetch config?
  // // e.g. subdomain, brand id (to mark as parent)
  // initialContext: Record<string, Value>

  instances: Record<string, InstanceFetchApiDefinitions>
}
