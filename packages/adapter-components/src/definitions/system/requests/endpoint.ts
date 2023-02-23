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
import { Values } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, ContextParams, DefaultWithCustomizations, ExtractionParams, GeneratedItem } from '../shared'
import { Response, ResponseValue } from '../../../client'

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export type HTTPEndpointIdentifier = {
  path: string
  // TODO add safeties in fetch when using a non-get/head endpoint
  // TODON decide: verb/method?
  method: HTTPMethod
}

// TODON decide if needed - if enforcing no overlap between clients might be redundant
// export type HTTPEndpointAndClientIdentifier<ClientOptions extends string> = HTTPEndpointIdentifier & {
//   client?: ClientOptions
// }

// TODON avoid having to write everything explicitly, and assume exists by default?

type FetchExtractionParams<TContext = ContextParams> = ExtractionParams<TContext> & {
  toType: string // TODON not needed in deploy change-to-request, decide if worth customizing
}

// TODON maybe avoid complete customization so we know what to fetch?
export type FetchExtractionDefinition = ArgsWithCustomizer<
  GeneratedItem[], // TODON decide if should be a generator
  FetchExtractionParams,
  ResponseValue[]
>

export type RequestArgs = {
  headers?: Record<string, string>
  queryArgs?: Record<string, string>
  params?: Record<string, Values>
  // TODOON decide if should have body as input like this, or just allow requests to customize it
  // TODON decide if want to support body
  // TODON allow x-www-form-urlencoded + URLSearchParams, but not in a structured way yet?
  body?: unknown
}

export type HTTPEndpointDetails<PaginationOptions extends string | 'none'> = RequestArgs & {
  omitBody?: boolean
  // TODON copy more/naming from axios?

  // override default expected HTTP codes
  checkSuccess?: ArgsWithCustomizer< // TODON use
    boolean,
    // TODON decide on name
    { httpSuccessCodes: number[] },
    Response<ResponseValue | ResponseValue[]>
  >

  // TODON not needed if getting the clientArgs instead?
  // // additional context args that will be passed to the client
  // additionalContext?: ContextParams

  pagination?: PaginationOptions

  // TODON too hard to maintain and can be generated, not using
  // // TODON enforce / generate - should have all placeholder parameters used in other parts of the definition
  // input?: ContextParams // TODON arg name -> arg type?

  readonly?: boolean // safe for fetch
  // TODON decide if should key (group) by type (though usually a single extractor so probably not necessary,
  // since will still need n array)
  // TODON make sure omit on nested field works (it should?)
  responseExtractors?: Omit<FetchExtractionDefinition, 'transformValue.single'>[]
}

export type HTTPEndpoint<
  PaginationOptions extends string
> = HTTPEndpointIdentifier & HTTPEndpointDetails<PaginationOptions>

export type EndpointCallResult = {
  success: boolean
  errors?: Error[] // TODON
  resources: GeneratedItem[]
}

export type EndpointDefinition<PaginationOptions extends string> = ArgsWithCustomizer<
  EndpointCallResult,
  HTTPEndpointDetails<PaginationOptions> // TODON complete the endpoint details from the path
>

export type ClientEndpoints<PaginationOptions extends string> = Partial<
  Record<HTTPMethod, EndpointDefinition<PaginationOptions>>>

export type EndpointByPathAndMethod<PaginationOptions extends string> = DefaultWithCustomizations<
  ClientEndpoints<PaginationOptions>
>
