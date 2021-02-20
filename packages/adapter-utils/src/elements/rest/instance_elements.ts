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
import { values as lowerDashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { transformElement, TransformFunc } from '../../utils'
import { pathNaclCase, naclCase } from '../../nacl_case_utils'
import { RECORDS_PATH } from '../constants'
import { FieldToExtractConfig, ElementTranslationDefaultsConfig, ElementTranslationConfig } from './endpoint_config'
import { ADDITIONAL_PROPERTIES_FIELD } from './type_elements'

const { isDefined } = lowerDashValues
const log = logger(module)

/**
 * Normalize the element's values:
 * - omit nulls
 * - nest additionalProperties under the additionalProperties field in order to align with the type
 *
 * Note: The reverse will need to be done pre-deploy (not implemented for fetch-only)
 */
const normalizeElementValues = (instance: InstanceElement): InstanceElement => {
  const transformAdditionalProps: TransformFunc = ({ value, field, path }) => {
    // removing nulls since they're not handled correctly in nacls
    if (value === null) {
      return undefined
    }

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

const toInstance = ({
  entry,
  type,
  nestName,
  parent,
  nameField,
  pathField,
}: {
  entry: Values
  type: ObjectType
  nestName?: boolean
  parent?: InstanceElement
  nameField: string
  pathField: string
}): InstanceElement => {
  const name = _.get(entry, nameField)
  if (name === undefined) {
    throw new Error(`could not find name for entry - expected name field ${nameField}, available fields ${Object.keys(entry)}`)
  }
  const naclName = naclCase(
    (parent && nestName ? `${parent.elemID.name}__${name}` : String(name)).slice(0, 100)
  )
  const fileName = _.get(entry, pathField)
  const naclFileName = pathNaclCase(fileName ? naclCase(fileName) : naclName)

  const adapterName = type.elemID.adapter

  const inst = new InstanceElement(
    naclName,
    type,
    entry,
    [adapterName, RECORDS_PATH, pathNaclCase(type.elemID.name), naclFileName],
    parent ? { [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(parent.elemID)] } : undefined,
  )
  return normalizeElementValues(inst)
}

/**
 * Extract nested fields to their own instances, and convert the original value to a reference.
 */
const extractNestedFields = (
  inst: InstanceElement,
  {
    fieldsToExtract,
    translationDefaults,
  }: {
    fieldsToExtract: FieldToExtractConfig[]
    translationDefaults: ElementTranslationDefaultsConfig
  },
): InstanceElement[] => {
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

  const replaceWithReference = ({ value, parent, objType, nestName, nameField, pathField }: {
    value: Values
    parent: InstanceElement
    objType: ObjectType
    nestName?: boolean
    nameField: string
    pathField: string
  }): ReferenceExpression => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const [refInst] = generateInstancesForType({
      entries: [value],
      objType,
      nestName,
      parent,
      translation: {
        nameField,
        pathField,
      },
      translationDefaults,
    })
    additionalInstances.push(refInst)
    return new ReferenceExpression(refInst.elemID)
  }

  const extractFields: TransformFunc = ({ value, field, path }) => {
    const fieldExtractionDef = field && fieldsToExtractByID[field.elemID.getFullName()]
    if (field !== undefined && fieldExtractionDef !== undefined && !isReferenceExpression(value)) {
      const refType = isListType(field.type) ? field.type.innerType : field.type
      if (!isObjectType(refType)) {
        log.error(`unexpected type encountered when extracting nested fields - skipping path ${path} for instance ${inst.elemID.getFullName()}`)
        return value
      }
      if (Array.isArray(value)) {
        return value.map(val => replaceWithReference({
          value: val,
          parent: inst,
          objType: refType,
          nestName: fieldExtractionDef.nestName,
          nameField: fieldExtractionDef.nameField ?? translationDefaults.nameField,
          pathField: fieldExtractionDef.pathField ?? translationDefaults.pathField,
        }))
      }
      return replaceWithReference({
        value,
        parent: inst,
        objType: refType,
        nestName: fieldExtractionDef.nestName,
        nameField: fieldExtractionDef.nameField ?? translationDefaults.nameField,
        pathField: fieldExtractionDef.pathField ?? translationDefaults.pathField,
      })
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

/**
 * Generate instances for the specified types based on the entries from the API responses,
 * using the endpoint's specific config and the adapter's defaults.
 */
export const generateInstancesForType = ({
  entries,
  objType,
  nestName,
  parent,
  translation,
  translationDefaults,
}: {
  entries: Values[]
  objType: ObjectType
  nestName?: boolean
  parent?: InstanceElement
  translation?: ElementTranslationConfig
  translationDefaults: ElementTranslationDefaultsConfig
}): InstanceElement[] => (
  entries
    .map(entry => toInstance({
      entry,
      type: objType,
      nestName,
      parent,
      nameField: translation?.nameField ?? translationDefaults.nameField,
      pathField: translation?.pathField ?? translationDefaults.pathField,
    }))
    .map(inst => transformElement({
      element: inst,
      transformFunc: ({ value, field }) => (
        (field !== undefined && isPrimitiveType(field.type)
          && translationDefaults.primitiveFieldsToOmit?.includes(field.name))
          ? undefined
          : value
      ),
      strict: false,
    }))
    .flatMap(inst => (
      _.isEmpty(translation?.fieldsToExtract)
        ? [inst]
        : extractNestedFields(inst, {
          fieldsToExtract: translation?.fieldsToExtract as FieldToExtractConfig[],
          translationDefaults,
        })
    ))
)
