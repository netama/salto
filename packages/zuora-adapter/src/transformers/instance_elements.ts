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
import _ from 'lodash'
import {
  InstanceElement, Values, ObjectType,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase, transformElement } from '@salto-io/adapter-utils'
import { ZUORA, RECORDS_PATH, ADDITIONAL_PROPERTIES_FIELD } from '../constants'

// TODON also need the reverse pre-deploy
const normalizeAdditionalProps = (entry: Values, type: ObjectType): Values => {
  const adPropsType = type.fields[ADDITIONAL_PROPERTIES_FIELD]?.type
  if (adPropsType === undefined) {
    return entry
  }
  const additionalProps = _.pickBy(entry, (_val, key) => (
    !Object.keys(type.fields).includes(key)
  ))
  return {
    ..._.omit(entry, Object.keys(additionalProps)),
    [ADDITIONAL_PROPERTIES_FIELD]: additionalProps,
  }
}

const toInstance = ({ entry, type, nameField }: {
  entry: Values
  type: ObjectType
  nameField: string
}): InstanceElement => {
  // TODON improve, don't use type except in specific cases. also put as annotation?
  const name = entry[nameField]
  if (name === undefined) {
    throw new Error(`could not find name for entry - expected name field ${nameField}, available fields ${Object.keys(entry)}`)
  }
  const naclName = naclCase(name.slice(0, 100))

  const inst = new InstanceElement(
    naclName,
    type,
    normalizeAdditionalProps(entry, type),
    [ZUORA, RECORDS_PATH, pathNaclCase(type.elemID.name), pathNaclCase(naclName)],
  )

  return inst
}

export const generateInstancesForType = (
  entries: Values[],
  objType: ObjectType,
  nameField: string,
  fieldsToOmit?: string[],
): InstanceElement[] => (
  entries
    .map(entry => toInstance({
      entry,
      type: objType,
      nameField,
    }))
    .map(inst => (fieldsToOmit === undefined
      ? inst
      : transformElement({
        element: inst,
        transformFunc: ({ value, field }) => (
          field !== undefined && fieldsToOmit.includes(field.name)
            ? undefined
            : value
        ),
        strict: false,
      })))
)
