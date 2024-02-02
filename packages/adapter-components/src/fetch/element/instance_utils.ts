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
import { ElemIdGetter, INSTANCE_ANNOTATIONS, InstanceElement, ObjectType, ReferenceExpression, Values } from '@salto-io/adapter-api'
import { TransformFuncSync, invertNaclCase, naclCase, transformValuesSync } from '@salto-io/adapter-utils'
import { collections } from '@salto-io/lowerdash'
import { FetchApiDefinitions } from '../../definitions/system/fetch'
import { mergeSingleDefWithDefault } from '../../definitions'
import { createElemIDFunc, getElemPath } from './id_utils'

/**
 * Transform a value to a valid instance value by nacl-casing all its keys,
 * so that they can appear as valid elem id parts.
 * Note:
 * - when used as an instance value, the relevant type elements' fields should also be nacl-cased separately.
 * - in most cases, this transformation should be reverted before deploy. this can be done be setting invert=true
 */
const recursiveNaclCase = (value: Values, invert = false): Values => {
  const func = invert ? invertNaclCase : naclCase
  return _.cloneDeepWith(value, val => (
    _.isPlainObject(val)
      ? _.mapKeys(val, (_v, k) => func(k))
      : val
  ))
}

/**
 * - omit values of fields marked as omit=true
 * - omit null values
 */
const omitValues: (elementDefs: FetchApiDefinitions['instances']) => TransformFuncSync = elementDefs => ({ value, field }) => {
  // TODON should omit fields even if they're not in the type! make sure works after Farkash's change
  if (value === null) {
    return undefined
  }
  if (field !== undefined) {
    const parentType = field.parent.elemID.name
    // TODON improve - should add a way to query these... move to merge function
    const shouldOmit = (
      // either the field is defined as omitted directly
      elementDefs.customizations[parentType]?.element?.fieldCustomizations?.[field.name]?.omit
      || (
        elementDefs.customizations[parentType]?.element?.fieldCustomizations?.[field.name]?.omit === undefined
        && elementDefs.default?.element?.fieldCustomizations?.[field.name]?.omit
        && !elementDefs.customizations[parentType]?.element?.ignoreDefaultFieldCustomizations
      )
      // or it is not explicitly overwritten, and we haven't defined overrideDefaultFieldCustomizations,
      // and the default is to omit - TODON support!
    )
    if (shouldOmit) {
      return undefined
    }
  }
  return value
}

/**
 * Prepare an entry to be used as an instance value.
 * The value is transformed as follows:
 * - all keys are nacl-cased to ensure elem ids can be created (TODON should be reversed pre deploy!)
 * - omitting the values of fields marked as omit=true, as well as null values.
 *
 * Note: standalone fields' values with referenceFromParent=false should be omitted separately
 */
export const toInstanceValue = ({ value, elementDefs, type }: {
  value: Values
  elementDefs: FetchApiDefinitions['instances']
  type: ObjectType
}): Values => transformValuesSync({
  // nacl-case all keys recursively
  values: recursiveNaclCase(value),
  type,
  transformFunc: omitValues(elementDefs),
  strict: false, // TODON compare to "real" code
})

export type InstanceCreationParams = {
  entry: Values
  type: ObjectType
  elementDefs: FetchApiDefinitions['instances']
  defaultName: string
  nestName?: boolean // TODON
  nestedPath?: string[]
  parent?: InstanceElement
  getElemIdFunc?: ElemIdGetter
}

/**
 * Generate an instance for a single entry returned for a given type, and set its elem id and path.
 * Assuming the entry is already in its final structure (after running to InstanceValue).
 */
export const createInstance = ({
  entry,
  elementDefs,
  type,
  defaultName,
  // TODON use!
  // nestName,
  // nestedPath,
  parent,
  getElemIdFunc,
}: InstanceCreationParams): InstanceElement => {
  // TODON upgrade impact - "better" child elem ids, only one nacl-case
  const { adapter: adapterName, typeName } = type.elemID

  // TODON combine with user definitions for elemIDs! should be transparent here, and done in the adapter when
  // merging the definitions
  // TODON need a smarter combination for omit due to overrideDefaultFieldCustomizations
  const { element: elementDef, resource: resourceDef } = mergeSingleDefWithDefault(
    elementDefs.default,
    elementDefs.customizations[typeName]
  ) ?? {}
  if (elementDef?.ignoreDefaultFieldCustomizations) {
    // ignore the default
    // TODON apply everywehre relevant - should wrap with a utility function instead of the generic one
    elementDef.fieldCustomizations = elementDefs.customizations[typeName]?.element?.fieldCustomizations
  }

  // TODON technically tested in parent, see if can ignore
  if (!elementDef?.topLevel?.isTopLevel) {
    const error = `type ${adapterName}:${typeName} is not defined as top-level, cannot create instances`
    throw new Error(error) // TODON different error type?
  }

  const { elemID: elemIDDef } = elementDef.topLevel

  // TODON take into account elem id getter - at least in elem id, maybe also for path?
  // just keep today's behavior for now... (so - path hint will still change? which might be good)
  const toElemName = (elemIDDef?.custom ?? createElemIDFunc)({
    elemIDDef: elemIDDef ?? {},
    getElemIdFunc,
    serviceIDDef: resourceDef?.serviceIDFields,
    typeID: type.elemID,
    defaultName,
  })
  const toPath = getElemPath({
    def: elementDef.topLevel.path,
    elemIDCreator: toElemName,
    typeID: type.elemID,
  })

  // TODON recursively convert all keys to naclCase before creating type (and adjust type fields as well)

  const annotations = _.pick(entry, Object.keys(INSTANCE_ANNOTATIONS))
  const value = _.omit(entry, Object.keys(INSTANCE_ANNOTATIONS))
  if (parent !== undefined) {
    annotations[INSTANCE_ANNOTATIONS.PARENT] = collections.array.makeArray(
      annotations[INSTANCE_ANNOTATIONS.PARENT]
    ).push(new ReferenceExpression(parent.elemID, parent))
  }

  // TODON use an alternative version of toBasicInstance that also omits the types recursively
  // TODON extract standalone instances
  return new InstanceElement(
    toElemName({ entry, parentName: parent?.elemID.name }),
    type,
    value,
    toPath(entry),
    annotations,
  )
}
