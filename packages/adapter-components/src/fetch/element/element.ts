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
import { ElemIdGetter, Element, ObjectType, Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { ElementQuery } from '../query'
import { FetchElements } from '../../elements'
import { generateInstancesForType } from './instance_element'
import { FetchApiDefinitions } from '../../definitions/system/fetch'
import { mergeSingleDefWithDefault } from '../../definitions'
import { adjustFieldTypes } from './type_utils'

const log = logger(module)

export type ElementGenerator = {
  /*
   * process a single entry that will become an instance of the specified type
   * (if the type's definition contains standalone fields, then more than one instance)
   */
  processEntries: (args: {
    typeName: string
    entries: unknown[]
  }) => void

  // produce all types and instances based on all entries processed until now
  generate: () => FetchElements
}

// const createElemIDGetter = (): ElemIdGetter => {
//   // TODON
// }

export const getElementGenerator = ({ adapterName, elementDefs, predefinedTypes, getElemIdFunc }: {
  adapterName: string
  fetchQuery: ElementQuery // TDOON use
  elementDefs: FetchApiDefinitions['instances']
  // TODON decide if want openAPI to have generated object types, or only populated the config
  predefinedTypes?: Record<string, ObjectType>
  getElemIdFunc?: ElemIdGetter
  // customInstanceFilter, // TODON check if can move to earlier and if needed at all
  // shouldAddRemainingTypes?: boolean // TODON see if needed
}): ElementGenerator => {
  // TODON implement
  const valuesByType: Record<string, Values[]> = {}

  // const elemIDGetter = createElemIDGetter(instanceDefs)

  const processEntries: ElementGenerator['processEntries'] = ({ typeName, entries }) => {
    const { element: elementDef } = mergeSingleDefWithDefault(
      elementDefs.default,
      elementDefs.customizations[typeName],
    ) ?? {}
    const valueGuard = elementDef?.topLevel?.valueGuard ?? lowerdashValues.isPlainObject
    const [validEntries, invalidEntries] = _.partition(entries, valueGuard)
    // TODON add better logging
    log.warn('[%s] omitted %d entries of type %s that did not match the value guard', adapterName, invalidEntries.length, typeName)

    // TODON should be a map and not a list, keyed by the service id - starting with _something_ and will update
    if (valuesByType[typeName] === undefined) {
      valuesByType[typeName] = []
    }
    // TODON filter based on query (if making it possible to filter by resource)
    valuesByType[typeName].push(...validEntries)
  }
  const generate: ElementGenerator['generate'] = () => {
    const allElements = Object.entries(valuesByType).flatMap(([typeName, values]) => generateInstancesForType({
      adapterName,
      elementDefs,
      entries: values,
      typeName,
      definedTypes: predefinedTypes, // TDOON align names?
      getElemIdFunc,
    }))
    const instances = allElements.flatMap(e => e.instances)
    // TODON check for overlaps?
    const [finalTypeLists, typeListsToAdjust] = _.partition(allElements, t => t.typesAreFinal)
    const finalTypeNames = new Set(finalTypeLists.flatMap(t => t.types).map(t => t.elemID.name))
    const definedTypes = _.keyBy(
      // concatenating in this order so that the final types will take precedence (TODON verify)
      typeListsToAdjust.concat(finalTypeLists).flatMap(t => t.types),
      t => t.elemID.name,
    )
    // TODON regenerate all types and update in-place for instances!
    adjustFieldTypes({ definedTypes, elementDefs, finalTypeNames })
    // TODON errors, configChanges
    return {
      elements: (instances as Element[]).concat(Object.values(definedTypes)),
      // TODON errors, configChanges - from somewhere else?
    }
    // TODON filter based on query! but should also remove sub-resources so should do only at teh end
    // - just keep as filter for now? need to decide, should probably move it up here
    // const filteredInstances = instances.filter(instance => args.fetchQuery.isInstanceMatch(instance))
  }
  return {
    processEntries,
    generate,
  }
}
