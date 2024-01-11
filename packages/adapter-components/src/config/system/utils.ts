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
import _ from 'lodash'
import { Values } from '@salto-io/adapter-api'
import { DefaultWithCustomizations } from './shared'
import { mergeWithDefaultConfig } from '../merge'

// TODON add special handling for arrays for different use cases?
export const mergeWithDefault = <T extends Values | Values[], K extends string = string>(
  configWithDefault: DefaultWithCustomizations<T, K>,
  key: K,
): Partial<T> => {
  const customization = configWithDefault.customizations?.[key]
  if (Array.isArray(customization)) {
    return customization as Partial<T> // TODON handle better
  }
  return mergeWithDefaultConfig(
    configWithDefault.default ?? {},
    configWithDefault.customizations?.[key],
  ) as Partial<T> // TODON avoid cast, improve implementation
}

// TODON add a recursivelyMergeWithDefault util function
