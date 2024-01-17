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
import { ArgsWithCustomizer, DefaultWithCustomizations, ExtractionDefinitions, GeneratedItem } from '../shared'
import { Response, ResponseValue } from '../../../client'

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export type HTTPEndpointIdentifier = {
  path: string
  // TODO add safeties in fetch when using a non-get/head endpoint
  // TODON decide: verb/method?
  method: HTTPMethod
}

// TODON decide if needed - if enforcing no overlap between clients might be redundant
export type HTTPEndpointAndClientIdentifier<ClientOptions extends string> = HTTPEndpointIdentifier & {
  client?: ClientOptions
}

// TODON avoid having to write everything explicitly, and assume exists by default?

export type HTTPEndpointDetails<PaginationOptions extends string> = {
  headers?: Record<string, string>
  queryArgs?: Record<string, string>
  omitBody?: boolean
  // TODOON decide if should have body as input like this, or just allow requests to customize it
  // TODON allow x-www-form-urlencoded + URLSearchParams, but not in a structured way yet?
  body?: Value // TODON decide if want to support
  // TODON copy more/naming from axios?

  // override default expected HTTP codes
  checkSuccess?: ArgsWithCustomizer<
    boolean,
    // TODON decide on name
    { HTTPSuccessCodes: number[] },
    Response<ResponseValue | ResponseValue[]>
  >

  pagination?: PaginationOptions

  // TODON too hard to maintain and can be generated, not using
  // // TODON enforce / generate - should have all placeholder parameters used in other parts of the definition
  // input?: ContextParams // TODON arg name -> arg type?

  readonly?: boolean // safe for fetch
  // TODON check if needs to also map to a component? (supposed to be unique so hopefully not)
  responseExtractors?: ExtractionDefinitions[]
}

export type HTTPEndpoint<
  PaginationOptions extends string
> = HTTPEndpointIdentifier & HTTPEndpointDetails<PaginationOptions>

export type EndpointCallResult = {
  success: boolean
  errors?: Error[] // TODON
  resources: GeneratedItem[]
}

type EndpointDefinition<PaginationOptions extends string> = ArgsWithCustomizer<
  EndpointCallResult,
  HTTPEndpointDetails<PaginationOptions> // TODON complete the endpoint details from the path
>

export type EndpointByPathAndMethod<PaginationOptions extends string> = DefaultWithCustomizations<
  Partial<Record<HTTPMethod, EndpointDefinition<PaginationOptions>>>
>
