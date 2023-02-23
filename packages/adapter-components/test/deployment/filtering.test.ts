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
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, InstanceElement, ObjectType } from '@salto-io/adapter-api'
import { filterUndeployableValues } from '../../src/deployment/filtering'

describe('filterUndeployableValues', () => {
  let instance: InstanceElement

  beforeEach(() => {
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'test'),
      fields: {
        creatable: {
          refType: BuiltinTypes.STRING,
          annotations: {
            [CORE_ANNOTATIONS.CREATABLE]: true,
            [CORE_ANNOTATIONS.UPDATABLE]: false,
          },
        },

        updatable: {
          refType: BuiltinTypes.STRING,
          annotations: {
            [CORE_ANNOTATIONS.CREATABLE]: false,
            [CORE_ANNOTATIONS.UPDATABLE]: true,
          },
        },
      },
    })


    instance = new InstanceElement(
      'instance',
      type,
      {
        creatable: 'aaa',
        updatable: 'bbb',
        other: 'ccc',
      }
    )
  })

  it('should filter the the unsupported values', async () => {
    const addValues = await filterUndeployableValues(instance, 'add')
    expect(addValues.value).toEqual({
      creatable: 'aaa',
      other: 'ccc',
    })

    const updateValues = await filterUndeployableValues(instance, 'modify')
    expect(updateValues.value).toEqual({
      updatable: 'bbb',
      other: 'ccc',
    })

    const removeValues = await filterUndeployableValues(instance, 'remove')
    expect(removeValues.value).toEqual({
      creatable: 'aaa',
      updatable: 'bbb',
      other: 'ccc',
    })
  })
})
