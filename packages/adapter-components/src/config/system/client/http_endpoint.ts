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
import { Value } from '@salto-io/adapter-api'
import { PaginationFuncCreator } from '../../../client'
import { ArgsWithCustomizer, ContextParams, DefaultWithCustomizations, ExtractionConfig, GeneratedItem } from '../shared'

type PageCallInput = { // TODON TBD
}

type PaginationConfig = {
  type: string | PaginationFuncCreator // TODON enum coming from adapter - e.g. cursor, ?
  // TODON have a list of pagination definitnions with relevant args?
  args: Record<string, unknown> // TODON maybe request type as well?
} | {
  custom: (args?: Response) => PageCallInput[] // TODON turn into HTTP endpoint context
}

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export type HTTPEndpointIdentifier = {
  path: string
  // TODO add safeties in fetch when using a non-get/head endpoint
  // TODON decide: verb/method?
  method: HTTPMethod

}

// TODON avoid having to write everything explicitly, and assume exists by default?

export type HTTPEndpointDetails = {
  headers?: Record<string, string>
  queryArgs?: Record<string, string>
  omitBody?: boolean
  // TODOON decide if should have body as input like this, or just allow requests to customize it
  // TODON allow x-www-form-urlencoded + URLSearchParams, but not in a structured way yet?
  body?: Value // TODON decide if want to support
  // TODON copy more/naming from axios?

  pagination?: PaginationConfig // TODON decide if inside endpoint/client defs or here?

  // TODON too hard to maintain and can be generated, not using
  // // TODON enforce / generate - should have all placeholder parameters used in other parts of the definition
  // input?: ContextParams // TODON arg name -> arg type?

  readonly?: boolean // safe for fetch
  responseExtractors?: ExtractionConfig[]
}

export type HTTPEndpoint = HTTPEndpointIdentifier & HTTPEndpointDetails

export type EndpointCallResult = {
  success: boolean
  errors?: Error[] // TODON
  resources: GeneratedItem[]
}

type EndpointConfig = ArgsWithCustomizer<
  EndpointCallResult,
  HTTPEndpointDetails // TODON complete the endpoint details from the path
>

export type EndpointByPathAndMethod = DefaultWithCustomizations<Partial<Record<HTTPMethod, EndpointConfig>>>
