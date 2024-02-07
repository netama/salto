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
import { definitions, references as referenceUtils } from '@salto-io/adapter-components'

// TODON add iteration numbers (running counter)
const FIRST_ITERATION: referenceUtils.FieldReferenceDefinition<never>[] = [
  {
    src: { field: 'brand' },
    serializationStrategy: 'id',
    target: { type: 'brand' },
  },
  {
    src: { field: 'brand_id' },
    serializationStrategy: 'id',
    target: { type: 'brand' },
  },
  {
    src: { field: 'brand_ids' },
    serializationStrategy: 'id',
    target: { type: 'brand' },
  },
  {
    src: { field: 'category_id' },
    serializationStrategy: 'id',
    target: { type: 'trigger_category' },
  },
  {
    src: { field: 'active', parentTypes: ['ticket_form_order'] },
    serializationStrategy: 'id',
    target: { type: 'ticket_form' },
  },
  {
    src: {
      field: 'id',
      parentTypes: ['ticket_form__end_user_conditions__child_fields', 'ticket_form__agent_conditions__child_fields'],
    },
    serializationStrategy: 'id',
    target: { type: 'ticket_field' },
  },
  // {
  //   src: {
  //     field: 'field',
  //     parentTypes: [
  //       'view__conditions__all',
  //       'view__conditions__any',
  //       'macro__actions',
  //       'trigger__conditions__all',
  //       'trigger__conditions__any',
  //       'trigger__actions',
  //       'automation__conditions__all',
  //       'automation__conditions__any',
  //       'automation__actions',
  //       'ticket_field__relationship_filter__all',
  //       'ticket_field__relationship_filter__any',
  //     ],
  //   },
  //   zendeskSerializationStrategy: 'ticketField',
  //   zendeskMissingRefStrategy: 'startsWith',
  //   target: { type: TICKET_FIELD_TYPE_NAME },
  // },
]

// TODON continue - missing references, custom context functions, second iteration

export const REFERENCES: definitions.ApiDefinitions['references'] = {
  rules: FIRST_ITERATION,
}
