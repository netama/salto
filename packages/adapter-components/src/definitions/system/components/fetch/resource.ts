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
import { ArgsWithCustomizer, ContextParams, GeneratedItem } from '../../shared'

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
  // if the dependency is on a type from another component, it should be mentioned explicitly
  componentName?: string
  typeName: string
  fieldName: string
  addParentAnnotation?: boolean // TODON or markAsParent?
}

type ContextWithDependencies = Record<string, string | DependsOnDefinition>

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
export type ContextParamDefinitions = ArgsWithCustomizer<ContextParams[], ContextWithDependencies>

type RecurseIntoDefinition = {
  type: string
  isSingle?: boolean // TODON rename to single to align
  context: ContextParamDefinitions
  conditions?: RecurseIntoCondition[]
  skipOnError?: boolean
  // if the type requires additional context retrieved from another recursed-into field, list it here
  // cycles will result in all fields being omitted (TODON add safeties)
  recurseAfter?: string[]
}

type RecurseIntoByField = Record<string, RecurseIntoDefinition>

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type FetchResourceDefinition = ArgsWithCustomizer<
  Resource[], // TODON divide into type elements and instance elements?
  {
    // TODON make sure to also mark the fields
    serviceIDFields?: string[]

    // context arg name to type info
    // no need to specify context received from a parent's recurseInto context
    // TODON decide what to do when returned values are arrays (need a strategy for how to combine)
    // TODON if multiple params from the same type, assume from same instance? (e.g. zendesk guide)
    context?: ContextParamDefinitions

    // target field name to type info
    // should be used to add nested fields containing other fetched types' responses (after the response was received)
    recurseInto?: RecurseIntoByField

    // when the value is constructed based on multiple fragments,
    // decide how to combine the values
    // default: merge (TODON by what order? alphabetically by endpoint name?)
    transform?: ResourceTransformFunc

    // TODON not adding for now, see if can avoid with field type overrides since only applies to child types
    // sourceTypeName?: string
  },
  GeneratedItem[] // TODON not sure about type?
>
