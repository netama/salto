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
import { ElemID, ElemIdGetter, /* ElemIdGetter, */ InstanceElement, ObjectType, TypeElement, Values } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { ElementQuery } from './query'
import { FetchElements } from '../elements'
import { ElementFetchDefinition } from '../definitions/system/fetch/element'

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
  generate: () => Promise<FetchElements>
}

// const createElemIDGetter = (): ElemIdGetter => {
//   // TODON
// }

export const getElementGenerator = (args: {
  adapterName: string
  fetchQuery: ElementQuery
  elementDefs: Record<string, ElementFetchDefinition>
  // TODON decide if want openAPI to have generated object types, or only populated the config
  predefinedTypes?: Record<string, TypeElement>
  getElemIdFunc?: ElemIdGetter
  // customInstanceFilter, // TODON check if can move to earlier and if needed at all
  shouldAddRemainingTypes?: boolean // TODON see if needed
}): ElementGenerator => {
  // TODON implement
  const valuesByType: Record<string, Values[]> = {}

  // const elemIDGetter = createElemIDGetter(instanceDefs)

  const processEntries: ElementGenerator['processEntries'] = ({ typeName, entries }) => {
    const valueGuard = args.elementDefs[typeName]?.topLevel?.valueGuard ?? lowerdashValues.isPlainObject
    const [validEntries, invalidEntries] = _.partition(entries, valueGuard)
    // TODON add better logging
    log.warn('[%s] omitted %d entries of type %s that did not match the value guard', args.adapterName, invalidEntries.length, typeName)

    // TODON should be a map and not a list, keyed by the service id - starting with _something_ and will update
    if (valuesByType[typeName] === undefined) {
      valuesByType[typeName] = []
    }
    // TODON filter based on query (if making it possible to filter by resource)
    valuesByType[typeName].push(...validEntries)
  }
  const generate: ElementGenerator['generate'] = async () => {
    const allElements = Object.entries(valuesByType).flatMap(([typeName, values]) => {
      // TODON generate types correctly using predefined type, ducktype, overrides, standalone, etc
      const type = new ObjectType({
        elemID: new ElemID(args.adapterName, typeName),
      })
      const instances = values.map((val, idx) =>
        new InstanceElement(`PLACEHOLDER_${idx}`, type, val, ['Records', typeName, `PLACEHOLDER_${idx}`]))

      return [type, ...instances] // TODON concat instead,
      // TODON errors, configChanges
    })
    return {
      elements: allElements,
      // TODON errors, configChanges
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
