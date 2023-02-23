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
import { AdjustFunction, ArgsWithCustomizer, ContextParams, ExtractionParams, GeneratedItem } from '../shared'
import { HTTPEndpointIdentifier } from '../requests'

// TODON see if can consolidate the { args: Record<srting, primitive> } types
export type ContextParamDefinitions = ArgsWithCustomizer<ContextParams, { args: ContextParams }>

// TODON maybe avoid complete customization so we know what to fetch?
type ExtractionDefinition<TContext = ContextParams> = ArgsWithCustomizer<
  GeneratedItem<TContext>[], // TODON decide if should be a generator
  ExtractionParams<TContext>,
  GeneratedItem<TContext>[]
>

// TODON experimenting with flattening for simplicity (but check customization!)
export type HTTPRequest = types.XOR<
  HTTPEndpointIdentifier
  & ExtractionDefinition<{ change: Change<InstanceElement> }>,
  // TODON add a warning for changes matching this?
  { succeedWithoutRequest: true }
>

// TODON renamed from transform to transformValue, continue adjusting
export type DeployAdjustRequest = AdjustFunction<{ change: Change<InstanceElement> }>
export type HTTPRequestDefinition = ArgsWithCustomizer<
  HTTPRequest,
  HTTPRequest
>
