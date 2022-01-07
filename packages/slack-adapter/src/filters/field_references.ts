/*
*                      Copyright 2021 Salto Labs Ltd.
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
import { Element } from '@salto-io/adapter-api'
import { references as referenceUtils } from '@salto-io/adapter-components'
import { FilterCreator } from '../filter'

const fieldNameToTypeMappingDefs: referenceUtils.FieldReferenceDefinition<never>[] = [
  {
    src: { field: 'creator', parentTypes: ['conversations_list__channels', 'conversations_list__channels__topic'] },
    serializationStrategy: 'id',
    target: { type: 'users_list__members' },
  },
  {
    src: { field: 'created_by', parentTypes: ['usergroups_list__usergroups'] },
    serializationStrategy: 'id',
    target: { type: 'users_list__members' },
  },
  {
    src: { field: 'updated_by', parentTypes: ['usergroups_list__usergroups'] },
    serializationStrategy: 'id',
    target: { type: 'users_list__members' },
  },
  {
    src: { field: 'team_id', parentTypes: ['users_list__members'] },
    serializationStrategy: 'id',
    target: { type: 'teams' },
  },
  {
    src: { field: 'team', parentTypes: ['users_list__members__profile'] },
    serializationStrategy: 'id',
    target: { type: 'teams' },
  },
  {
    src: { field: 'shared_team_ids', parentTypes: ['conversations_list__channels'] },
    serializationStrategy: 'id',
    target: { type: 'teams' },
  },
]

/**
 * Convert field values into references, based on predefined rules.
 *
 */
const filter: FilterCreator = () => ({
  onFetch: async (elements: Element[]) => {
    await referenceUtils.addReferences({ elements, defs: fieldNameToTypeMappingDefs })
  },
})

export default filter
