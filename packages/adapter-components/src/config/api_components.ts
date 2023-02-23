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
import { ObjectType, ElemID, MapType, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { AdapterDuckTypeApiConfig, createDucktypeAdapterApiConfigType } from './ducktype'
import { AdapterSwaggerApiConfig, createSwaggerAdapterApiConfigType } from './swagger'

// TODON merge logic of ducktype+swagger and refactor this
export type ApiComponentsConfig = {
  ducktype?: Record<string, AdapterDuckTypeApiConfig>
  swagger?: Record<string, AdapterSwaggerApiConfig>
}

export const createApiComponentsConfigType = ({ adapter }: { adapter: string }): ObjectType => (
  createMatchingObjectType<ApiComponentsConfig>({
    elemID: new ElemID(adapter, 'apiComponentsConfig'),
    fields: {
      ducktype: {
        refType: new MapType(createDucktypeAdapterApiConfigType({
          adapter,
          elemIdPrefix: 'swagger',
        })),
      },
      swagger: {
        refType: new MapType(createSwaggerAdapterApiConfigType({
          adapter,
          elemIdPrefix: 'ducktype',
        })),
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
)

// TODON add validation
// TODON move to "v1/v2" folders?
