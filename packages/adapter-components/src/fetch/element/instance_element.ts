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
import { logger } from '@salto-io/logging'
import { mergeSingleDefWithDefault } from '../../definitions'
import { GenerateTypeArgs } from '../../definitions/system/fetch/fetch'
import { ElementsAndErrors } from '../../definitions/system/fetch/element'
import { InvalidSingletonType } from '../../config/shared'
import { generateType } from './type_element'
import { createInstance, toInstanceValue } from './instance_utils'
import { extractStandaloneInstances } from './standalone'

const log = logger(module)

/**
 * Create all intsances with initial types, including standalone instances, for the given typename and entries.
 * Note: it is recommended to re-generate types after all instances of all types have been created,
 * since there might be some overlaps between subtypes.
 */
export const generateInstancesForType = (args: Omit<GenerateTypeArgs, 'parentName' | 'isMapWithDynamicType' | 'typeNameOverrides'>): ElementsAndErrors => {
  const { elementDefs, entries, adapterName, typeName, getElemIdFunc } = args
  const { element: elementDef } = mergeSingleDefWithDefault(
    elementDefs.default,
    elementDefs.customizations[typeName]
  ) ?? {}
  if (elementDef === undefined) {
    log.error('could not find any element definitions for type %s:%s', adapterName, typeName)
  }
  if (!elementDef?.topLevel?.isTopLevel) {
    const error = `type ${adapterName}:${typeName} is not defined as top-level, cannot create instances`
    throw new Error(error) // TODON different error type?
  }
  if (elementDef.topLevel?.custom !== undefined) {
    log.info('found custom override for type %s:%s, using it to generate instances and types', adapterName, typeName)
    return elementDef?.topLevel?.custom(elementDef)(args)
  }

  const { elemID: elemIDDef } = elementDef.topLevel
  if (elemIDDef?.singleton && entries.length !== 1) {
    log.warn(`Expected one instance for singleton type: ${typeName} but received: ${entries.length}`)
    throw new InvalidSingletonType(`Could not fetch type ${typeName}, singleton types should not have more than one instance`)
  }

  // create a temporary type recursively so we can correctly extract standalone instances
  // note that all types will be re-generated at the end once instance values have been finalized (TODON do this)
  const { type, nestedTypes } = generateType(args)
  // TODON should also nacl-case field names on predefined fields similarly
  const instances = entries
    .map(value => toInstanceValue({ value, type, elementDefs }))
    .map((entry, index) => createInstance({
      entry,
      elementDefs,
      type,
      getElemIdFunc,
      // TODON pick better default name?
      defaultName: `unnamed_${index}`,
      // TODON decide about others
    }))

  // TODON filter instances before extracting standalone! by query + instance filter if exists

  const instancesWithStandalone = extractStandaloneInstances({
    instances,
    elementDefs,
    getElemIdFunc,
  })

  return { types: [type, ...nestedTypes], instances: instancesWithStandalone }
}
