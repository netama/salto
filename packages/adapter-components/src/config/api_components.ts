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
import { ObjectType, ElemID, CORE_ANNOTATIONS, ListType, BuiltinTypes } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { createDucktypeAdapterApiConfigType } from './ducktype'
import { SwaggerDefinitionBaseConfig, createSwaggerDefinitionsBaseConfigType } from './swagger'
import { AdapterApiConfig } from './shared'

// TODON merge logic of ducktype+swagger and refactor this
export type ApiComponentsConfig = {
  sources?: {
    swagger?: SwaggerDefinitionBaseConfig[]
    // when true, the sources are only used for finding the endpoints but types are generated from responses
    alwaysDuckType?: boolean
  }
  // clients: {} // TODON define
  definitions: AdapterApiConfig
  // TODON when on, will also log info and suggestions for initializing the adapter
  initializing?: boolean
}

export const createApiComponentsConfigType = ({ adapter }: { adapter: string }): ObjectType => {
  const createSwaggerSourceApiConfig = (): ObjectType => createMatchingObjectType<ApiComponentsConfig['sources']>({
    elemID: new ElemID(adapter, 'apiSourceSwaggerConfig'),
    fields: {
      swagger: {
        refType: new ListType(createSwaggerDefinitionsBaseConfigType(adapter)),
      },
      alwaysDuckType: { refType: BuiltinTypes.BOOLEAN },
    },
  })
  return createMatchingObjectType<ApiComponentsConfig>({
    elemID: new ElemID(adapter, 'apiComponentsConfig'),
    fields: {
      sources: {
        refType: createSwaggerSourceApiConfig(),
      },
      definitions: {
        refType: createDucktypeAdapterApiConfigType({ adapter }),
        annotations: {
          _required: true,
        },
      },
      initializing: {
        refType: BuiltinTypes.BOOLEAN,
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
}

// TODON add validation
// TODON move to "v1/v2" folders?
