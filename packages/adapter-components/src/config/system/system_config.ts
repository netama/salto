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
import { SwaggerDefinitionBaseConfig } from '../swagger' // TODON adjust
import { ApiConfig } from './api'

// TODON TBD name (and maybe drop the "s"?)
export type ApiComponentsConfig = {
  sources?: {
    // TODON potentially adjust?
    openapi?: SwaggerDefinitionBaseConfig[]
  }
  // clients: {} // TODON define
  definitions: ApiConfig
  // TODON when on, will also log info and suggestions for initializing the adapter
  initializing?: boolean // TODON maybe "verbose" / "analyze" - or do elsewhere and not here
}
