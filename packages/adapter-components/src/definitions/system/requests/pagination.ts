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
import { ClientBaseParams, HTTPReadClientInterface, HTTPWriteClientInterface, ResponseValue } from '../../../client'
import { ContextParams } from '../shared'
import { HTTPEndpointIdentifier, RequestArgs } from './endpoint'

// TODON decide if should move a level up to match the api.ts structure?

export type ClientRequestArgsNoPath<TAdditionalArgs extends object = {}> = Omit<ClientBaseParams & TAdditionalArgs, 'url'>

export type PaginationFunc<TAdditionalArgs extends object = {}> = ({
  responseData,
  currentParams,
  responseHeaders,
  endpointIdentifier,
}: {
  responseData: ResponseValue | ResponseValue[]
  currentParams: ClientRequestArgsNoPath<TAdditionalArgs>
  responseHeaders?: Record<string, unknown>
  endpointIdentifier: HTTPEndpointIdentifier
}) => ClientRequestArgsNoPath<TAdditionalArgs>[] // TODON change response value?

export type PaginationFuncCreator<TAdditionalArgs extends object = {}> = (args: {
  client: HTTPReadClientInterface & HTTPWriteClientInterface
  endpointIdentifier: HTTPEndpointIdentifier
  params: ContextParams
} & TAdditionalArgs) => PaginationFunc<TAdditionalArgs>

export type PaginationDefinitions = {
  funcCreator: PaginationFuncCreator // TODON should probably adjust + have headers / query args / params
  clientArgs?: RequestArgs
}
