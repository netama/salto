/*
*                      Copyright 2022 Salto Labs Ltd.
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
import { Element, isInstanceElement, isReferenceExpression, InstanceElement, CORE_ANNOTATIONS, ElemID } from '@salto-io/adapter-api'
import { naclCase, pathNaclCase, setPath, references } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { TransformationConfig, TransformationDefaultConfig, getConfigWithDefault } from '../config'
import { RECORDS_PATH } from '../elements/constants'

const log = logger(module)
const { updateElementReferences, getReferences, getUpdatedReference } = references

const INSTANCE_ELEMID_TYPE = 'instance'
const ID_SEPARATOR = '__'

type InstanceIdFields = {
  instance: InstanceElement
  idFields: string[]
}

const isReferencedIdField = (
  idField: string
): boolean => idField.charAt(0) === '&'

const buildNewFilePath = (
  instance: InstanceElement,
  transformationConfigByType: Record<string, TransformationConfig>,
  transformationDefaultConfig: TransformationDefaultConfig,
  naclName: string,
): string[] => {
  const { typeName } = instance.elemID
  const { fileNameFields } = getConfigWithDefault(
    transformationConfigByType[typeName],
    transformationDefaultConfig,
  )
  const fileNameParts = (fileNameFields !== undefined
    ? fileNameFields.map(field => _.get(instance.value, field))
    : undefined)
  const fileName = ((fileNameParts?.every(p => _.isString(p) || _.isNumber(p))
    ? fileNameParts.join('_')
    : undefined))
  return [
    instance.elemID.adapter,
    RECORDS_PATH,
    pathNaclCase(typeName),
    fileName ? pathNaclCase(naclCase(fileName)) : pathNaclCase(naclName),
  ]
}

const getNeighborsByIdFields = (
  instanceToIdFields: InstanceIdFields,
  allInstancesToIdFields: InstanceIdFields[],
): InstanceIdFields[] => {
  const neighbors: InstanceIdFields[] = []
  instanceToIdFields.idFields.forEach(
    idField => {
      if (isReferencedIdField(idField)) {
        const fieldValue = _.get(instanceToIdFields.instance, idField.substr(1, idField.length))
        if (isReferenceExpression(fieldValue) && isInstanceElement(fieldValue.value)) {
          const neighbor = fieldValue.value
          const neighborIdFields = allInstancesToIdFields
            .find(instanceToIdField => instanceToIdField.instance === neighbor)?.idFields
          if (neighborIdFields !== undefined) {
            neighbors.push({ instance: neighbor, idFields: neighborIdFields })
          }
        }
      }
    }
  )
  return neighbors
}

const dfs = (
  currentInstanceIdFields: InstanceIdFields,
  allInstancesIdFields: InstanceIdFields[],
  sortedInstances: InstanceIdFields[],
  visitedInstances: Set<InstanceIdFields>,
  stack: InstanceIdFields[],
): void => {
  visitedInstances.add(currentInstanceIdFields)
  stack.push(currentInstanceIdFields)
  const neighbors = getNeighborsByIdFields(currentInstanceIdFields, allInstancesIdFields)
  neighbors.forEach(
    neighbor => {
      if (visitedInstances.has(neighbor) && stack.includes(neighbor)) {
        log.warn('A cycle of references was detected in instances idFields')
        throw new Error('Instances names cannot be created when there is a cycle of references in IdFields')
      } else if (!visitedInstances.has(neighbor)) {
        dfs(neighbor, allInstancesIdFields, sortedInstances, visitedInstances, stack)
      }
    }
  )
  stack.pop()
  sortedInstances.push(currentInstanceIdFields)
}

const sortInstancesByReference = (
  instancesToIdFields: InstanceIdFields[]
): InstanceIdFields[] => {
  const sortedInstances: InstanceIdFields[] = []
  const visitedInstances: Set<InstanceIdFields> = new Set<InstanceIdFields>()
  const stack: InstanceIdFields[] = []
  instancesToIdFields.forEach(
    refInstanceToIdFields => {
      if (!visitedInstances.has(refInstanceToIdFields)) {
        dfs(refInstanceToIdFields, instancesToIdFields, sortedInstances, visitedInstances, stack)
      }
    }
  )
  return sortedInstances
}

/*
 * Change instance name for referenced instances names
 */
export const addReferencesToInstanceNames = async (
  elements: Element[],
  transformationConfigByType: Record<string, TransformationConfig>,
  transformationDefaultConfig: TransformationDefaultConfig,
): Promise<Element[]> => {
  const hasReferencedIdFields = (
    idFields: string[],
  ): boolean => idFields.some(field => isReferencedIdField(field))

  const instances = elements.filter(isInstanceElement)
  const instancesToIdFields: InstanceIdFields[] = instances.map(instance => ({
    instance,
    idFields: getConfigWithDefault(
      transformationConfigByType[instance.elemID.typeName],
      transformationDefaultConfig
    ).idFields,
  }))
  const referencedIdFields = instancesToIdFields
    .filter(instanceToIdFields => hasReferencedIdFields(instanceToIdFields.idFields))
  // all instnce elements that need to be renamed in the correct order
  const orderedInstances = sortInstancesByReference(referencedIdFields)

  orderedInstances.forEach(
    async instanceIdFields => {
      const { instance, idFields } = instanceIdFields
      if (idFields !== undefined && hasReferencedIdFields(idFields)) {
        const originalName = instance.elemID.name
        const newNameParts = idFields.map(
          field => {
            if (isReferencedIdField(field)) {
              const fieldValue = _.get(instance.value, field.substr(1, field.length))
              if (isReferenceExpression(fieldValue) && isInstanceElement(fieldValue.value)) {
                return fieldValue.value.elemID.name // TODO: not necessarily the correct name part
              }
              log.warn(`could not find reference for referenced idField: ${field}`)
              return fieldValue // TODO: not necessarily the correct name part as well
            }
            return _.get(instance.value, field)
          }
        )
        const newName = newNameParts.every(part => part !== undefined && part !== '') ? newNameParts.map(String).join('_') : originalName
        const parent = instance.annotations[CORE_ANNOTATIONS.PARENT]
        const newNaclName = naclCase(
          parent ? `${parent.elemID.name}${ID_SEPARATOR}${newName}` : String(newName)
        )

        const { typeName, adapter } = instance.elemID
        const filePath = transformationConfigByType[typeName].isSingleton
          ? instance.path
          : buildNewFilePath(
            instance,
            transformationConfigByType,
            transformationDefaultConfig,
            newNaclName,
          )

        const newElemId = new ElemID(adapter, typeName, INSTANCE_ELEMID_TYPE, newName)
        const updatedInstance = await updateElementReferences(
          instance,
          instance.elemID,
          newElemId,
        )

        const newInstance = new InstanceElement(
          newElemId.name,
          updatedInstance.refType,
          updatedInstance.value,
          filePath,
          updatedInstance.annotations,
        )

        const referencesToInstance = elements
        // filtering the renamed element - its references are taken care in getRenameElementChanges
          .filter(element => !(instance.elemID).isEqual(element.elemID))
          .flatMap(element => getReferences(element, instance.elemID))
        referencesToInstance.forEach(reference => {
          const elementObject = elements.find(element => (element.elemID).isEqual(reference.path))
          if (elementObject !== undefined) {
            const updatedReference = getUpdatedReference(reference.value, newElemId)
            setPath(elementObject, reference.path, updatedReference)
          }
        })

        const instanceIdx = elements.findIndex(e => (e.elemID).isEqual(instance.elemID))
        elements.splice(instanceIdx, 1, newInstance)
      }
    }
  )
  return elements
}
