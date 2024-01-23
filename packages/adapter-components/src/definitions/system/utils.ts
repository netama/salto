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
import { types, values as lowerdashValues } from '@salto-io/lowerdash'
import { Values } from '@salto-io/adapter-api'
import { DefaultWithCustomizations } from './shared'

export const mergeSingleDefWithDefault = <T extends Values | Values[], K extends string>(
  defaultDef: DefaultWithCustomizations<T, K>['default'] | undefined,
  def: T | undefined,
): T | undefined => (
    def === undefined
      ? undefined
      : _.mergeWith(
        _.cloneDeep(defaultDef ?? {}),
        def ?? {},
        (firstVal, secondValue) => (
          (Array.isArray(secondValue) && !Array.isArray(firstVal))
            ? secondValue.map(innerVal => mergeSingleDefWithDefault(firstVal, innerVal))
            : undefined
        )
      ) as T // TODON improve
  )

// TODON figure out the typing issue when not defaulting to string
export function mergeWithDefault<T extends Values | Values[], K extends string = string>(
  defsWithDefault: DefaultWithCustomizations<T, K>
): Record<K, T>
export function mergeWithDefault<T extends Values | Values[]>(
  defsWithDefault: types.PickyRequired<DefaultWithCustomizations<T, string>, 'customizations'>,
): Record<string, T> {
  const withDefaults = _.pickBy(
    _.mapValues(
      defsWithDefault.customizations,
      def => mergeSingleDefWithDefault(defsWithDefault.default, def),
    ),
    lowerdashValues.isDefined,
  )
  return withDefaults
}
