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
import { AdapterHTTPClient } from '../../../client'
import { EndpointByPathAndMethod } from './endpoint'


// TODON other clients - libraries (then it will be the function names?),
// input/output is the responsibility of the resource
export type RESTApiClientDefinition<PaginationOptions extends string> = {
  // TODON adjust interface to just support by operation, clarify pagination behavior?
  // TODON alternatively, connect directly with pagination?
  httpClient: AdapterHTTPClient<{}, {}> // TODON expand interface so don't need a class here?
  // TODON see if needed - additional args for initialization / requests
  // TODON do we need this at all? or just use the client directly?
  // initializationArgs?: {
  //   headers?: Record<string, string>
  //   queryArgs?: Record<string, string>
  //   params?: Record<string, Values>
  // }
  endpoints: EndpointByPathAndMethod<PaginationOptions>

  // TODON only relevant for deploy? might want to define it differently, and then if this is only for fetch
  // it will always be strict
  // when true, only the defined endpoints are supported. when false, unknown endpoints are supported with the default config
  // TODON extend to allowed patterns by method and path instead?
  strict: boolean
}

// TODON expand to other client types
export type ApiClientDefinition<PaginationOptions extends string> = RESTApiClientDefinition<PaginationOptions>
