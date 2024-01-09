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

// TODON see if can "flatten" by using some symbol for default (and strings for the rest) - but think about runtime!
// TODON can also use some "magic" placeholder, e.g. __default__ but ugly...
export type DefaultWithCustomizations<T, K extends string = string> = {
  default?: Partial<T extends (infer U)[] ? U : T> // TODON allow requiring/omitting specific fields?
  customizations?: Partial<Record<K, T>>
}

// TODON decide about default input
export type ArgsWithCustomizer<ResponseType, Args, Input = unknown> = Args
  | ({
    custom: ((args: Partial<Args>) => (input: Input) => ResponseType)
      | ((input: Input) => ResponseType)
  } & Partial<Args>)

export type ContextParams = Record<string, unknown>

export type GeneratedItem = {
  typeName: string
  value: unknown
  // identifier: string[] // TODON maybe can use additionalContext instead?
  readonly context: ContextParams // TODON decide between context and input and align
}

export type ExtractionParams = {
  // return field name (can customize e.g. to "type => types")
  root?: ArgsWithCustomizer<
    string | undefined,
    { typeName: string }
  >
  toType?: string // TODON not needed in deploy change-to-request, decide if worth customizing
  nestUnderField?: string // TODON replaces deployAsField
  flatten?: boolean
  // on fetch - singleton, on deploy - whether to split to individual requests or batch
  single?: boolean
  // TODON expand similarly to pickBy
  pick?: string[]
  omit?: string[]
  transform?: (item: GeneratedItem) => GeneratedItem

  // context to pass to request
  // TODON not working with ArgsWithCustomizer, probably because of the Record
  context?: ContextParams // TODON see if needed
}

export type ExtractionConfig = ArgsWithCustomizer<
  GeneratedItem[], // TODON decide if should be a generator
  ExtractionParams,
  GeneratedItem[]
>
