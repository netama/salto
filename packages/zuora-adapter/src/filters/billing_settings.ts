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
  Element, ObjectType, ElemID, MapType, BuiltinTypes, InstanceElement, Values,
} from '@salto-io/adapter-api'
import { pathNaclCase, naclCase } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { FilterCreator } from '../filter'
import {
  isInstanceOfType,
} from '../transformers/transformer'
import { BILLING_SETTINGS_OPERATION_INFO_TYPE, ZUORA, RECORDS_PATH } from '../constants'

const log = logger(module)

/**
 * Billing settings filter.
 * Fetches the billing settings based on the schemas returned from /settings/listing
 */
const filterCreator: FilterCreator = ({ client }) => ({
  onFetch: async (elements: Element[]): Promise<void> => {
    const settingsOpsInfoInstances = elements.filter(
      isInstanceOfType(BILLING_SETTINGS_OPERATION_INFO_TYPE)
    )
    const results = await Promise.all(settingsOpsInfoInstances.map(async settingsInfo => {
      const getOperation = settingsInfo.value.httpOperations.find(
        (op: { method: string }) => op.method === 'GET'
      )
      if (getOperation === undefined) {
        // nothing to retrieve
        return {}
      }
      const { url: endpointName /* , responseType */ } = getOperation
      // TODON construct object type from response type, similarly to main flow
      // const type =
      const parsedURL = new URL(endpointName, 'http://localhost')
      const urlArgs = Object.fromEntries(parsedURL.searchParams.entries())
      if (Object.keys(urlArgs).length > 0) {
        // TODON cannot determine args automatically, but can prepare dependsOn settings
        // for the ones we do
        log.error(`settings url ${endpointName} requires parameters - skipping for now`)
        return {}
      }
      try {
        return { [settingsInfo.value.key]: (await client.get({ endpointName })).result }
      } catch (e) {
        log.error(`Could not fetch ${endpointName}: ${e}. %s`, e.stack)
        return {}
      }
    }))
    const resultsByType: Record<string, Values[]> = Object.assign({}, ...results)

    // TODON temp code - reuse original code from adapter for type + instance generation
    const placeholderObjectType = new ObjectType({
      elemID: new ElemID(ZUORA, 'billing__settingsPlaceholderType'),
      fields: {
        data: { type: new MapType(BuiltinTypes.UNKNOWN) },
      },
    })
    const instances = Object.entries(resultsByType).flatMap(([type, entries]) => (
      entries.map((res, idx) => {
        const instanceName = ['billing', naclCase(res.name ?? res.id ?? `inst_${idx}`)].join('__')
        return new InstanceElement(
          instanceName,
          placeholderObjectType,
          { data: res },
          [ZUORA, RECORDS_PATH, type, pathNaclCase(instanceName)]
        )
      })
    ))
    elements.push(placeholderObjectType, ...instances)
  },
})

export default filterCreator
