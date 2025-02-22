/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import { filterUtils } from '@salto-io/adapter-components'
import { ElemID, InstanceElement, ObjectType, ReferenceExpression, toChange } from '@salto-io/adapter-api'
import filterCreator from '../../src/filters/guide_section_and_category'

import { GUIDE_LANGUAGE_SETTINGS_TYPE_NAME, ZENDESK } from '../../src/constants'
import { createFilterCreatorParams } from '../utils'
import ZendeskClient from '../../src/client/client'
import { FilterResult } from '../../src/filter'

describe('guid section and category filter', () => {
  type FilterType = filterUtils.FilterWith<'onFetch' | 'preDeploy' | 'deploy' | 'onDeploy', FilterResult>
  let filter: FilterType
  let client: ZendeskClient
  let mockPut: jest.SpyInstance

  const sectionTypeName = 'section'
  const sectionTranslationTypename = 'section_translation'
  const sectionType = new ObjectType({ elemID: new ElemID(ZENDESK, sectionTypeName) })
  const sectionTranslationType = new ObjectType({ elemID: new ElemID(ZENDESK, sectionTranslationTypename) })
  const guideLanguageSettingsType = new ObjectType({
    elemID: new ElemID(ZENDESK, GUIDE_LANGUAGE_SETTINGS_TYPE_NAME),
  })

  const guideLanguageSettingsInstance = new InstanceElement('instance', guideLanguageSettingsType, {
    locale: 'he',
  })

  const sectionTranslationInstance = new InstanceElement('instance', sectionTranslationType, {
    locale: new ReferenceExpression(guideLanguageSettingsInstance.elemID, guideLanguageSettingsInstance),
    title: 'name',
    body: 'description',
  })
  const sectionInstance = new InstanceElement('instance', sectionType, {
    source_locale: 'he',
    translations: [sectionTranslationInstance.value],
  })

  const sectionTranslationStringLocaleInstance = new InstanceElement('instance', sectionTranslationType, {
    locale: 'he',
    title: 'name',
    body: 'description',
  })

  const sectionInstanceStringLocale = new InstanceElement('instance', sectionType, {
    source_locale: 'he',
    translations: [sectionTranslationStringLocaleInstance.value],
  })

  const categoryInstance = new InstanceElement(
    'instance',
    new ObjectType({ elemID: new ElemID(ZENDESK, 'category') }),
    {
      locale: 'he',
      source_locale: 'he',
      id: 1111,
      outdated: false,
    },
  )

  beforeEach(async () => {
    client = new ZendeskClient({
      credentials: { username: 'a', password: 'b', subdomain: 'ignore' },
    })

    filter = filterCreator(createFilterCreatorParams({ client })) as FilterType
  })

  describe('preDeploy', () => {
    it('should add the name and description fields before deploy', async () => {
      const sectionInstanceCopy = sectionInstance.clone()
      await filter.preDeploy([toChange({ after: sectionInstanceCopy })])
      sectionInstance.value.name = sectionTranslationInstance.value.title
      sectionInstance.value.description = sectionTranslationInstance.value.body
      expect(sectionInstanceCopy).toEqual(sectionInstance)
    })
    it('should add the name and description fields before deploy when locale is string', async () => {
      const sectionInstanceCopy = sectionInstanceStringLocale.clone()
      await filter.preDeploy([toChange({ after: sectionInstanceCopy })])
      sectionInstanceStringLocale.value.name = sectionTranslationStringLocaleInstance.value.title
      sectionInstanceStringLocale.value.description = sectionTranslationStringLocaleInstance.value.body
      expect(sectionInstanceCopy).toEqual(sectionInstanceStringLocale)
    })
  })

  describe('deploy', () => {
    beforeEach(() => {
      mockPut = jest.spyOn(client, 'put')
      mockPut.mockImplementation(params => {
        if (['/api/v2/help_center/categories/1111/source_locale'].includes(params.url)) {
          return {
            status: 200,
          }
        }
        throw new Error('Err')
      })
    })
    it('should send a separate request when updating default_locale', async () => {
      const categoryInstanceCopy = categoryInstance.clone()
      categoryInstanceCopy.value.source_locale = 'ar'
      await filter.deploy([{ action: 'modify', data: { before: categoryInstance, after: categoryInstanceCopy } }])
      expect(mockPut).toHaveBeenCalledTimes(2)
    })
  })

  describe('onDeploy', () => {
    it('should omit the name and description fields after deploy', async () => {
      const sectionInstanceCopy = sectionInstance.clone()
      await filter.preDeploy([toChange({ after: sectionInstanceCopy })])
      await filter.onDeploy([toChange({ after: sectionInstanceCopy })])
      expect(sectionInstanceCopy.value).toEqual({
        source_locale: 'he',
        translations: [sectionTranslationInstance.value],
      })
    })
    it('should omit the name and description fields after deploy when locale is string', async () => {
      const sectionInstanceCopy = sectionInstanceStringLocale.clone()
      await filter.preDeploy([toChange({ after: sectionInstanceCopy })])
      await filter.onDeploy([toChange({ after: sectionInstanceCopy })])
      expect(sectionInstanceCopy.value).toEqual({
        source_locale: 'he',
        translations: [sectionTranslationStringLocaleInstance.value],
      })
    })
  })
})
