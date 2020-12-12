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
import { BuiltinTypes, ObjectType, MapType, Values, TypeElement, isObjectType, isEqualElements } from '@salto-io/adapter-api'

export type ReferenceIDType ={
  $value: string
  attributes: {
    'wd:type': string
  }
}

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

export const IDReferenceTypeFields = {
  IDs: { type: new MapType(BuiltinTypes.SERVICE_ID) },
}

export const isIDReferenceType = (type: TypeElement): type is ObjectType => (
  isObjectType(type)
  && Object.keys(type.fields).length === 1
  && isEqualElements(type.fields.IDs.type, IDReferenceTypeFields.IDs.type)
)
