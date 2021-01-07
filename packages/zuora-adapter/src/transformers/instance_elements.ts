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
  InstanceElement, Values, ObjectType, ReferenceExpression, isObjectType, isListType,
  isReferenceExpression,
} from '@salto-io/adapter-api'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { pathNaclCase, naclCase, transformElement, TransformFunc } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { ZUORA, RECORDS_PATH, ADDITIONAL_PROPERTIES_FIELD } from '../constants'
import { FieldToExtractConfig } from '../types'

const { isDefined } = lowerdashValues
const log = logger(module)

// TODON also need the reverse pre-deploy
const normalizeAdditionalProps = (entry: Values, type: ObjectType): Values => {
  const adPropsType = type.fields[ADDITIONAL_PROPERTIES_FIELD]?.type
  if (adPropsType === undefined) {
    return entry
  }
  const additionalProps = _.pickBy(entry, (_val, key) => (
    !(
      Object.keys(type.fields).includes(key)
      || Object.keys(type.annotationTypes).includes(key)
    )
  ))
  return {
    ..._.omit(entry, Object.keys(additionalProps)),
    [ADDITIONAL_PROPERTIES_FIELD]: additionalProps,
  }
}

const toInstance = ({ entry, type, nameField, namePrefix }: {
  entry: Values
  type: ObjectType
  nameField: string
  namePrefix?: string
}): InstanceElement => {
  // TODON improve, don't use type except in specific cases. also put as annotation?
  const name = _.get(entry, nameField)
  if (name === undefined) {
    throw new Error(`could not find name for entry - expected name field ${nameField}, available fields ${Object.keys(entry)}`)
  }
  const naclName = naclCase((namePrefix ? `${namePrefix}__${name}` : name).slice(0, 100))

  const inst = new InstanceElement(
    naclName,
    type,
    normalizeAdditionalProps(entry, type),
    [ZUORA, RECORDS_PATH, pathNaclCase(type.elemID.name), pathNaclCase(naclName)],
  )

  return inst
}

const extractNestedFields = ({ inst, fieldsToExtract, fieldsToOmit }: {
  inst: InstanceElement
  fieldsToExtract?: Record<string, Required<FieldToExtractConfig>>
  fieldsToOmit?: string[]
}): InstanceElement[] => {
  if (_.isEmpty(fieldsToExtract)) {
    return [inst]
  }
  const additionalInstances: InstanceElement[] = []

  const fieldsToExtractByID = _.pickBy(_.mapKeys(
    fieldsToExtract,
    (_val, key) => inst.type.fields[key].elemID.getFullName(),
  ), isDefined)

  const replaceWithReference = (
    value: Values,
    objType: ObjectType,
    { nameField, nestName }: Required<FieldToExtractConfig>,
  ): ReferenceExpression => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const [refInst] = generateInstancesForType({
      entries: [value],
      objType,
      nameField,
      namePrefix: nestName ? inst.elemID.name : undefined,
      fieldsToOmit,
    })
    additionalInstances.push(refInst)
    return new ReferenceExpression(refInst.elemID)
  }

  const extractFields: TransformFunc = ({ value, field, path }) => {
    // TODON also support maps if needed
    const fieldExtractionDef = field && fieldsToExtractByID[field.elemID.getFullName()]
    if (field !== undefined && fieldExtractionDef !== undefined && !isReferenceExpression(value)) {
      const refType = isListType(field.type) ? field.type.innerType : field.type
      if (!isObjectType(refType)) {
        log.error(`unexpected type encountered when extracting nested fields - skipping path ${path} for instance ${inst.elemID.getFullName()}`)
        return value
      }
      if (Array.isArray(value)) {
        return value.map(val => replaceWithReference(val, refType, fieldExtractionDef))
      }
      return replaceWithReference(value, refType, fieldExtractionDef)
    }
    return value
  }

  const updatedInst = transformElement({
    element: inst,
    transformFunc: extractFields,
    strict: false,
  })
  return [updatedInst, ...additionalInstances]
}

export const generateInstancesForType = ({
  entries,
  objType,
  nameField,
  namePrefix,
  fieldsToOmit,
  fieldsToExtract,
}: {
  entries: Values[]
  objType: ObjectType
  nameField: string
  namePrefix?: string
  fieldsToOmit?: string[]
  fieldsToExtract?: Record<string, Required<FieldToExtractConfig>>
}): InstanceElement[] => (
  entries
    .map(entry => toInstance({
      entry,
      type: objType,
      nameField,
      namePrefix,
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
    .flatMap(inst => extractNestedFields({ inst, fieldsToExtract, fieldsToOmit }))
)
