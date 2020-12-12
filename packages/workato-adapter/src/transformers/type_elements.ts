/*
*                      Copyright 2020 Salto Labs Ltd.
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
import {
  ObjectType, ElemID, BuiltinTypes, Values, MapType,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase } from '@salto-io/adapter-utils'
import { WORKATO, TYPES_PATH } from '../constants'

export const generateType = (
  name: string, entries: Values[], hasDynamicKeys: boolean,
): ObjectType => {
  const naclName = naclCase(name)
  const path = [WORKATO, TYPES_PATH, pathNaclCase(naclName)]

  // TODON create more specific fields and types recursively
  const fields = hasDynamicKeys
    ? { value: { type: new MapType(BuiltinTypes.UNKNOWN) } }
    : Object.fromEntries(
      _.uniq(entries.flatMap(e => Object.keys(e)))
        .map(fieldName => [fieldName, { type: BuiltinTypes.UNKNOWN }])
    )

  const type = new ObjectType({
    elemID: new ElemID(WORKATO, naclName),
    fields,
    path,
  })
  return type
}
