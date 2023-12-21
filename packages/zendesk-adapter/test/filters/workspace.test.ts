/*
*                      Copyright 2023 Salto Labs Ltd.
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
  ObjectType, ElemID, InstanceElement, toChange,
} from '@salto-io/adapter-api'
import { filterUtils } from '@salto-io/adapter-components'
import { ZENDESK } from '../../src/constants'
import filterCreator from '../../src/filters/workspace'
import { createFilterCreatorParams } from '../utils'

const mockDeployChange = jest.fn()
jest.mock('@salto-io/adapter-components', () => {
  const actual = jest.requireActual('@salto-io/adapter-components')
  return {
    ...actual,
    deployment: {
      ...actual.deployment,
      defaultDeployChange: jest.fn((...args) => mockDeployChange(...args)),
    },
  }
})

describe('workspace filter', () => {
  type FilterType = filterUtils.FilterWith<'deploy' | 'preDeploy' | 'onDeploy'>
  let filter: FilterType
  const workspace = new InstanceElement(
    'Test',
    new ObjectType({ elemID: new ElemID(ZENDESK, 'workspace') }),
    {
      title: 'Test',
      activated: true,
      macro_ids: [1],
      position: 1,
      description: 'description test - 2',
      ticket_form_id: 2,
      apps: [{ id: 3, expand: true, position: 1 }],
      conditions: {
        all: [
          {
            field: 'status',
            operator: 'is',
            value: 'open',
          },
          {
            field: 'brand_id',
            operator: 'is',
            value: 3,
          },
        ],
        any: [
          {
            field: 'priority',
            operator: 'is_not',
            value: 'low',
          },
        ],
      },
      selected_macros: [{ id: 1, title: 'macro title', active: true, usage_7d: 0 }],
    }
  )

  beforeEach(async () => {
    jest.clearAllMocks()
    filter = filterCreator(createFilterCreatorParams({})) as FilterType
  })
  describe('preDeploy', () => {
    beforeEach(async () => {
      const change = toChange({ after: workspace })
      await filter?.preDeploy([change])
    })

    it('should add macros', async () => {
      expect(workspace.value.macros).toEqual([1])
    })

    it('should keep selected_macros', async () => {
      expect(workspace.value.selected_macros).toHaveLength(1)
    })
  })

  describe('onDeploy', () => {
    const clonedWorkspace = workspace.clone()
    beforeEach(async () => {
      clonedWorkspace.value.macros = [1]
      const change = toChange({ after: clonedWorkspace })
      await filter?.onDeploy([change])
    })

    it('should remove macros', async () => {
      expect(clonedWorkspace.value.macros).toBeUndefined()
    })

    it('should have selected_macros', async () => {
      expect(clonedWorkspace.value.selected_macros).toBeDefined()
    })
  })
})
