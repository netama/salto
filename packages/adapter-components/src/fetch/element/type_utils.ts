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
import { BuiltinTypes, CORE_ANNOTATIONS, Field, ListType, MapType, ObjectType, PrimitiveType, TypeElement, createRefToElmWithValue, createRestriction, isEqualElements } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { getContainerForType } from '../../elements/type_elements' // TODON move to type_utils
import { FetchApiDefinitions } from '../../definitions/system/fetch'
import { mergeSingleDefWithDefault } from '../../definitions'

const { isDefined } = lowerdashValues
const log = logger(module)

export const NESTING_SEPARATOR = '__'

export const toNestedTypeName = (parentName: string, nestedTypeName: string): string => (
  `${parentName}${NESTING_SEPARATOR}${nestedTypeName}`
)

export const computeTypesToRename = ({ elementDefs, typeNameOverrides }: {
  elementDefs: FetchApiDefinitions['instances']
  typeNameOverrides?: Record<string, string>
}): Record<string, string> => (
  typeNameOverrides ?? _.merge(
    _.invert(_.pickBy(
      _.mapValues(elementDefs.customizations, def => def.element?.sourceTypeName),
      isDefined,
    )),
    Object.fromEntries(
      // TODON maybe dis-allow standalone in the default definitions to avoid extra complexity here?
      Object.entries(_.pickBy(
        elementDefs.customizations,
        def => Object.values(def.element?.fieldCustomizations ?? {}).some(val => val.standalone?.typeName)
      )).flatMap(([typeName, def]) => {
        // TDOON need to take into account ignoreDefaultFieldCustomizations, add util function
        // TODON can also "cache" the query responses since these are called in a lot of places
        const { element: mergedDef } = mergeSingleDefWithDefault(elementDefs.default, def) ?? {}
        return Object.entries(mergedDef?.fieldCustomizations ?? {})
          .map(([fieldName, { standalone }]) => {
            if (standalone?.typeName !== undefined) {
              return [toNestedTypeName(typeName, fieldName), standalone.typeName]
            }
            return undefined
          })
          .filter(isDefined)
      })
    )
  )
)

export const toPrimitiveType = (val: string): PrimitiveType => _.get(
  {
    string: BuiltinTypes.STRING,
    boolean: BuiltinTypes.BOOLEAN,
    number: BuiltinTypes.NUMBER,
  },
  val,
  BuiltinTypes.UNKNOWN,
)

const toTypeWithContainers = ({ definedTypes, typeName }: {
  definedTypes: Record<string, ObjectType>
  typeName: string
}): TypeElement => {
  const containerDetails = getContainerForType(typeName)
  if (containerDetails?.container === 'list') {
    return new ListType(toTypeWithContainers({ definedTypes, typeName: containerDetails.typeNameSubstring }))
  }
  if (containerDetails?.container === 'map') {
    return new MapType(toTypeWithContainers({ definedTypes, typeName: containerDetails.typeNameSubstring }))
  }
  const type = definedTypes[typeName] ?? toPrimitiveType(typeName)
  if (isEqualElements(type, BuiltinTypes.UNKNOWN) && typeName.toLowerCase() !== 'unknown') {
    log.warn('could not find type %s, falling back to unknown', typeName)
  }
  return type
}

const overrideFieldType = ({ type, fieldName, fieldTypeName, definedTypes }: {
  type: ObjectType
  fieldName: string
  fieldTypeName: string
  definedTypes: Record<string, ObjectType>
}): void => {
  const newFieldType = toTypeWithContainers({ definedTypes, typeName: fieldTypeName })
  if (type.fields[fieldName] === undefined) {
    log.debug(
      'Creating field type for %s.%s with type %s',
      type.elemID.name, fieldName, newFieldType.elemID.name
    )
    type.fields[fieldName] = new Field(type, fieldName, newFieldType)
  }
  const field = type.fields[fieldName]
  log.debug(
    'Modifying field type for %s.%s from %s to %s',
    type.elemID.name, fieldName, field.refType.elemID.name, newFieldType.elemID.name
  )
  field.refType = createRefToElmWithValue(newFieldType)
}

/**
 * Adjust field definitions based on the defined customization.
 */
// TODON use once, after all types have been created
export const adjustFieldTypes = ({ definedTypes, elementDefs, finalTypeNames }: {
  definedTypes: Record<string, ObjectType>
  elementDefs: FetchApiDefinitions['instances']
  finalTypeNames: Set<string>
}): void => {
  Object.entries(definedTypes).forEach(([typeName, type]) => {
    if (finalTypeNames.has(typeName)) {
      log.trace('type %s is marked as final, not adjusting', type.elemID.getFullName())
    }
    // TODON move to utility function, since used multiple times
    const { element: elementDef } = mergeSingleDefWithDefault(
      elementDefs.default,
      elementDefs.customizations[typeName]
    ) ?? {}
    const { ignoreDefaultFieldCustomizations } = elementDef ?? {}
    const fieldCustomizations = (ignoreDefaultFieldCustomizations
      ? elementDefs.customizations[typeName].element?.fieldCustomizations
      : elementDef?.fieldCustomizations) ?? {}

    Object.entries(fieldCustomizations).forEach(([fieldName, customization]) => {
      if (customization.fieldType !== undefined) {
        overrideFieldType({ type, definedTypes, fieldName, fieldTypeName: customization.fieldType })
      }
      const field = type.fields[fieldName]
      if (field === undefined) {
        log.debug('field %s.%s is undefined, not applying customizations', typeName, fieldName)
        return
      }
      const { hide, restrictions, standalone, omit } = customization
      if (restrictions) {
        log.debug(
          'applying restrictions to field %s.%s',
          type.elemID.name, fieldName,
        )
        field.annotate({ [CORE_ANNOTATIONS.RESTRICTION]: createRestriction(restrictions) })
      }
      if (hide) {
        log.debug(
          'hiding field %s.%s',
          type.elemID.name, fieldName,
        )

        field.annotate({ [CORE_ANNOTATIONS.HIDDEN_VALUE]: true })
      }
      if (omit || standalone?.referenceFromParent === false) {
        log.debug(
          'omitting field %s.%s from type',
          type.elemID.name, fieldName,
        )
        // the field's value is removed when constructing the value in extractStandaloneInstances
        delete type.fields[fieldName]
      }
    })
  })
}
