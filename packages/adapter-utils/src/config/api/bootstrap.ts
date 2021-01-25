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
import {
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS, ListType, MapType, FieldDefinition,
} from '@salto-io/adapter-api'

export type EndpointConfig = {
  endpoint: string
  queryParams?: Record<string, string>
  paginationField?: string
  dependsOn?: string[]
  fieldsToOmit?: string[]
  // fields to convert into their own type and instances.
  // if the field value is a string, first parse it into json
  fieldsToExtract?: string[]
  // endpoints whose response is a single object with dynamic keys
  hasDynamicFields?: boolean
  nameField?: string
  pathField?: string
}

export type ApiEndpointBaseConfig = {
  // apiVersion?: string // TODO add when relevant
  getEndpoints: EndpointConfig[]
  defaultNameField: string
  defaultPathField: string
  fieldsToOmit?: string[]
}

export const createApiBootstrapConfigType = (
  adapter: string,
  additionalEndpointFields?: Record<string, FieldDefinition>,
): ObjectType => {
  const endpointConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'endpointConfig'),
    fields: {
      endpoint: {
        type: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      // TODON needs more adjustments
      queryParams: { type: new MapType(BuiltinTypes.STRING) },
      dependsOn: { type: new ListType(BuiltinTypes.STRING) },
      paginationField: { type: BuiltinTypes.STRING },
      fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
      fieldsToExtract: { type: new ListType(BuiltinTypes.STRING) },
      hasDynamicFields: { type: BuiltinTypes.BOOLEAN },
      nameField: { type: BuiltinTypes.STRING },
      pathField: { type: BuiltinTypes.STRING },
      ...additionalEndpointFields,
    },
  })

  const apiModuleConfigType = new ObjectType({
    elemID: new ElemID(adapter, 'apiModuleConfig'),
    fields: {
      // apiVersion: { type: BuiltinTypes.STRING }, // TODO add when relevant
      getEndpoints: { type: new ListType(endpointConfigType) },
      defaultNameField: { type: BuiltinTypes.STRING },
      defaultPathField: { type: BuiltinTypes.STRING },
      fieldsToOmit: { type: new ListType(BuiltinTypes.STRING) },
    },
  })
  return apiModuleConfigType
}
