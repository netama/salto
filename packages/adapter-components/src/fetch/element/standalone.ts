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
import { ElemIdGetter, InstanceElement, ReferenceExpression, getDeepInnerTypeSync, isObjectType, isReferenceExpression } from '@salto-io/adapter-api'
import { TransformFuncSync, transformValuesSync } from '@salto-io/adapter-utils'
import { collections } from '@salto-io/lowerdash'
import { FetchApiDefinitions } from '../../definitions/system/fetch/fetch'
import { createInstance } from './instance_utils'

const extractStandaloneInstancesFromField = ({ elementDefs, instanceOutput, getElemIdFunc, parent }: {
  elementDefs: FetchApiDefinitions['instances']
  instanceOutput: InstanceElement[]
  getElemIdFunc?: ElemIdGetter
  parent: InstanceElement
}): TransformFuncSync => ({ value, field }) => {
  if (field === undefined || isReferenceExpression(value)) {
    return value
  }
  const parentType = field.parent.elemID.name
  // TODON make sure to overwrite field type to standalone value
  const standaloneDef = _.merge(
    elementDefs.customizations[parentType]?.element?.ignoreDefaultFieldCustomizations
      ? undefined
      : elementDefs.default?.element?.fieldCustomizations?.[field.name]?.standalone,
    elementDefs.customizations[parentType]?.element?.fieldCustomizations?.[field.name]?.standalone,
  )
  if (standaloneDef?.typeName === undefined) {
    return value
  }
  // TODON expecting only lists, not maps - verify (and technically, only one nesting level - unless we flatten)
  const fieldType = getDeepInnerTypeSync(field.getTypeSync())
  // TODON better handling
  if (!isObjectType(fieldType)) {
    throw new Error(`field type for ${field.elemID.getFullName()} is not an object type`)
  }
  if (fieldType.elemID.name !== standaloneDef.typeName) {
    throw new Error(`unexpected field type for ${field.elemID.getFullName()} (expected: ${standaloneDef.typeName} but found: ${fieldType.elemID.name})`)
  }
  const newInstances = collections.array.makeArray(value).map((entry, index) => createInstance({
    entry,
    elementDefs,
    type: fieldType,
    getElemIdFunc,
    // TODON pick better default name? use service ids as well
    defaultName: `unnamed_${index}`,
    parent: standaloneDef.addParentAnnotation ? parent : undefined,
    nestName: true, // TODON check
    // TODON decide about other args
  }))
  newInstances.forEach(inst => instanceOutput.push(inst))

  if (!standaloneDef.referenceFromParent) {
    return undefined
  }
  const refs = newInstances.map(inst => new ReferenceExpression(inst.elemID, inst))
  if (Array.isArray(value)) {
    return refs
  }
  return refs[0]
}

/**
 * Extract fields marked as standalone into their own instances.
 * - if standalone.referenceFromParent=true, the original value is converted to a reference - otherwise it's omitted.
 * - if standalone.addParentAnnotation=true, the newly-created instance gets a parent annotation.
 *
 * Note: modifies the instances array in-place.
 */
export const extractStandaloneInstances = ({ instances, elementDefs, getElemIdFunc }: {
  instances: InstanceElement[]
  elementDefs: FetchApiDefinitions['instances']
  getElemIdFunc?: ElemIdGetter
}): InstanceElement[] => {
  const instancesToProcess: InstanceElement[] = []
  instances.forEach(inst => instancesToProcess.push(inst))
  const outInstances: InstanceElement[] = []

  while (instancesToProcess.length > 0) {
    const inst = instancesToProcess.pop()
    if (inst === undefined) {
      // cannot happen
      break
    }
    outInstances.push(inst)
    const value = transformValuesSync({
      values: inst.value,
      type: inst.getTypeSync(),
      strict: false,
      pathID: inst.elemID,
      transformFunc: extractStandaloneInstancesFromField({
        elementDefs,
        instanceOutput: instancesToProcess,
        getElemIdFunc,
        parent: inst,
      }),
    })
    if (value !== undefined) {
      inst.value = value
    }
  }
  return outInstances
}
