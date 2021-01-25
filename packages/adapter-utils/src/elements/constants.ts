/*
*                      Copyright 2021 Salto Labs Ltd.
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

// NACL files path
export const RECORDS_PATH = 'Records'
export const TYPES_PATH = 'Types'
export const SUBTYPES_PATH = 'Subtypes'
export const OBJECTS_PATH = 'Objects'

export const NAMESPACE_SEPARATOR = '__'

// type annotations
// all the GET endpoints that use this as their response schema
export const GET_ENDPOINT_SCHEMA_ANNOTATION = 'getEndpoint'
// the field containing the relevant instance data, when not the entire response
// schema is relevant (such as in list endpoints)
export const GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION = 'dataField'
