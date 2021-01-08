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
import {
  Element, ObjectType, isObjectType, ElemID, CORE_ANNOTATIONS, InstanceElement,
  ReferenceExpression,
  isReferenceExpression,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase, transformValues, TransformFunc } from '@salto-io/adapter-utils'
import _ from 'lodash'
import {
  API_NAME, CUSTOM_OBJECT, METADATA_TYPE, ZUORA, CUSTOM_OBJECT_DEFINITION_TYPE, OBJECTS_PATH,
  ADDITIONAL_PROPERTIES_FIELD,
} from '../constants'
import { FilterCreator } from '../filter'
import {
  apiName, isInstanceOfCustomObjectDef, toPrimitiveType,
} from '../transformers/transformer'
import { TYPE_ANNOTATIONS } from '../transformers/type_elements'

const createObjectFromInstance = (inst: InstanceElement): ObjectType => (
  new ObjectType({
    elemID: new ElemID(ZUORA, apiName(inst)),
    fields: _.mapValues(
      {
        ..._.omit(inst.value.schema.properties, ADDITIONAL_PROPERTIES_FIELD),
        ...inst.value.schema.properties[ADDITIONAL_PROPERTIES_FIELD],
      },
      // TODON extend
      prop => ({
        // TODON check what are all the possible types - doesn't matter yet
        // because we also keep all the original data as annotations,
        // but eventually we should ensure the type is correct even if
        // referencing a non-primitive type / using another naming convention
        type: toPrimitiveType(prop.type),
        annotations: prop,
      }),
    ),
    annotationTypes: _.clone(TYPE_ANNOTATIONS),
    annotations: {
      [API_NAME]: apiName(inst),
      [METADATA_TYPE]: CUSTOM_OBJECT,
      [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(inst.elemID)],
      // TODON add label?
    },
    path: [ZUORA, OBJECTS_PATH, pathNaclCase(naclCase(apiName(inst)))],
  })
)

const updateCustomObjectInstance = (inst: InstanceElement, type: ObjectType): void => {
  const schemaType = inst.type.fields.schema.type as ObjectType
  const schemaPropsField = schemaType.fields.properties
  const schemaPropsFieldType = schemaPropsField.type as ObjectType
  const schemaPropsAddlPropField = schemaPropsFieldType.fields[
    ADDITIONAL_PROPERTIES_FIELD
  ]

  if (!isInstanceOfCustomObjectDef(inst) || !isObjectType(schemaType)) {
    return
  }

  const replaceWithReferences: TransformFunc = ({ value, field }) => {
    if (isReferenceExpression(value)) {
      return value
    }

    if (field?.isEqual(inst.type.fields.type)) {
      return new ReferenceExpression(type.elemID)
    }
    if (field?.isEqual(schemaType.fields.object)) {
      return new ReferenceExpression(type.elemID)
    }
    if (
      (field?.isEqual(schemaPropsField) || field?.isEqual(schemaPropsAddlPropField))
      // && path?.isEqual(inst.elemID.createNestedID('schema', 'properties'))
      && _.isObjectLike(value)
    ) {
      return _.mapValues(value, (fieldDef, fieldName) => (type.fields[fieldName] !== undefined
        ? new ReferenceExpression(type.fields[fieldName].elemID)
        : fieldDef))
    }
    if (
      (field?.isEqual(schemaType.fields.required) || field?.isEqual(schemaType.fields.filterable))
      && Array.isArray(value)
    ) {
      return value.map(fieldName => (type.fields[fieldName]
        ? new ReferenceExpression(type.fields[fieldName].elemID)
        : fieldName))
    }
    return value
  }

  inst.value = transformValues({
    values: inst.value,
    type: inst.type,
    transformFunc: replaceWithReferences,
    strict: false,
    pathID: inst.elemID,
  }) ?? inst.value
}

/**
 * Custom objects filter.
 * Fetches the custom objects via the soap api and adds them to the elements
 */
const filterCreator: FilterCreator = () => ({
  onFetch: async (elements: Element[]): Promise<void> => {
    const customObjectDefType = elements.filter(isObjectType).find(
      e => apiName(e) === CUSTOM_OBJECT_DEFINITION_TYPE
    )
    if (customObjectDefType === undefined) {
      // should not happen
      throw new Error(`could not find ${CUSTOM_OBJECT_DEFINITION_TYPE} object type`)
    }
    const customObjectInstances: Record<string, InstanceElement> = _.keyBy(
      elements.filter(isInstanceOfCustomObjectDef),
      apiName,
    )

    const newElements = Object.values(customObjectInstances).map(createObjectFromInstance)

    // TODON not removing the original elements yet, because they have data we are not using -
    // only referencing the object and its fields for now.
    elements.push(...newElements)
    newElements.forEach(
      elem => updateCustomObjectInstance(customObjectInstances[apiName(elem)], elem)
    )

    // TODON also add custom objects for the standard types
  },
})

export default filterCreator
