/*
*                      Copyright 2020 Salto Labs Ltd.
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
  Element, isInstanceElement, InstanceElement, ReferenceExpression, ElemID,
} from '@salto-io/adapter-api'
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { transformValues, TransformFunc } from '@salto-io/adapter-utils'
import { WORKDAY_ID_FIELDNAME } from '../constants'
import { FilterCreator } from '../filter'

const log = logger(module)

const convertWIDReferences = (
  inst: InstanceElement,
  instanceIDsByWID: Record<string, ElemID>,
  referenceExpressionCache: Record<string, ReferenceExpression>,
): void => {
  const convertWIDsToReferences: TransformFunc = ({ value, field, path }) => {
    if (
      field
      && field.name === 'value'
      && path?.getFullNameParts().slice(-3)[0] === 'ID'
      && _.isString(value)
    ) {
      if (instanceIDsByWID[value] !== undefined) {
        if (referenceExpressionCache[value] === undefined) {
          referenceExpressionCache[value] = new ReferenceExpression(instanceIDsByWID[value])
        }
        return referenceExpressionCache[value]
      }
    }
    return value
  }

  inst.value = transformValues({
    values: inst.value,
    type: inst.type,
    transformFunc: convertWIDsToReferences,
    strict: false,
    pathID: inst.elemID,
  }) ?? inst.value
}

/**
 * Convert references based on WIDs
 */
const filter: FilterCreator = () => ({
  onFetch: async (elements: Element[]) => {
    const instances = elements.filter(e => isInstanceElement(e)) as InstanceElement[]
    const instanceIDsByWID: Record<string, ElemID> = Object.fromEntries(
      instances
        .filter(inst => inst.value[WORKDAY_ID_FIELDNAME] !== undefined)
        .map(inst => [inst.value[WORKDAY_ID_FIELDNAME], inst.elemID])
    )
    const referenceExpressionCache: Record<string, ReferenceExpression> = {}
    instances.forEach(e => convertWIDReferences(e, instanceIDsByWID, referenceExpressionCache))
    // TODON has some noise because of self-references
    log.info('Done converting to references - %d distinct instances were referenced', Object.keys(referenceExpressionCache).length)
  },
})

export default filter
