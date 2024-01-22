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
import { RestrictionAnnotationType, TypeElement } from '@salto-io/adapter-api'
import { NameMappingOptions } from '../../../config/transformation' // TODON move
import { ArgsWithCustomizer } from '../shared'
import { Resource } from './resource'

export type FieldIDPart = ArgsWithCustomizer<
  string | undefined,
  {
    fieldName: string
    condition?: () => boolean
    // TODON adjust, but should allow at least lowercase / uppercase and maybe some customizations
    mapping?: NameMappingOptions
    isReference?: boolean
    // allowNull?: boolean
  }
>

export type ElementFieldCustomization = types.XOR<
  {
    fieldType?: string // TODON also convert to service id?
    // TODON avoid hiding when nested somehow - can use Alon's filter / just omit when should hide?
    hide?: boolean // TODON instead of fieldsToHide
    // omit: false,
    // TODON usually not written
    // customizeField: ({ field }: { field: Field }) => field,
    // customizeValue: ({ value }: { value: Value }) => value,
    standalone?: { // undefined means not standalone
      addParentAnnotation: boolean
      referenceFromParent: boolean
    }
    restrictions?: RestrictionAnnotationType
  },
  {
    omit: true
  }
>

type ElemIDOrSingleton = types.XOR<
  {
    // default - true when parent annotation exists?
    // set to false when not needed? TODO check what's needed for Shir's regeneration, maybe have all we need now?
    extendsParent?: boolean
    // extendsDefault?: boolean, // when true, also include the "default" id fields? doesn't seem needed
    parts?: FieldIDPart[]
  },
  {
    singleton: true
  }
>

export type ElementFetchDefinition = {
  topLevel?: {
    // set to true if element has instances. set to false for subtypes
    isTopLevel: true // TODON placeholder so that there will be something to set
    // TODON only relevant for top-level
    elemID?: ElemIDOrSingleton
    path?: { // instead of fileName
      // Shir: in JSM object types, the "parent" might be another field (also in workato...)
      nestUnderParent?: boolean // TODON may need two booleans to decide if to create the parent's folder or not?
      alwaysCreateFolder?: boolean
      // when missing, inherited from elemID
      fields?: FieldIDPart[]
    }
    serviceUrl?: ArgsWithCustomizer<string, string, Element> // TODON maybe expand functionality (today string)
    // when true, instances of this type will be hidden (_hidden_value = true on type)
    hide?: boolean
    // alias, important attributes, ?
    hardCodedType?: boolean // when false, extend the "defined" type (if exists) with ducktype
  }

  // // // // // type manipulations (relevant also for subtypes)
  // replaces: fieldsToHide, fieldsToOmit, standaloneFields
  // all values are optional? make sure can "define" a field without customizing it?
  fieldCustomizations?: Record<string, ElementFieldCustomization>
  // when true, do not extend default definitions for field customizations
  ignoreDefaultFieldCustomizations?: boolean
  // fieldsToOmit?: FieldToOmitType[] // TODON should not be under customizations since contradicts the rest?

  // TODON adding for now, see if can avoid with field type overrides
  sourceTypeName?: string
}

// TODON decide if Element or Instance (types might be defined separately since they have different customizations?)
export type ElementFetchDefinitionWithCustomizer = ArgsWithCustomizer<
  Element[], // TODON divide into type elements and instance elements?
  ElementFetchDefinition,
  {
    resources: Resource[]
    definedTypes: Record<string, TypeElement>
  }
>
