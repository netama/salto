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
import { ArgsWithCustomizer, ContextParams } from '../shared'
import { HTTPEndpoint } from '../client'

export type ContextParamsConfig = ArgsWithCustomizer<ContextParams, ContextParams>

export type HTTPRequest = {
  // TODON default get - warn when other than get/head?
  endpoint: types.PickyRequired<Partial<HTTPEndpoint>, 'path'>
  context: ContextParamsConfig
  // TODON maybe add later - a way to pass filtering info throughout the pipeline
  // to allow for earlier filtering in/out e.g. by name/active
  // filtering?: ContextParamsConfig
  onlyForContext?: boolean
  toNestedPath?: string

  // can only be made when context is available? so will be triggered once fields are populated
  // TODON decide if/how to customize later
  dependsOn?: {
    // names of other requests for the same element, TODON make sure no cycles
    requests?: string[]
    fields?: string[]
  }
}

export type HTTPRequestConfig = ArgsWithCustomizer<HTTPRequest, HTTPRequest>
