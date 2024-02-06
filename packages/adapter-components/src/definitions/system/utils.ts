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
import _ from 'lodash'
import { types, values as lowerdashValues } from '@salto-io/lowerdash'
import { ActionName } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { DefaultWithCustomizations } from './shared/types'
import { ApiDefinitions } from './api'
import { UserFetchConfig } from '../user'

const log = logger(module)

export const mergeSingleDefWithDefault = <T, K extends string>(
  defaultDef: DefaultWithCustomizations<T, K>['default'] | undefined,
  def: T | undefined,
): T | undefined => {
  if (defaultDef === undefined) {
    return def
  }
  if (Array.isArray(def)) {
    if (defaultDef === undefined) {
      return def
    }
    if (Array.isArray(defaultDef)) {
      // shouldn't happen
      log.warn('found array in custom and default definitions, ignoring default')
      return def
    }
    // TODON improve casting
    return def.map(item => mergeSingleDefWithDefault(defaultDef, item)) as unknown as T
  }
  return _.mergeWith(
    _.cloneDeep(defaultDef),
    def,
    (first, second) => {
      if (lowerdashValues.isPlainObject(second) && _.get(second, 'ignoreDefaultFieldCustomizations')) {
        return mergeSingleDefWithDefault(_.omit(first, 'fieldCustomizations'), second)
      }
      if (Array.isArray(second)) {
        return mergeSingleDefWithDefault(first, second)
      }
      return undefined
    }
  )
}

export type DefQuery<T> = {
  query: (key: string) => T | undefined
  allKeys: () => string[]
  getAll: () => Record<string, T>
}

export const queryWithDefault = <T>(
  defsWithDefault: types.PickyRequired<DefaultWithCustomizations<T, string>, 'customizations'>,
): DefQuery<T> => {
  const query: DefQuery<T>['query'] = key => mergeSingleDefWithDefault(
    defsWithDefault.default,
    defsWithDefault.customizations[key],
  )
  return {
    query,
    allKeys: () => Object.keys(defsWithDefault.customizations),
    getAll: () => _.pickBy(
      _.mapValues(defsWithDefault.customizations, (_def, k) => query(k)),
      lowerdashValues.isDefined,
    ),
  }
}

export function mergeWithDefault<T, K extends string = string>(
  defsWithDefault: DefaultWithCustomizations<T, K>
): Record<K, T>
export function mergeWithDefault<T>(
  defsWithDefault: DefaultWithCustomizations<T, string>
): Record<string, T> {
  const query = queryWithDefault<T>(defsWithDefault)
  return _.pickBy(
    _.mapValues(
      defsWithDefault.customizations,
      (_val, k) => query.query(k)
    ),
    lowerdashValues.isDefined,
  )
}

export const getWithDefault = <T, TNested, K extends string>(
  defsWithDefault: DefaultWithCustomizations<T, K>,
  path: keyof T
): DefaultWithCustomizations<TNested, K> => ({
  default: _.get(defsWithDefault.default, path),
  customizations: _.mapValues(
    defsWithDefault.customizations,
    (def: T) => def[path]
  ),
// TODON see if can avoid the cast
}) as unknown as DefaultWithCustomizations<TNested, K>

export const mergeWithUserElemIDDefinitions = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName
>({ userElemID, fetchConfig }: {
  userElemID: UserFetchConfig['elemID']
  fetchConfig: ApiDefinitions<ClientOptions, PaginationOptions, Action>
}): ApiDefinitions<ClientOptions, PaginationOptions, Action> => {
  if (userElemID === undefined) {
    return fetchConfig
  }
  return _.merge(
    {},
    fetchConfig,
    {
      fetch: {
        instances: {
          customizations: _.mapValues(
            userElemID,
            ({ extendSystemPartsDefinition, ...userDef }, type) => {
              const { elemID: systemDef } = fetchConfig.fetch?.instances.customizations[type].element?.topLevel ?? {}
              const elemIDDef = {
                ..._.defaults({}, userDef, systemDef),
                parts: extendSystemPartsDefinition
                  ? (systemDef?.parts ?? []).concat(userDef.parts ?? [])
                  : userDef.parts,
              }
              return {
                element: {
                  topLevel: {
                    elemID: elemIDDef,
                  },
                },
              }
            }
          ),
        },
      },
    }
  )
}
