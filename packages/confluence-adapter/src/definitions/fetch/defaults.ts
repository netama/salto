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
import { types } from '@salto-io/lowerdash'
import { DEFAULT_FIELD_CUSTOMIZATIONS, DEFAULT_ID_PARTS } from './shared'
import { InstanceFetchApiDefinitions } from '../types'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge

export const FETCH_DEFAULTS: types.RecursivePartial<InstanceFetchApiDefinitions> = {
  requests: [
    {
      transformation: {
        root: 'results',
      },
    },
  ],
  resource: {
    serviceIDFields: ['id'],
  },
  element: {
    topLevel: {
      elemID: { parts: DEFAULT_ID_PARTS },
    },
    fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
  },
}
