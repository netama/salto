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
import { types } from '@salto-io/lowerdash'
import { Change, InstanceElement } from '@salto-io/adapter-api'
import { AdjustFunction, ArgsWithCustomizer, ContextParams, EndpointExtractionParams } from '../shared'

// TODON see if can consolidate the { args: Record<srting, primitive> } types
export type ContextParamDefinitions = ArgsWithCustomizer<ContextParams, { args: ContextParams }>

export type HTTPRequest<ClientOptions extends string = 'main'> = types.XOR<
  EndpointExtractionParams<{ change: Change<InstanceElement> }, ClientOptions>,
  // TODON add a warning for changes matching this?
  // TODON use something similar in fetch - returnContextAsResponse?
  { succeedWithoutRequest: true }
>

export type DeployAdjustRequest = AdjustFunction<{ change: Change<InstanceElement> }>
export type HTTPRequestDefinition = ArgsWithCustomizer<HTTPRequest, HTTPRequest>
