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
import { AdapterHTTPClient } from '../../../client'
import { EndpointByPathAndMethod } from './http_endpoint'


// TODON other clients - libraries (then it will be the function names?),
// input/output is the responsibility of the resource
export type RESTApiClientConfig = {
  // TODON adjust interface to just support by operation, clarify pagination behavior?
  // TODON alternatively, connect directiony with pagination?
  httpClient: AdapterHTTPClient<{}, {}>
  // TODON see if needed - additional args for initialization / requests
  // TODON do we need this at all? or just use the client directly?
  customizations?: {
    headers?: Record<string, string>
    queryArgs?: Record<string, string>
    params?: Record<string, Values>
  }
  endpoints: EndpointByPathAndMethod
}

// TODON expand to other client types
export type ApiClientConfig = RESTApiClientConfig
