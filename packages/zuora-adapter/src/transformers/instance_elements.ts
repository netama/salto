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
  isReferenceExpression, CORE_ANNOTATIONS, isPrimitiveType,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase, transformElement, TransformFunc, elements as elementsUtils } from '@salto-io/adapter-utils'
import { values as lowerDashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { ZUORA_BILLING, ADDITIONAL_PROPERTIES_FIELD, INSTANCE_ID } from '../constants'
import { CUSTOMIZATIONS } from './customizations'
import { getNameField, apiName, getPathField } from './transformer'

const { isDefined } = lowerDashValues
const { RECORDS_PATH } = elementsUtils
const log = logger(module)

// TODON also need the reverse pre-deploy
const normalizeAdditionalProps = (instance: InstanceElement): InstanceElement => {
  const transformAdditionalProps: TransformFunc = ({ value, field, path }) => {
    // // unrelated - removing nulls since they're not handled correctly in nacls
    // if (value === null) {
    //   return undefined
    // }

    const fieldType = path?.isEqual(instance.elemID) ? instance.type : field?.type
    if (
      !isObjectType(fieldType)
      || fieldType.fields[ADDITIONAL_PROPERTIES_FIELD] === undefined
    ) {
      return value
    }

    const additionalProps = _.pickBy(value, (_val, key) => (
      !(
        Object.keys(fieldType.fields).includes(key)
        || Object.keys(fieldType.annotationTypes).includes(key)
      )
    ))
    return {
      ..._.omit(value, Object.keys(additionalProps)),
      [ADDITIONAL_PROPERTIES_FIELD]: additionalProps,
    }
  }

  return transformElement({
    element: instance,
    transformFunc: transformAdditionalProps,
    strict: false,
  })
}

const toInstance = ({ entry, type, nestName, parent }: {
  entry: Values
  type: ObjectType
  nestName?: boolean
  parent?: InstanceElement
}): InstanceElement => {
  // TODON improve, don't use type except in specific cases. also put as annotation?
  const nameField = getNameField(type.elemID.name)
  const name = _.get(entry, nameField)
  if (name === undefined) {
    throw new Error(`could not find name for entry - expected name field ${nameField}, available fields ${Object.keys(entry)}`)
  }
  const naclName = naclCase(
    (parent && nestName ? `${apiName(parent)}__${name}` : String(name)).slice(0, 100)
  )
  const fileName = _.get(entry, getPathField(type.elemID.name))
  const naclFileName = pathNaclCase(fileName ? naclCase(fileName) : naclName)

  const inst = new InstanceElement(
    naclName,
    type,
    {
      ...entry,
      ...parent ? { [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(parent.elemID)] } : {},
    },
    [ZUORA_BILLING, RECORDS_PATH, pathNaclCase(type.elemID.name), naclFileName],
    {
      [INSTANCE_ID]: naclName,
    },
  )
  return normalizeAdditionalProps(inst)
}

const extractNestedFields = (inst: InstanceElement): InstanceElement[] => {
  const fieldsToExtract = CUSTOMIZATIONS.fieldsToExtract[apiName(inst.type)]
  if (_.isEmpty(fieldsToExtract)) {
    return [inst]
  }
  const additionalInstances: InstanceElement[] = []

  const fieldsToExtractByID = _.pickBy(
    _.keyBy(
      fieldsToExtract,
      ({ fieldName }) => inst.type.fields[fieldName]?.elemID.getFullName(),
    ),
    isDefined,
  )

  const replaceWithReference = (
    value: Values,
    objType: ObjectType,
    nestName?: boolean,
  ): ReferenceExpression => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const [refInst] = generateInstancesForType({
      entries: [value],
      objType,
      nestName,
      parent: inst,
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
        return value.map(val => replaceWithReference(val, refType, fieldExtractionDef.nestName))
      }
      return replaceWithReference(value, refType, fieldExtractionDef.nestName)
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
  nestName,
  parent,
}: {
  entries: Values[]
  objType: ObjectType
  nestName?: boolean
  parent?: InstanceElement
}): InstanceElement[] => (
  entries
    .map(entry => toInstance({
      entry,
      type: objType,
      nestName,
      parent,
    }))
    .map(inst => transformElement({
      element: inst,
      transformFunc: ({ value, field }) => (
        (field !== undefined && isPrimitiveType(field.type)
          && CUSTOMIZATIONS.primitiveFieldsToOmit.includes(field.name))
          ? undefined
          : value
      ),
      strict: false,
    }))
    .flatMap(inst => extractNestedFields(inst))
)
