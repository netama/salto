/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import wu from 'wu'
import { collections, values } from '@salto-io/lowerdash'
import {
  getChangeData,
  isReferenceExpression,
  ChangeDataType,
  Change,
  ChangeEntry,
  DependencyChange,
  addReferenceDependency,
  addParentDependency,
  isDependentAction,
  DependencyChanger,
  isObjectType,
  ElemID,
  isModificationChange,
  isField,
  isEqualValues,
  dependencyChange,
} from '@salto-io/adapter-api'
import { getParents, resolvePath } from '@salto-io/adapter-utils'
import { getAllReferencedIds } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'

const log = logger(module)

const getParentIds = (elem: ChangeDataType): Set<string> =>
  new Set(
    getParents(elem)
      .filter(isReferenceExpression)
      .map(ref => ref.elemID.createBaseID().parent.getFullName()),
  )

const getChangeElemId = (change: Change<ChangeDataType>): string => getChangeData(change).elemID.getFullName()

const isReferenceValueChanged = (change: Change<ChangeDataType>, refElemId: ElemID): boolean => {
  if (!isModificationChange(change) || refElemId.isBaseID()) {
    return false
  }
  const beforeTopLevel = isField(change.data.before) ? change.data.before.parent : change.data.before
  const afterTopLevel = isField(change.data.after) ? change.data.after.parent : change.data.after
  return !isEqualValues(resolvePath(beforeTopLevel, refElemId), resolvePath(afterTopLevel, refElemId), {
    compareByValue: true,
  })
}

export const addReferencesDependency: DependencyChanger = async changes =>
  log.timeDebug(async () => {
    const changesById = collections.iterable.groupBy(changes, ([_id, change]) => getChangeElemId(change))

    const addChangeDependency = async ([id, change]: ChangeEntry): Promise<Iterable<DependencyChange>> => {
      const elem = getChangeData(change)
      const parents = getParentIds(elem)
      const elemId = elem.elemID.getFullName()
      // Because fields are separate nodes in the graph, for object types we should only consider
      // references from the annotations
      const onlyAnnotations = isObjectType(elem)
      // Not using ElementsSource here is legit because it's ran
      // after resolve
      const allReferencedIds = await getAllReferencedIds(elem, onlyAnnotations)
      return wu(allReferencedIds)
        .map(targetRefIdFullName => {
          const targetRefId = ElemID.fromFullName(targetRefIdFullName)
          const targetElemId = targetRefId.createBaseID().parent.getFullName()
          // Ignore self references
          if (targetElemId === elemId) {
            return undefined
          }
          const [targetChangeEntry] = changesById.get(targetElemId) ?? []
          if (targetChangeEntry === undefined) {
            return undefined
          }
          const [targetId, targetChange] = targetChangeEntry
          if (isDependentAction(change.action, targetChange.action)) {
            return parents.has(getChangeElemId(targetChange))
              ? addParentDependency(id, targetId)
              : addReferenceDependency(targetChange.action, id, targetId)
          }
          if (isReferenceValueChanged(targetChange, targetRefId)) {
            return dependencyChange('add', id, targetId)
          }
          return undefined
        })
        .filter(values.isDefined)
    }

    const result = await Promise.all(
      Array.from(changes.entries()).flatMap(async entry => {
        const changeDependency = await addChangeDependency(entry)
        return [...changeDependency]
      }),
    )
    return result.flat()
  }, 'addReferencesDependency')
