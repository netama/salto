/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  ChangeValidator,
  getChangeData,
  isInstanceChange,
  SeverityLevel,
  isRemovalChange,
  isReferenceExpression,
} from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import JiraClient from '../../client/client'
import { OBJECT_TYPE_ATTRIBUTE_TYPE, OBJECT_TYPE_TYPE } from '../../constants'
import { JiraConfig } from '../../config/config'
import { DEFAULT_ATTRIBUTES } from '../../filters/assets/attribute_deploy_filter'

const { awu } = collections.asynciterable

/*
 * This validator prevents the deployment of default attribute unless it being deleted with
 * the object type.
 */
export const defaultAttributeValidator: (config: JiraConfig, client: JiraClient) => ChangeValidator =
  config => async changes => {
    if (!config.fetch.enableJSM || !(config.fetch.enableJsmExperimental || config.fetch.enableJSMPremium)) {
      return []
    }

    const removalObjectTypeNames = await awu(changes)
      .filter(isInstanceChange)
      .filter(isRemovalChange)
      .filter(change => getChangeData(change).elemID.typeName === OBJECT_TYPE_TYPE)
      .map(change => getChangeData(change).value.name)
      .toArray()

    return awu(changes)
      .filter(isInstanceChange)
      .filter(isRemovalChange)
      .filter(change => getChangeData(change).elemID.typeName === OBJECT_TYPE_ATTRIBUTE_TYPE)
      .filter(async change => {
        const instance = getChangeData(change)
        if (!DEFAULT_ATTRIBUTES.includes(instance.value.name)) {
          return false
        }
        if (!isReferenceExpression(instance.value.objectType)) {
          return false
        }
        const objectType = instance.value.objectType?.value.value
        if (objectType === undefined) {
          return false
        }
        return !removalObjectTypeNames.includes(objectType.name)
      })
      .map(async change => ({
        elemID: getChangeData(change).elemID,
        severity: 'Error' as SeverityLevel,
        message: 'Cannot remove a system non removable attribute.',
        detailedMessage: `Cannot deploy this attribute ${getChangeData(change).elemID.name}, as it is a system non removable attribute.`,
      }))
      .toArray()
  }
