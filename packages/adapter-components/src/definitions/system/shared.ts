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
  // TODON check if this does what I want (want partial only if not every string)
  customizations: string extends K ? Record<K, T> : Partial<Record<K, T>>
}

// TODON decide about default input
export type ArgsWithCustomizer<ResponseType, Args, Input = unknown> = Args & {
  custom?: ((args: Partial<Args>) => (input: Input) => ResponseType)
}
export type ContextParams = Record<string, unknown>

export type GeneratedItem<TContext = ContextParams, TVal = unknown> = {
  typeName: string
  value: TVal // TODON switched from Values, check if should validate assumptions elsewhere
  // TODON allow to define a buffer type?
  binaryValue?: Buffer
  // identifier: string[] // TODON maybe can use additionalContext instead?
  readonly context?: ContextParams & TContext // TODON decide between context and input and align
}

// TODON see if can consolidate single and multi
// export type TransformSingleFunction<
//   TContext = ContextParams, TSourceVal = Values, TTargetVal extends unknown = Values
// > = (
//   item: GeneratedItem<ContextParams & TContext, TSourceVal>
// ) => GeneratedItem<TContext, TTargetVal>
// TODON changed to having value be unknown - adjust assumptions!
export type TransformFunction<
  TContext = ContextParams, TSourceVal = Values, TTargetVal extends unknown = Values
> = (
  item: GeneratedItem<ContextParams & TContext, TSourceVal>
) => GeneratedItem<TContext, TTargetVal>[]

export type SingleValueTransformationFunction<
  TContext = ContextParams, TSourceVal = Values, TTargetVal extends unknown = Values
> = (
  item: GeneratedItem<ContextParams & TContext, TSourceVal>
) => GeneratedItem<TContext, TTargetVal> | undefined

export type AdjustFunction<TContext = ContextParams, TSourceVal = Values, TTargetVal extends unknown = Values> = (
  item: GeneratedItem<ContextParams & TContext, TSourceVal>
) => types.PickyRequired<Partial<GeneratedItem<TContext, TTargetVal>>, 'value'>


// TODON adjust similarly to lodash?
// type SortKey = ArgsWithCustomizer<(value: Values) => unknown, {
//   fieldName: string
//   descending?: boolean // false = ascending (default)
// }>

/**
 * transformation steps:
 * - if root is specified, look at the value under that path instead of the entire object
 * - if pick is specified, pick the specified paths
 * - if omit is specified, omit the specified paths
 * - if nestUnderField is specified, nest the entire object under the specified path
 * - if adjust is specified, run the function on the current transformation result and return the final value
 */
export type TransformDefinition<TContext = ContextParams, TTargetVal = Values> = {
  // return field name (can customize e.g. to "type => types")
  root?: string
  // TODON expand similarly to pickBy? if needed
  pick?: string[]
  omit?: string[]
  nestUnderField?: string // TODON replaces deployAsField
  single?: boolean
  // TODON allow to only override the values in all the functions (and fill in the rest from the item)
  adjust?: AdjustFunction<TContext, unknown, TTargetVal>

  // TODON add guards here? or separately?
}

export type ExtractionParams<TContext = ContextParams> = {
  transformValue?: TransformDefinition<TContext>

  // context to pass to request
  // TODON not working with ArgsWithCustomizer, probably because of the Record
  // TODON for now assuming all args are nested paths inside the value, and anything else will be a function
  context?: Partial<ContextParams & TContext> // TODON see if needed

  // the default identifier of this fragment is determined by the resulting value's service id
  // if a different one is needed, it can be customized here
  // TODON define function if/when needed (similarly to transform?)
  // identifier?: IdentifierFunction

  // default false, set to true to view all responses from all pages combined
  // aggregate?: { // TODON see if can replace with dependencies on individual items?
  //   sortBy: SortKey[] // TODON define
  // }
  // aggregate?: boolean
  // // on fetch - singleton, on deploy - whether to split to individual requests or batch
  // single?: boolean // moved to transformation
}

export type InstanceChangeAndGroup = {
  change: Change<InstanceElement>
  changeGroup: ChangeGroup<Change<InstanceElement>>
}

export type FilterCondition = (args: InstanceChangeAndGroup) => boolean

export type OptionsWithDefault<T, K extends string> = {
  options: Record<K, T>
  default: K
}
