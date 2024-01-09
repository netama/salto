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

import { ApiClientConfig } from './client' // TODON allow subdomain-based client for guide...
import { DeployApiConfig } from './deploy'
import { FetchApiConfig } from './fetch'

// TODON deploy: change to resources, fetch: resource to instances

// element scope -> requests -> resources* -> elements

// changes -> resources -> requests -> (detailed changes adding ids etc)

// TODON decide how this should look in deploy when there are multiple modules - just rely on dependencies between them?
export type ApiConfig = {
  // TODON add
  // auth: AuthConfig // TODON
  // clients will be initialized as part of a big "client" in the adapter creator,
  // but need to be "registered" here in order to be used by the infra
  // TODON use some "pointer" / flag to mark the default instead?
  clients: Record<'default' | string, ApiClientConfig> // should contain a list of supported endpoints by endpoint+verb
  // references: ReferencesConfig // already defined elsewhere
  fetch: FetchApiConfig
  deploy: DeployApiConfig
}
