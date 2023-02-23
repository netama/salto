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
import { AdjustFunction, ArgsWithCustomizer, ContextParams, GeneratedItem, TransformDefinition } from '../shared'

export type ResourceTransformFunc = AdjustFunction<{ fragments: GeneratedItem[] }>

export type Resource = {
  typeName: string
  serviceID: Record<string, string | number>
  value: Values
}


export type DependsOnDefinition = {
  // TODON no components so removing
  // // if the dependency is on a type from another component, it should be mentioned explicitly
  // componentName?: string
  parentTypeName: string
  // TODON for now - allowing fieldName to be "." and will filter inside context
  // - later might be worth consolidating with the extraction logic from other places, if there are more use cases?
  // (root, pick, omit...)
  // fieldName: string
  transformValue: TransformDefinition<{}, unknown>
  // TODON add later if needed
  // addParentAnnotation?: boolean // TODON or markAsParent?
  // TODON add conditions etc similarly to RecurseInto?

  // TODON - replaces recurseInto - check if needed
  // nestPathUnderParent?: {
  //   parentField: string
  //   single?: boolean
  //   condition?: (args: { child: GeneratedItem; parent: GeneratedItem }) => boolean
  // }
}

type FixedValueContextDefinition = {
  value: string | number | boolean | Values // TODON consolidate arg definitions?
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

// TODON see if can merge (since all are now context)?
export type RecurseIntoCondition = RecurseIntoConditionByField | RecurseIntoConditionByContext

export const isRecurseIntoConditionByField = (
  condition: RecurseIntoCondition
): condition is RecurseIntoConditionByField => (
  'fromField' in condition
)

// TODON add ArgsWithCustomizer per arg / globally, similarly to ContextParamDefinitions
type RecurseIntoContextParamDefinition = {
  fromField: string // TODON replace with transformation config to align
}
type RecurseIntoContext = {
  args: Record<string, RecurseIntoContextParamDefinition>
}
// TODON need to handle customizer later, consolidate with ContextParamDefinitions?
type RecurseIntoContextParamDefinitions = ArgsWithCustomizer<ContextParams[], RecurseIntoContext>


type RecurseIntoDefinition = {
  typeName: string
  isSingle?: boolean // TODON rename to single to align
  context: RecurseIntoContextParamDefinitions // TODON align dependsOn with this!
  conditions?: RecurseIntoCondition[]
  skipOnError?: boolean

  // TODON why not use dependsOn in this case? will get the parent's full context so almost identical
  // TODON then maybe can do the other way around and avoid recusreInto and only have dependsOn + mark adding the field
  // under the parent(s)?

  // when true, the resource is created as its own resource and does not reference the parent
  // TODON switch guide to use this instead + add as its own entity in the graph?
  // defaults to false - which means the resource will be added under the relevant field of the parent resource
  // independent?: boolean

  // // if the type requires additional context retrieved from another recursed-into field, list it here
  // // cycles will result in all fields being omitted (TODON add safeties)
  // recurseAfter?: string[]
}

export type ContextCombinationDefinition = {
  // TODON allow multiple values as well?
  // TODON decide if it's better to duplicate the endpoints based on the params instead? (from Ori's comment)
  hardcoded?: Record<string, FixedValueContextDefinition>
  // TODON decide if similarly relevant in deploy?
  // TODON input and output should be based on calculateContextArgs (and similarly for other ArgsWithCustomizers)
  // each dependsOn combination provides a cartesian product of its possible arguments
  dependsOn?: Record<string, DependsOnDefinition>
  // TODON not supported yet, add support
  conditions?: RecurseIntoCondition[]
}

/**
 * Define how resources are constructed.
 * Flow: (TODON decide if relevant here or if should be documented in getAllElements / if this should move there!)
 * - Resource types to fetch are determined by the fetch query
 * - TODON continue
 */
export type FetchResourceDefinition = {
  // set to true if the resource should be fetched on its own. set to false for types only fetched via recurseInto
  directFetch: boolean // TODON after refactor might not be needed?
  // TODON make sure to also mark the fields
  // Ori's suggestive question: can this include parameters from the context?
  // (if so - elem id service id fields should be separate)
  serviceIDFields?: string[]

  // context arg name to type info
  // no need to specify context received from a parent's recurseInto context
  // TODON decide what to do when returned values are arrays (need a strategy for how to combine)
  // TODON custom is ONLY used for calculating the result - dependencies are based on config!!!
  // TODON add extra function if need something else
  // TODON convert to array of possible combinations when the need arises
  context?: ContextCombinationDefinition // stopped here with Ori

  // target field name to sub-resource info
  // can be used to add nested fields containing other fetched types' responses (after the response was received),
  // and to separate child resources into their own instances
  // TODON rename - maybe subresources?
  recurseInto?: Record<string, RecurseIntoDefinition>

  // construct the final value from all fetched fragments, which are grouped by the service id
  // default behavior: merge all fragments together while concatenating array values.
  // note: on overlaps the latest fragment wins ??
  // note: concatenation order between fragments is not defined.
  mergeAndTransform?: TransformDefinition<{ fragments: GeneratedItem[] }>

  // TODON move standalone fields here instead of on element? (still needs to be recursive, need to give target type)
  // subResources?: Record<string, FieldSubResourceDefinition>

}
