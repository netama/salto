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
import { types } from '@salto-io/lowerdash'
import { Change, InstanceElement } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, ContextParams, ExtractionConfig } from '../shared'
import { HTTPEndpointIdentifier } from '../client'

export type ContextParamsConfig = ArgsWithCustomizer<ContextParams, ContextParams>

// export type HTTPRequest = HTTPEndpointIdentifier & {
//   transformation?: ExtractionConfig // TODON rename types, use the same in fetch
//   // context?: ContextParamsConfig // TODON if not here, later need to align fetch
// }
// TODON experimenting with flattening for simplicity (but check customization!)
export type HTTPRequest = types.XOR<
  HTTPEndpointIdentifier & ExtractionConfig<{ change: Change<InstanceElement> }>,
  // TODON add a warning for changes matching this?
  { succeedWithoutRequest: true }
>

export type HTTPTransformRequest = HTTPRequest['transform']

export type HTTPRequestConfig = ArgsWithCustomizer<HTTPRequest, HTTPRequest>
