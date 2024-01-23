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
import { ActionName } from '@salto-io/adapter-api'
import { ApiClientDefinition, PaginationDefinitions } from './requests' // TODON allow subdomain-based client for guide...
import { OptionsWithDefault } from './shared'
import { OpenAPIDefinition } from './sources'
import { FetchApiDefinitions } from './fetch'
import { DeployApiDefinitions } from './deploy'

// TODON deploy: change to resources, fetch: resource to instances

// element scope -> requests -> resources* -> elements

// changes -> resources -> requests -> (detailed changes adding ids etc)

// TODON decide how this should look in deploy when there are multiple modules - just rely on dependencies between them?
// TODON infer options from clients+pagination?
export type ApiDefinitions<
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName
> = {
  // sources are processed and used to populate initial options for clients and components, in order of definition,
  // followed by the rest of the adjustments
  sources?: {
    openAPI?: OpenAPIDefinition<ClientOptions>[]
  }

  // TODON add
  // auth: AuthDefinitions // TODON

  // clients will be initialized as part of a big "client" in the adapter creator,
  // but need to be "registered" here in order to be used by the infra
  // TODON should be initialized in adapter creator?
  // TODON can avoid default?
  clients: OptionsWithDefault<ApiClientDefinition<PaginationOptions>, ClientOptions>

  // supported pagination options. when missing, no pagination is used (TODON add warning)
  pagination: Record<PaginationOptions, PaginationDefinitions>

  // references: ReferenceDefinitions // already defined elsewhere

  // TODON decide if there's a reason to formalize components - vs just having a pattern
  // for how to have them in different files and merge together
  // (since overlaps are not allowed anyway)
  // TODON the advantage is the ability to add a prefix for all of them - decide if worth it
  // components: Record<ComponentNames, ComponentDefinitions<Action, ClientOptions>>

  // TODON do NOT have here defaults+customizations either - these are "development" tools for generating the
  // final config. instead, should be a list of final definitions when called in-memory!
  // and should log / create an artifact with what it computed into.

  fetch?: FetchApiDefinitions
  deploy?: DeployApiDefinitions<Action>


  // TODON temp flag for development, decide if should keep here or elsewhere - e.g. in adapter-creator?
  // TODON when on, will also log info and suggestions for initializing the adapter
  initializing?: boolean // TODON maybe "verbose" / "analyze" - or do elsewhere and not here
}
