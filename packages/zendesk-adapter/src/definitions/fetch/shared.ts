/*
*                      Copyright 2024 Salto Labs Ltd.
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
import { definitions } from '@salto-io/adapter-components'

// TODON adjust types?
export const DEFAULT_FIELDS_TO_HIDE: Record<string, definitions.fetch.ElementFieldCustomization> = {
  created_at: {
    hide: true,
  },
  updated_at: {
    hide: true,
  },
  created_by_id: {
    hide: true,
  },
  updated_by_id: {
    hide: true,
  },
}
export const DEFAULT_FIELDS_TO_OMIT: Record<string, definitions.fetch.ElementFieldCustomization> = {
  extended_input_schema: {
    omit: true,
  },
  extended_output_schema: {
    omit: true,
  },
  url: {
    omit: true,
  },
  count: {
    omit: true,
  },
}

export const NAME_ID_FIELD: definitions.fetch.FieldIDPart = { fieldName: 'name' }
export const DEFAULT_ID_PARTS = [NAME_ID_FIELD]

export const DEFAULT_FIELD_CUSTOMIZATIONS: Record<string, definitions.fetch.ElementFieldCustomization> = {
  ...DEFAULT_FIELDS_TO_HIDE,
  ...DEFAULT_FIELDS_TO_OMIT,
}
