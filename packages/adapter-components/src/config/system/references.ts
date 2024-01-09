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
import { ObjectType, ElemID, BuiltinTypes, ListType, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { FieldReferenceDefinition, FieldReferenceSourceDefinition } from '../../references'

export type ReferencesConfig = {
  // TODON switch never once shared context exists (maybe already?)
  rules: FieldReferenceDefinition<never>[]
}

export const createReferencesConfigType = ({ adapter }: { adapter: string }): ObjectType => {
  const sourceDefConfigType = createMatchingObjectType<FieldReferenceSourceDefinition>({
    elemID: new ElemID(adapter, 'referenceSourceConfig'),
    fields: {
      field: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      parentTypes: {
        refType: new ListType(BuiltinTypes.STRING),
      },
      instanceTypes: {
        refType: new ListType(BuiltinTypes.STRING),
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referenceTargetConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'referenceTargetConfig'),
    fields: {
      // TODON better enforcement
      name: { refType: BuiltinTypes.STRING },
      type: { refType: BuiltinTypes.STRING },
      typeContext: { refType: BuiltinTypes.STRING },
      parent: { refType: BuiltinTypes.STRING },
      parentContext: { refType: BuiltinTypes.STRING },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referenceRuleConfigType = createMatchingObjectType<FieldReferenceDefinition<never>>({
    elemID: new ElemID(adapter, 'referenceRuleConfig'),
    fields: {
      src: {
        refType: sourceDefConfigType,
        annotations: { _required: true },
      },
      serializationStrategy: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
      sourceTransformation: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
      // If target is missing, the definition is used for resolving
      target: {
        refType: referenceTargetConfigType,
      },
      missingRefStrategy: {
        refType: BuiltinTypes.STRING,
      }, // TODON add restriction
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })

  const referencesConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'referencesConfig'),
    fields: {
      rules: { refType: new ListType(referenceRuleConfigType) },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
  return referencesConfigType
}
