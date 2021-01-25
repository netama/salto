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
  InstanceElement, isObjectType, ElemID, isInstanceElement, ReferenceExpression, ObjectType,
  Element,
} from '@salto-io/adapter-api'
import { elements as elementUtils } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { WORKATO } from '../constants'
import { FilterCreator } from '../filter'
import { API_CONFIG } from '../types'
import { endpointToTypeName } from '../transformers/transformer'

const log = logger(module)
const { generateType, toInstance } = elementUtils.bootstrap

const convertStringToObject = (inst: InstanceElement, fieldsToExtract: string[]): void => {
  inst.value = _.mapValues(inst.value, (fieldValue, fieldName) => {
    if (fieldsToExtract.includes(fieldName)) {
      try {
        const val = (_.isString(fieldValue) && fieldValue.startsWith('{')
          ? JSON.parse(fieldValue)
          : fieldValue)
        return val
      } catch (e) {
        log.error('failed to convert field %s to JSON. Error: %s, value: %o, stack: %o',
          fieldName, e, fieldValue, e.stack)
      }
    }
    return fieldValue
  })
}

const addFieldTypeAndInstances = ({
  typeName,
  fieldName,
  type,
  instances,
  defaultNameField,
}: {
  typeName: string
  fieldName: string
  type: ObjectType
  instances: InstanceElement[]
  defaultNameField: string
}): Element[] => {
  const elements: Element[] = []
  const instancesWithValues = instances.filter(inst => inst.value[fieldName] !== undefined)
  const fieldType = generateType({
    adapterName: WORKATO,
    // TODON better names, verify can't collide with other types due to shared prefixes
    name: `${typeName}__${fieldName}`,
    entries: instancesWithValues.map(inst => inst.value[fieldName]),
    hasDynamicFields: false,
    isSubType: true,
  })
  type.fields[fieldName].type = fieldType.type
  elements.push(fieldType.type, ...fieldType.nestedTypes)

  instancesWithValues.forEach((inst, index) => {
    const fieldInstance = toInstance({
      adapterName: WORKATO,
      entry: inst.value[fieldName],
      type: fieldType.type,
      nameField: defaultNameField,
      defaultName: `inst_${index}`,
      nameSuffix: inst.elemID.name,
    })
    if (fieldInstance === undefined) {
      // cannot happen
      log.error('unexpected empty nested field %s for instance %s', fieldName, inst.elemID.getFullName())
      return
    }
    inst.value[fieldName] = new ReferenceExpression(fieldInstance.elemID)
    elements.push(fieldInstance)
  })
  return elements
}

/**
 * Extract fields to their own types based on the configuration.
 * For each of these fields, extract the values into separate instances and convert the values
 * into reference expressions.
 */
const filter: FilterCreator = ({ config }) => ({
  onFetch: async elements => {
    const typesWithFieldsToExtract = Object.fromEntries(
      config[API_CONFIG].getEndpoints
        .filter(e => e.fieldsToExtract !== undefined && e.fieldsToExtract.length > 0)
        .map(e => [endpointToTypeName(e.endpoint), e.fieldsToExtract as string[]])
    )

    const allTypes = elements.filter(isObjectType)
    const allInstances = elements.filter(isInstanceElement)

    Object.entries(typesWithFieldsToExtract).forEach(([typeName, fieldsToExtract]) => {
      const type = allTypes.find(e => e.elemID.isEqual(new ElemID(WORKATO, typeName)))
      if (type === undefined) {
        log.error('could not find type %s', typeName)
        return
      }
      const instances = allInstances.filter(e => e.type.elemID.isEqual(type.elemID))

      // first convert the fields to the right structure
      instances.forEach(inst => convertStringToObject(inst, fieldsToExtract))

      // now extract the field data to its own type and instances, and replace the original
      // value with a reference to the newly-generate instance
      fieldsToExtract.forEach(fieldName => {
        elements.push(...addFieldTypeAndInstances({
          typeName,
          fieldName,
          type,
          instances,
          defaultNameField: config[API_CONFIG].defaultNameField,
        }))
      })
    })
  },
})

export default filter
