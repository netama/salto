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
import { Values } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, ContextParams, GeneratedItem } from '../shared'

export type ResourceTransformFunc = (args: {
  value: Values
  fragments: GeneratedItem[]
}) => Values

export type Resource = {
  typeName: string
  serviceID: Record<string, string | number>
  value: Values
}


type DependsOnDefinition = {
  // TODON no components so removing
  // // if the dependency is on a type from another component, it should be mentioned explicitly
  // componentName?: string
  typeName: string
  // TODON for now - allowing fieldName to be "." and will filter inside context
  // - later might be worth consolidating with the extraction logic from other places, if there are more use cases?
  // (root, pick, omit...)
  fieldName: string
  // TODON add later if needed
  // addParentAnnotation?: boolean // TODON or markAsParent?
  // TODON add conditions etc similarly to RecurseInto?
}
type FixedValueDefinition = {
  value: string | number | boolean | Values // TODON consolidate arg definitions?
}

type ContextDefinition = DependsOnDefinition | FixedValueDefinition

export const isDependsOnDefinition = (value: ContextDefinition): value is DependsOnDefinition => (
  'typeName' in value
)
// TODON eliminate?
export const isFixedValueDefinition = (value: ContextDefinition): value is FixedValueDefinition => (
  'value' in value
)

export type ContextWithDependencies = {
  args: Record<string, ContextDefinition>
}

// TODON move to dependencies file?

// TODON see if used and if should change structure
type RecurseIntoConditionBase = { match: string[] }
type RecurseIntoConditionByField = RecurseIntoConditionBase & {
  fromField: string
}
type RecurseIntoConditionByContext = RecurseIntoConditionBase & {
  fromContext: string
}

export type RecurseIntoCondition = RecurseIntoConditionByField | RecurseIntoConditionByContext

export const isRecurseIntoConditionByField = (
  condition: RecurseIntoCondition
): condition is RecurseIntoConditionByField => (
  'fromField' in condition
)

// TODON decide if similarly relevant in deploy?
// TODON input and output should be based on calculateContextArgs (and similarly for other ArgsWithCustomizers)
export type ContextParamDefinitions = ArgsWithCustomizer<Record<string, unknown[]>, ContextWithDependencies>

// TODON add ArgsWithCustomizer per arg / globally, similarly to ContextParamDefinitions
type RecurseIntoContextParamDefinition = {
  fromField: string
}
type RecurseIntoContext = {
  args: Record<string, RecurseIntoContextParamDefinition>
}
// TODON need to handle customizer later
type RecurseIntoContextParamDefinitions = ArgsWithCustomizer<ContextParams[], RecurseIntoContext>


type RecurseIntoDefinition = {
  type: string
  isSingle?: boolean // TODON rename to single to align
  context: RecurseIntoContextParamDefinitions // TODON align dependsOn with this!
  conditions?: RecurseIntoCondition[]
  skipOnError?: boolean
  // if the type requires additional context retrieved from another recursed-into field, list it here
  // cycles will result in all fields being omitted (TODON add safeties)
  recurseAfter?: string[]
}

type RecurseIntoByField = Record<string, RecurseIntoDefinition>

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type FetchResourceDefinition = {
  // set to true if the resource should be fetched on its own. set to false for types only fetched via recurseInto
  directFetch: boolean
  // TODON make sure to also mark the fields
  serviceIDFields?: string[]

  // context arg name to type info
  // no need to specify context received from a parent's recurseInto context
  // TODON decide what to do when returned values are arrays (need a strategy for how to combine)
  // TODON if multiple params from the same type, assume from same instance? (e.g. zendesk guide)
  // TODON custom is ONLY used for calculating the result - dependencies are based on config!!!
  // TODON add extra function if need something else
  // TODON split into dependsOn and "regular" context?
  context?: ContextParamDefinitions

  // target field name to type info
  // should be used to add nested fields containing other fetched types' responses (after the response was received)
  // TODON rename - maybe subresources?
  recurseInto?: RecurseIntoByField

  // when the value is constructed based on multiple fragments,
  // decide how to combine the values
  // default: merge (TODON by what order? alphabetically by endpoint name?)
  transform?: ResourceTransformFunc

  // TODON not adding for now, see if can avoid with field type overrides since only applies to child types
  // sourceTypeName?: string
}
