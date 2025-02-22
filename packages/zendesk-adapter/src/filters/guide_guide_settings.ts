/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { Element, Field, InstanceElement, isInstanceElement, isObjectType, ObjectType } from '@salto-io/adapter-api'
import Joi from 'joi'
import { createSchemeGuardForInstance } from '@salto-io/adapter-utils'
import { FilterCreator } from '../filter'

export const HELP_CENTER_TYPE = 'guide_settings__help_center'
export const GUIDE_SETTINGS_PREFERENCE_TYPE = 'guide_settings__help_center__settings__preferences'
const GUIDE_SETTINGS_TYPE = 'guide_settings'

type GuideSettingsType = InstanceElement & {
  value: {
    help_center: {
      settings: {
        preferences: object
      }
    }
  }
}

const GUIDE_SETTINGS_SCHEMA = Joi.object({
  help_center: Joi.object({
    settings: Joi.object({
      preferences: Joi.object().unknown(true).required(),
    })
      .unknown(true)
      .required(),
  })
    .unknown(true)
    .required(),
})
  .unknown(true)
  .required()

const isGuideSettings = createSchemeGuardForInstance<GuideSettingsType>(
  GUIDE_SETTINGS_SCHEMA,
  'Received an invalid value for guide settings',
)

const addGeneralSettingsAttributesToInstance = (elem: InstanceElement): void => {
  elem.value.help_center.general_settings_attributes = elem.value.help_center.settings.preferences
  delete elem.value.help_center.settings
}

const addGeneralSettingsAttributesToObjectType = (objects: ObjectType[]): void => {
  const helpCenter = objects.find(obj => obj.elemID.typeName === HELP_CENTER_TYPE)
  const preference = objects.find(obj => obj.elemID.typeName === GUIDE_SETTINGS_PREFERENCE_TYPE)
  if (preference === undefined || helpCenter === undefined) {
    return
  }

  helpCenter.fields.general_settings_attributes = new Field(helpCenter, 'general_settings_attributes', preference)
  delete helpCenter.fields.settings
}

/**
 * this filter adds a field of 'general_settings_attributes' to 'help_center' and removes the
 * 'settings' field. This is done as this arrangement of the instance is necessary for deploy.
 */
const filterCreator: FilterCreator = () => ({
  name: 'guideGuideSettings',
  onFetch: async (elements: Element[]): Promise<void> => {
    elements
      .filter(isInstanceElement)
      .filter(obj => GUIDE_SETTINGS_TYPE === obj.elemID.typeName)
      .filter(isGuideSettings)
      .forEach(addGeneralSettingsAttributesToInstance)
    const guideSettingsObjectTypes = elements
      .filter(isObjectType)
      .filter(obj => [HELP_CENTER_TYPE, GUIDE_SETTINGS_PREFERENCE_TYPE].includes(obj.elemID.typeName))
    addGeneralSettingsAttributesToObjectType(guideSettingsObjectTypes)
  },
})
export default filterCreator
