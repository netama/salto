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
  InstanceElement,
  Change,
  getChangeData,
  createSaltoElementError,
} from '@salto-io/adapter-api'
import { config as configUtils } from '@salto-io/adapter-components'
import { applyFunctionToChangeData, inspectValue } from '@salto-io/adapter-utils'
import { FilterCreator } from '../../filter'
import { deployChange } from '../../deployment'
import ZendeskClient from '../../client/client'

export type DeployFuncType = (
  change: Change<InstanceElement>,
  client: ZendeskClient,
  apiDefinitions: configUtils.AdapterApiConfig
) => Promise<void>

type ReorderFilterCreatorParams = {
  filterName: string
  typeName: string
  orderFieldName: string
  iterateesToSortBy?: Array<_.Many<_.ListIteratee<InstanceElement>>>
  deployFunc?: DeployFuncType
  // Note: if no active field name is provided,
  //  we don't split the instances to active and inactive lists
  activeFieldName?: string
}

export const createOrderTypeName = (typeName: string): string => `${typeName}_order`

export const createReorderFilterCreator = (
  {
    // typeName,
    // orderFieldName,
    // iterateesToSortBy = [instance => instance.value.position],
    // deployFunc = async (change, client, apiDefinitions) => {
    //   await deployChange(change, client, apiDefinitions)
    // },
    // activeFieldName,
    filterName,
  }: ReorderFilterCreatorParams
): FilterCreator => () => ({
  name: filterName,
  // onFetch: async (elements: Element[]): Promise<void> => {
  //   const orderTypeName = createOrderTypeName(typeName)
  //   const objType = elements
  //     .filter(isObjectType)
  //     .find(e => e.elemID.name === typeName)
  //   if (objType === undefined) {
  //     return
  //   }
  //   const instancesReferences = _.sortBy(
  //     elements
  //       .filter(isInstanceElement)
  //       .filter(e => e.elemID.typeName === typeName),
  //     ...iterateesToSortBy,
  //   )
  //     .map(inst => {
  //       delete inst.value.position
  //       return inst
  //     })
  //     .map(refInst => new ReferenceExpression(refInst.elemID, refInst))
  // // TODON can replace by ids and add a "standard" reference instead
  //   const typeNameNaclCase = pathNaclCase(orderTypeName)
  //   const type = new ObjectType({
  //     elemID: new ElemID(ZENDESK, orderTypeName),
  //     fields: {
  //       active: {
  //         refType: new ListType(BuiltinTypes.NUMBER),
  //       },
  //       inactive: {
  //         refType: new ListType(BuiltinTypes.NUMBER),
  //       },
  //     },
  //     isSettings: true,
  //     path: [ZENDESK, TYPES_PATH, SUBTYPES_PATH, typeNameNaclCase],
  //   })
  //   const instance = new InstanceElement(
  //     ElemID.CONFIG_NAME,
  //     type,
  //     activeFieldName
  //       ? {
  //         active: instancesReferences.filter(ref => ref.value.value[activeFieldName]),
  //         inactive: instancesReferences.filter(ref => !ref.value.value[activeFieldName]),
  //       }
  //       : { active: instancesReferences },
  //     [ZENDESK, RECORDS_PATH, SETTINGS_NESTED_PATH, typeNameNaclCase],
  //   )
  //   // Those types already exist since we added the empty version of them
  //   //  via the add remaining types mechanism. So we first need to remove the old versions
  //   _.remove(elements, element => element.elemID.isEqual(type.elemID))
  //   elements.push(type, instance)
  // },
  // preDeploy: changes => applyInPlaceforInstanceChangesOfType({
  //   changes,
  //   // TODON confirm no need to run on removals
  //   typeNames: [createOrderTypeName(typeName)],
  //   func: instance => {
  //     instance.value[orderFieldName] = (instance.value.active ?? [])
  //       .concat(instance.value.inactive ?? [])
  //   },
  // }),
  // onDeploy: changes => applyInPlaceforInstanceChangesOfType({ // TODON reverse
  //   changes,
  //   typeNames: [createOrderTypeName(typeName)],
  //   func: instance => {
  //     delete instance.value[orderFieldName]
  //   },
  // }),
  // deploy: async (changes: Change<InstanceElement>[]) => {
  //   const orderTypeName = createOrderTypeName(typeName)
  //   const [relevantChanges, leftoverChanges] = _.partition(
  //     changes,
  //     change => getChangeData(change).elemID.typeName === orderTypeName,
  //   )
  //   if (relevantChanges.length === 0) {
  //     return {
  //       deployResult: { appliedChanges: [], errors: [] },
  //       leftoverChanges,
  //     }
  //   }
  //   try { // TODON just general safeties that only allow modification? check if can move to "standard" logic
  //     if (relevantChanges.length > 1) {
  //       const saltoError: SaltoError = { // TODON singleton error - reuse / see if handled by core?
  //         message: `${orderTypeName} element is a singleton and should have only on instance.
  // Found multiple: ${relevantChanges.length}`,
  //         severity: 'Error',
  //       }
  //       throw saltoError // in try block
  //     }
  //     const [change] = relevantChanges
  //     if (!isModificationChange(change)) {
  //       throw createSaltoElementError({ // in try block
  //         message: `only modify change is allowed on ${orderTypeName}. Found ${change.action} action`,
  //         severity: 'Error',
  //         elemID: getChangeData(change).elemID,
  //       })
  //     }
  //     await deployFunc(change, client, config[API_DEFINITIONS_CONFIG])
  //   } catch (err) {
  //     if (!isSaltoError(err)) {
  //       throw err
  //     }
  //     return {
  //       deployResult: { appliedChanges: [], errors: [err] },
  //       leftoverChanges,
  //     }
  //   }
  //   return {
  //     deployResult: { appliedChanges: relevantChanges, errors: [] },
  //     leftoverChanges,
  //   }
  // },
})

const idsAreNumbers = (ids: unknown): ids is number[] => (
  _.isArray(ids) && ids.every(Number.isInteger)
)

export const deployFuncCreator = (fieldName: string): DeployFuncType => // custom
  async (change, client, apiDefinitions) => {
    const clonedChange = await applyFunctionToChangeData(change, inst => inst.clone())
    const instance = getChangeData(clonedChange)
    const { ids } = instance.value
    if (!idsAreNumbers(ids)) {
      throw createSaltoElementError({ // caught in try block
        message: `Not all the ids are numbers: ${inspectValue(ids, { maxArrayLength: null })}`,
        severity: 'Error',
        elemID: getChangeData(change).elemID,
      })
    }
    const idsWithPositions = ids.map((id, position) => ({ id, position: position + 1 }))
    instance.value[fieldName] = idsWithPositions
    delete instance.value.ids
    await deployChange(clonedChange, client, apiDefinitions)
  }
