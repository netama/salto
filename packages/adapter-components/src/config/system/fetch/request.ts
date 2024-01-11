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
import { ArgsWithCustomizer, ContextParams } from '../shared'
import { HTTPEndpointIdentifier } from '../client'

type DependsOnConfig = {
  typeName: string
  fieldName: string
  addParentAnnotation?: boolean // TODON or markAsParent?
}

type ContextWithDependencies = Record<string, string | DependsOnConfig>

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

type RecurseIntoConfig = {
  type: string
  isSingle?: boolean // TODON rename to single to align
  context: ContextParamsConfig
  conditions?: RecurseIntoCondition[]
  skipOnError?: boolean
  // if the type requires additional context retrieved from another recursed-into field, list it here
  // cycles will result in all fields being omitted (TODON add safeties)
  recurseAfter?: string[]
}

type RecurseIntoByField = Record<string, RecurseIntoConfig>

// TODON decide if similarly relevant in deploy?
export type ContextParamsConfig = ArgsWithCustomizer<ContextParams[], ContextWithDependencies>

export type HTTPRequest = {
  // TODON default get - warn when other than get/head?
  endpoint: types.PickyRequired<Partial<HTTPEndpointIdentifier>, 'path'>

  // context arg name to type info
  // no need to specify context received from a parent's recurseInto context
  // TODON decide what to do when returned values are arrays (need a strategy for how to combine)
  context?: ContextParamsConfig
  // TODON maybe add later - a way to pass filtering info throughout the pipeline
  // to allow for earlier filtering in/out e.g. by name/active
  // filtering?: ContextParamsConfig
  onlyForContext?: boolean // TODON see if needed or if can conclude (based on dependsOn etc)
  toNestedPath?: string

  // target field name to type info
  // should be used to add nested fields containing other fetched types' responses (after the response was received)
  recurseInto?: RecurseIntoByField

}

export type HTTPRequestConfig = ArgsWithCustomizer<HTTPRequest, HTTPRequest>
