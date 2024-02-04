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
import { FETCH_DEFAULTS } from './defaults'
import { SUPPORT_FETCH_DEF } from './support'
import { getGuideFetchDef } from './guide'
import { ZendeskFetchConfig, isGuideEnabled } from '../../config'
import { FetchApiDefinitions } from '../types'

export const createFetchDefinitions = (userConfig: ZendeskFetchConfig): FetchApiDefinitions => ({
  instances: {
    default: FETCH_DEFAULTS,
    customizations: {
      ...(isGuideEnabled(userConfig))
        ? getGuideFetchDef(userConfig)
        : {},
      ...SUPPORT_FETCH_DEF,
    },
  },
})
