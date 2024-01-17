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
import { Change, ChangeGroup, InstanceElement, Values } from '@salto-io/adapter-api'

// TODON see if can "flatten" by using some symbol for default (and strings for the rest) - but think about runtime!
// TODON can also use some "magic" placeholder, e.g. __default__ but ugly...
export type DefaultWithCustomizations<T, K extends string = string> = {
  default?: types.RecursivePartial<T extends (infer U)[] ? U : T> // TODON allow requiring/omitting specific fields?
  customizations?: Partial<Record<K, T>>
}

// TODON decide about default input
export type ArgsWithCustomizer<ResponseType, Args, Input = unknown> = Args
  | ({
    custom: ((args: Partial<Args>) => (input: Input) => ResponseType)
      | ((input: Input) => ResponseType)
  } & Partial<Args>)

export type ContextParams = Record<string, unknown>

export type GeneratedItem<TContext = ContextParams> = {
  typeName: string
  value: Values // TODON see if always works or if also need arrays
  // TODON allow to define a buffer type?
  binaryValue?: Buffer
  // identifier: string[] // TODON maybe can use additionalContext instead?
  readonly context: ContextParams & TContext // TODON decide between context and input and align
}

export type TransformFunction<TContext = ContextParams> = (
  item: GeneratedItem<ContextParams & TContext>
) => types.PickyRequired<Partial<GeneratedItem<TContext>>, 'value'> // TODON fill out the others from input if missing

// TODON adjust similarly to lodash?
type SortKey = ArgsWithCustomizer<(value: Values) => unknown, {
  fieldName: string
  descending?: boolean // false = ascending (default)
}>

export type ExtractionParams<TContext = ContextParams> = {
  // return field name (can customize e.g. to "type => types")
  root?: ArgsWithCustomizer<
    string | undefined,
    string,
    TContext
  >
  toType?: string // TODON not needed in deploy change-to-request, decide if worth customizing
  nestUnderField?: string // TODON replaces deployAsField
  // default false, set to true to view all responses from all pages combined
  aggregate?: {
    sortBy: SortKey[] // TODON define
  }
  // aggregate?: boolean
  // // on fetch - singleton, on deploy - whether to split to individual requests or batch
  // single?: boolean // moved to transformation
  // TODON expand similarly to pickBy
  pick?: string[]
  omit?: string[]
  transform?: TransformFunction<TContext> // TODON allow to only override the values in all the functions

  // context to pass to request
  // TODON not working with ArgsWithCustomizer, probably because of the Record
  // TODON for now assuming all args are nested paths inside the value, and anything else will be a function
  context?: Partial<ContextParams & TContext> // TODON see if needed
}

export type InstanceChangeAndGroup = {
  change: Change<InstanceElement>
  changeGroup: ChangeGroup<Change<InstanceElement>>
}

export type FilterCondition = (args: InstanceChangeAndGroup) => boolean

export type ExtractionDefinitions<TContext = ContextParams> = ArgsWithCustomizer<
  GeneratedItem<TContext>[], // TODON decide if should be a generator
  ExtractionParams<TContext>,
  GeneratedItem<TContext>[]
>

export type OptionsWithDefault<T, K extends string> = {
  options: Record<K, T>
  default: K
}
