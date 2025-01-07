/*
 * Copyright 2024 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  Change,
  DeployResult,
  getChangeData,
  InstanceElement,
  isInstanceChange,
  isModificationChange,
  ModificationChange,
} from '@salto-io/adapter-api'
import _ from 'lodash'
import { applyDetailedChanges, detailedCompare } from '@salto-io/adapter-utils'
import { FilterCreator } from '../filter'
import { deployChange, deployChanges } from '../deployment'

// TODO duplicated from custom_role_deploy - consolidate

const createDiffOnlyInstance = (change: ModificationChange<InstanceElement>): InstanceElement => {
  const relevantChangesInstance = change.data.after.clone()
  relevantChangesInstance.value = {}
  // we need to keep the id for the api call
  relevantChangesInstance.value.id = change.data.after.value.id
  const detailedChanges = detailedCompare(change.data.before, change.data.after)
  applyDetailedChanges(relevantChangesInstance, detailedChanges)
  return relevantChangesInstance
}

const createDiffOnlyChange = (change: ModificationChange<InstanceElement>): ModificationChange<InstanceElement> => ({
  // the changes created here should not be used outside the context of this filter
  // (the before and after cannot be compared)
  ...change,
  data: {
    before: change.data.before,
    after: createDiffOnlyInstance(change),
  },
})

/**
 * This filter makes sure that only the modified fields in security settings modification changes are sent in the request. If
 * other fields are sent it may cause an "Unprocessable Entity" error.
 */
const filterCreator: FilterCreator = ({ client, oldApiDefinitions }) => ({
  name: 'securitySettingsFilter',
  deploy: async (changes: Change<InstanceElement>[]) => {
    const [modificationChanges, leftoverChanges] = _.partition(
      changes,
      change =>
        isModificationChange(change) &&
        isInstanceChange(change) &&
        getChangeData(change).elemID.typeName === 'security_settings',
    )

    // the changes created here should not be used outside the context of this filter
    // (the before and after cannot be compared)
    const editedModificationChanges = modificationChanges.filter(isModificationChange).map(createDiffOnlyChange)

    const tempDeployResult = await deployChanges(editedModificationChanges, async change => {
      await deployChange(change, client, oldApiDefinitions)
    })
    const deployedChangesElemId = new Set(
      tempDeployResult.appliedChanges.map(change => getChangeData(change).elemID.getFullName()),
    )

    const deployResult: DeployResult = {
      appliedChanges: modificationChanges.filter(change =>
        deployedChangesElemId.has(getChangeData(change).elemID.getFullName()),
      ),
      errors: tempDeployResult.errors,
    }
    return { deployResult, leftoverChanges }
  },
})
export default filterCreator
