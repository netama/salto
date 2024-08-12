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
import _ from 'lodash'
import { definitions, references as referenceUtils } from '@salto-io/adapter-components'
import { ReferenceContextStrategies, Options, CustomReferenceSerializationStrategyName } from './types'

const REFERENCE_RULES: referenceUtils.FieldReferenceDefinition<
  ReferenceContextStrategies,
  CustomReferenceSerializationStrategyName
>[] = [
  {
    src: { field: 'client_id', parentTypes: ['connection__options__idpinitiated'] },
    serializationStrategy: 'client_id',
    target: { type: 'client' },
  },
  {
    src: { field: 'enabled_clients', parentTypes: ['connection'] },
    serializationStrategy: 'client_id',
    target: { type: 'client' },
  },
]

export const REFERENCES: definitions.ApiDefinitions<Options>['references'] = {
  rules: REFERENCE_RULES,
  // TODO remove if not needed
  contextStrategyLookup: {
    parentType: ({ instance }) => _.get(instance.value, 'parent_type'),
  },
  serializationStrategyLookup: {
    client_id: {
      serialize: ({ ref }) => ref.value.value.client_id,
      lookup: referenceUtils.basicLookUp,
      lookupIndexName: 'client_id',
    },
  },
  fieldsToGroupBy: ['id', 'name', 'client_id'],
}
