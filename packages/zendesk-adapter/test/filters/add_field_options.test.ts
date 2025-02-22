/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ObjectType, ElemID, InstanceElement, toChange } from '@salto-io/adapter-api'
import { filterUtils } from '@salto-io/adapter-components'
import {
  ZENDESK,
  USER_FIELD_TYPE_NAME,
  ORG_FIELD_TYPE_NAME,
  CUSTOM_FIELD_OPTIONS_FIELD_NAME,
} from '../../src/constants'
import filterCreator from '../../src/filters/add_field_options'
import { createFilterCreatorParams } from '../utils'

describe('add field options filter', () => {
  type FilterType = filterUtils.FilterWith<'preDeploy' | 'onDeploy'>
  let filter: FilterType

  beforeEach(async () => {
    jest.clearAllMocks()
    filter = filterCreator(createFilterCreatorParams({})) as FilterType
  })
  describe('preDeploy', () => {
    it.each([USER_FIELD_TYPE_NAME, ORG_FIELD_TYPE_NAME])(
      'should add null as id for new childs of %s',
      async fieldTypeName => {
        const resolvedParent = new InstanceElement(
          'parent',
          new ObjectType({ elemID: new ElemID(ZENDESK, fieldTypeName) }),
          {
            id: 11,
            name: 'parent',
            [CUSTOM_FIELD_OPTIONS_FIELD_NAME]: [{ id: 22, name: 'child1', value: 'v1' }],
          },
        )
        const clonedResolvedParentBefore = resolvedParent.clone()
        const clonedResolvedParentAfter = resolvedParent.clone()
        clonedResolvedParentAfter.value[CUSTOM_FIELD_OPTIONS_FIELD_NAME] = [
          { id: 22, name: 'child1', value: 'v1' },
          { name: 'child2', value: 'v2' },
        ]
        const change = toChange({
          before: clonedResolvedParentBefore,
          after: clonedResolvedParentAfter,
        })
        await filter?.preDeploy([change])
        expect(clonedResolvedParentAfter.value[CUSTOM_FIELD_OPTIONS_FIELD_NAME]).toEqual([
          { id: 22, name: 'child1', value: 'v1' },
          { id: null, name: 'child2', value: 'v2' },
        ])
      },
    )
  })
  describe('onDeploy', () => {
    it.each([USER_FIELD_TYPE_NAME, ORG_FIELD_TYPE_NAME])(
      'should remove the null from id for new childs of %s',
      async fieldTypeName => {
        const resolvedParent = new InstanceElement(
          'parent',
          new ObjectType({ elemID: new ElemID(ZENDESK, fieldTypeName) }),
          {
            id: 11,
            name: 'parent',
            [CUSTOM_FIELD_OPTIONS_FIELD_NAME]: [{ id: 22, name: 'child1', value: 'v1' }],
          },
        )
        const clonedResolvedParentBefore = resolvedParent.clone()
        const clonedResolvedParentAfter = resolvedParent.clone()
        clonedResolvedParentAfter.value[CUSTOM_FIELD_OPTIONS_FIELD_NAME] = [
          { id: 22, name: 'child1', value: 'v1' },
          { id: null, name: 'child2', value: 'v2' },
        ]
        const change = toChange({
          before: clonedResolvedParentBefore,
          after: clonedResolvedParentAfter,
        })
        await filter?.onDeploy([change])
        expect(clonedResolvedParentAfter.value[CUSTOM_FIELD_OPTIONS_FIELD_NAME]).toEqual([
          { id: 22, name: 'child1', value: 'v1' },
          { name: 'child2', value: 'v2' },
        ])
      },
    )
  })
})
