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
import { ElemID, ElemIdGetter, InstanceElement, ObjectType, RestrictionAnnotationType, SaltoError, Values } from '@salto-io/adapter-api'
import { ArgsWithCustomizer, NameMappingOptions } from '../shared'
// TODON handle dependency cycles better later
// eslint-disable-next-line import/no-cycle
import { GenerateTypeArgs } from './fetch'

export type FieldIDPart = ArgsWithCustomizer<
  string | undefined,
  {
    fieldName: string
    condition?: (value: Values) => boolean
    // TODON adjust, but should allow at least lowercase / uppercase and maybe some customizations
    mapping?: NameMappingOptions // TODON replace with function instead of enum
    // when true, the elem ids are re-calculated after all references have been generated
    // TODON always assume reference if defined by the user? since they only see what's in the nacls.
    // assuming we should make sure not to delete anything pre-existing?
    isReference?: boolean
    // allowNull?: boolean
  },
  Values
>

export type IDPartsDefinition = {
  // extendsDefault?: boolean, // when true, also include the "default" id fields? doesn't seem needed
  parts?: FieldIDPart[]
  // the delimiter to use between parts - default is '_'
  delimiter?: string
}

export type ElemIDDefinition = IDPartsDefinition & {
  // default - true when parent annotation exists?
  // set to false when not needed? TODON check what's needed for Shir's regeneration, maybe have all we need now?
  extendsParent?: boolean
}

export type ElemIDOrSingleton = types.XOR<
  ElemIDDefinition,
  {
    singleton: true // TODON move out
  }
>

export type PathDefinition = { // instead of fileName
  // Shir: in JSM object types, the "parent" might be another field rather than the parent annotation
  // (also in workato...)
  // TODON implement, add documentation
  nestUnder?: types.OneOf<{ // TODON may need two booleans to decide if to create the parent's folder or not?
    parent: true
    parentFromField: string
  }>
  // TODON implement later
  // alwaysCreateFolder?: boolean
  // when id parts info is missing, inherited from elemID (but the values are nacl-cased)
  pathParts?: IDPartsDefinition[]
}

type StandaloneFieldDefinition = {
  typeName: string
  // add parent annotation on child, default true
  addParentAnnotation?: boolean
  // whether to replace the original value in the parent with a reference to the newly-created child instance
  // defaults to true. when false, the original field is omitted
  referenceFromParent?: boolean
}

// TODON add safeties (e.g. standalone.referencFromParent means omit)
export type ElementFieldCustomization = types.XOR<
  {
    fieldType?: string // TODON also convert to service id?
    // TODON avoid hiding when nested somehow - can use Alon's filter / just omit when should hide?
    hide?: boolean // TODON instead of fieldsToHide
    // omit: false,
    // TODON usually not written
    // customizeField: ({ field }: { field: Field }) => field,
    // customizeValue: ({ value }: { value: Value }) => value,
    // TODON moved to resource, make sure works with adding references
    standalone?: StandaloneFieldDefinition
    restrictions?: RestrictionAnnotationType
  },
  types.OneOf<{
    // omit the field
    omit: true
    // set the field to a map and determine its inner type dynamically.
    // the type is determined dynamically, since if the inner type is known, fieldType can be used instead.
    // note: will not work if hardCodedType is true
    isMapWithDynamicType: true
  }>
>

export type ElementsAndErrors = {
  instances: InstanceElement[]
  types: ObjectType[]
  // by default, types are re-generated once all instances have been created,
  // in order to avoid having the same type defined in different ways based on partial information.
  // if this should not be done, set this to true.
  typesAreFinal?: boolean
  errors?: SaltoError[]
}

export type ElemIDCreatorArgs = {
  elemIDDef: ElemIDOrSingleton
  getElemIdFunc?: ElemIdGetter
  serviceIDDef?: string[]
  typeID: ElemID
  defaultName: string
}

export type FetchTopLevelElementDefinition<TVal extends Values = Values> = {
  // set to true if element has instances. set to false for subtypes
  isTopLevel: true // TODON placeholder so that there will be something to set

  // for simplicty, we only allow customizing top-level elements for simplicity
  // note: this is also responsible for all standalone!!!
  // eslint-disable-next-line no-use-before-define
  custom?: ((args: Partial<ElementFetchDefinition<TVal>>) => (input: GenerateTypeArgs) => ElementsAndErrors)

  // TODON only relevant for top-level
  singleton?: boolean // TODON move here insetad of elem id + XOR
  elemID?: ArgsWithCustomizer<string, ElemIDOrSingleton, Values, ElemIDCreatorArgs>
  path?: PathDefinition

  // TODON decide on input
  serviceUrl?: ArgsWithCustomizer<string, { path: string }, Values>

  // when true, instances of this type will be hidden (_hidden_value = true on type)
  hide?: boolean
  // alias, important attributes, ?

  // type guard to use to validate the type is correct.
  // when missing, we only validate that this is a plain object, and do not cast to the more accurate type
  // TODON make sure to cast by allowing to template InstanceElement's on the value type like Ori suggested
  // TODON start without? but have simple util functions for type guards for each relevant function
  valueGuard?: (val: unknown) => val is TVal
}

export type ElementFetchDefinition<TVal extends Values = Values> = {
  topLevel?: FetchTopLevelElementDefinition<TVal>

  // when false, extend the "defined" type (if exists) with ducktype
  // when set to true, we use the existing type without attempting to extend it (but we still hide and omit fields).
  // if no type with the specified name is available, nested types will be set to unknown,
  // and top-level types will be set to an empty type (with additionalProperties allowed).
  // TODON initially not implementing - if a type is found, it will be used. can extend later
  // replaceHardCodedType?: boolean // TODON maybe mark on the swagger instead?

  // when enabled, we assume all fields that are not explicitly mentioned in fieldCustomizations
  // are additionalProperties, and determine their type using the ducktype logic
  // TODON needs adjustments (maybe call otherFieldsAreDynamic if can co-live with other types?)
  // TODON instead of the original hasDynamicFields - can nest under a "values" field, and override the type to map
  // hasDynamicFields?: boolean

  // replaces: fieldsToHide, fieldsToOmit, standaloneFields
  // all values are optional? make sure can "define" a field without customizing it?
  fieldCustomizations?: Record<string, ElementFieldCustomization>
  // when true, do not extend default definitions for field customizations
  ignoreDefaultFieldCustomizations?: boolean

  // TODON add option to define annotations, including addditionalProperties (but just all annotations?)


  // TODON adding for now, see if can avoid with field type overrides
  sourceTypeName?: string
}
