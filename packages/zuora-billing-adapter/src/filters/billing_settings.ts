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
  Element, ObjectType, ElemID, MapType, BuiltinTypes, InstanceElement, Values, isInstanceElement,
} from '@salto-io/adapter-api'
import { elements as elementsUtils } from '@salto-io/adapter-components'
import { pathNaclCase, naclCase } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import { FilterCreator } from '../filter'
import { ZUORA_BILLING, BILLING_SETTINGS_OPERATION_INFO_TYPE } from '../constants'

const { toArrayAsync } = collections.asynciterable
const log = logger(module)
const { RECORDS_PATH, TYPES_PATH } = elementsUtils

const isInstanceOfType = (type: string) => (
  (elem: Element): elem is InstanceElement => (
    isInstanceElement(elem) && elem.type.elemID.typeName === type
  )
)

/**
 * Billing settings filter.
 * Fetches the billing settings based on the schemas returned from /settings/listing
 */
const filterCreator: FilterCreator = ({ paginator }) => ({
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
      const { url /* , responseType */ } = getOperation
      // TODON construct object type from response type, similarly to main flow
      // const type =
      const parsedURL = new URL(url, 'http://localhost')
      const urlArgs = Object.fromEntries(parsedURL.searchParams.entries())
      if (Object.keys(urlArgs).length > 0 || url.includes('{')) { // TODON use matcher
        // TODON cannot determine args automatically, but can prepare dependsOn settings
        // for the ones we do
        log.error(`settings url ${url} requires parameters - skipping for now`)
        return {}
      }
      try {
        return {
          [settingsInfo.value.key]: (await toArrayAsync(await paginator({
            url,
          }))).flat(),
        }
      } catch (e) {
        log.error(`Could not fetch ${url}: ${e}. %s`, e.stack)
        return {}
      }
    }))
    const resultsByType: Record<string, Values[]> = Object.assign({}, ...results)

    // TODON temp code - reuse original code from adapter for type + instance generation
    const placeholderObjectType = new ObjectType({
      elemID: new ElemID(ZUORA_BILLING, 'settingsPlaceholderType'),
      fields: {
        data: { type: new MapType(BuiltinTypes.UNKNOWN) },
      },
      path: [ZUORA_BILLING, TYPES_PATH, 'settingsPlaceholderType'],
    })
    const instances = Object.entries(resultsByType).flatMap(([type, entries]) => (
      entries.map((res, idx) => {
        const instanceName = naclCase(res.name ?? res.id ?? `${type}_unnamed_${idx}`) // TODO rename
        return new InstanceElement(
          instanceName,
          placeholderObjectType,
          { data: res },
          [ZUORA_BILLING, RECORDS_PATH, type, pathNaclCase(instanceName)]
        )
      })
    ))
    elements.push(placeholderObjectType, ...instances)
  },
})

export default filterCreator
