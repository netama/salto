/*
*                      Copyright 2020 Salto Labs Ltd.
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
import {
  BuiltinTypes, ObjectType, Values, TypeElement, isEqualElements, ElemID, ListType,
} from '@salto-io/adapter-api'
import { WORKDAY, TYPES_PATH, SUBTYPES_PATH } from '../constants'

export type TypeMapper = {
  types: Values
  // type name -> field name -> field type name
  fieldLookup: Record<string, Record<string, string> >
}

type OperationMessageTypes = {
  input: string
  output: string
}
// cli name -> operation -> input/output message type names
export type ClientOperationMessageTypes = Record<string, Record<string, OperationMessageTypes> >

export type APIReferenceIDType = {
  $value: string
  attributes: {
    'wd:type': string
    'wd:parent_type'?: string
    'wd:parent_id'?: string
  }
}

export type SaltoReferenceIDType = {
  value: string
  attributes: {
    type: string
    parentType?: string
    parentID?: string
  }
}

export const ReferenceIDInnerIDType = new ObjectType({
  elemID: new ElemID(WORKDAY, 'Reference_ID_ID'),
  fields: {
    value: { type: BuiltinTypes.SERVICE_ID },
    attributes: {
      type: new ObjectType({
        elemID: new ElemID(WORKDAY, 'Reference_ID_ID_Attributes'),
        fields: {
          type: { type: BuiltinTypes.STRING },
          parentType: { type: BuiltinTypes.STRING },
          parentID: { type: BuiltinTypes.STRING },
        },
        path: [WORKDAY, TYPES_PATH, SUBTYPES_PATH, 'ID_Reference'],
      }),
    },
  },
  path: [WORKDAY, TYPES_PATH, SUBTYPES_PATH, 'ID_Reference'],
})

export const IDReferenceTypeFields = {
  ID: { type: new ListType(ReferenceIDInnerIDType) },
}

export const ReferenceIDFieldType = new ObjectType({
  elemID: new ElemID(WORKDAY, 'Reference_ID'),
  fields: IDReferenceTypeFields,
  path: [WORKDAY, TYPES_PATH, SUBTYPES_PATH, 'ID_Reference'],
})

export const isReferenceIDFieldType = (type: TypeElement): type is ListType => (
  isEqualElements(type, ReferenceIDFieldType)
)
