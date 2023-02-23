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
import {
  Change, getChangeData, InstanceElement, isAdditionChange, isInstanceChange, isModificationChange, isRemovalChange,
} from '@salto-io/adapter-api'
import { applyInPlaceforInstanceChangesOfType } from '@salto-io/adapter-utils'
import { collections, values } from '@salto-io/lowerdash'
import { FilterCreator } from '../filter'
import { addIdsToChildrenUponAddition, deployChange, deployChanges, deployChangesByGroups } from '../deployment'
import { API_DEFINITIONS_CONFIG } from '../config'
import { DYNAMIC_CONTENT_ITEM_TYPE_NAME } from '../constants'

export const VARIANTS_FIELD_NAME = 'variants'
export const DYNAMIC_CONTENT_ITEM_VARIANT_TYPE_NAME = 'dynamic_content_item__variants'

const { makeArray } = collections.array

const filterCreator: FilterCreator = ({ config, client }) => ({
  name: 'dynamicContentFilter',
  preDeploy: async changes => {
    const localeIdToVariant = Object.fromEntries(changes
      .filter(isInstanceChange)
      .filter(
        change => getChangeData(change).elemID.typeName === DYNAMIC_CONTENT_ITEM_VARIANT_TYPE_NAME
      )
      .map(getChangeData)
      .map(variant => [variant.value.locale_id, variant.value]))
    await applyInPlaceforInstanceChangesOfType({
      changes,
      changeGuard: isAdditionChange,
      typeNames: [DYNAMIC_CONTENT_ITEM_TYPE_NAME],
      func: (instance: InstanceElement) => {
        // TODON another diff logic? with some customizations - ignoring order diffs?
        instance.value[VARIANTS_FIELD_NAME] = makeArray(instance.value[VARIANTS_FIELD_NAME])
          .map(variant => localeIdToVariant[variant])
          .filter(values.isDefined)
      },
    })
  },
  onDeploy: changes => applyInPlaceforInstanceChangesOfType({
    changes,
    changeGuard: isAdditionChange,
    typeNames: [DYNAMIC_CONTENT_ITEM_TYPE_NAME],
    func: (instance: InstanceElement) => { // reverse (up to converting to array? but probably ok)
      instance.value[VARIANTS_FIELD_NAME] = makeArray(instance.value[VARIANTS_FIELD_NAME])
        .map(variant => variant.locale_id)
        .filter(values.isDefined)
    },
  }),
  deploy: async (changes: Change<InstanceElement>[]) => {
    const [relevantChanges, leftoverChanges] = _.partition(
      changes,
      change => [DYNAMIC_CONTENT_ITEM_TYPE_NAME, DYNAMIC_CONTENT_ITEM_VARIANT_TYPE_NAME]
        .includes(getChangeData(change).elemID.typeName),
    )
    const [itemChanges, variantChanges] = _.partition(
      relevantChanges,
      change => getChangeData(change).elemID.typeName === DYNAMIC_CONTENT_ITEM_TYPE_NAME,
    )
    if (itemChanges.length === 0 || itemChanges.every(isModificationChange)) {
      // The service does not allow us to have an item with no variant - therefore, we need to do
      //  the removal changes last // TODON make addition-before-removal a pattern / config choice?
      const [removalChanges, nonRemovalChanges] = _.partition(relevantChanges, isRemovalChange)
      const deployResult = await deployChangesByGroups(
        [nonRemovalChanges, removalChanges] as Change<InstanceElement>[][],
        async change => {
          await deployChange(change, client, config.apiDefinitions)
        }
      )
      return { deployResult, leftoverChanges }
    }
    const deployResult = await deployChanges(
      itemChanges,
      async change => {
        const response = await deployChange(
          change, client, config.apiDefinitions
        )
        return addIdsToChildrenUponAddition({
          response,
          parentChange: change,
          childrenChanges: variantChanges,
          apiDefinitions: config[API_DEFINITIONS_CONFIG],
          childFieldName: VARIANTS_FIELD_NAME,
          childUniqueFieldName: 'locale_id',
        })
      }
    )
    return { deployResult, leftoverChanges }
  },
})

export default filterCreator
