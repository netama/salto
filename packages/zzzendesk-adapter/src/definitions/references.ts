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
import {
  BRAND_TYPE_NAME,
  TICKET_FIELD_TYPE_NAME,
  USER_FIELD_TYPE_NAME,
  ORG_FIELD_TYPE_NAME,
  TICKET_FORM_TYPE_NAME,
  ORGANIZATION_FIELD_ORDER_TYPE_NAME,
  TICKET_FORM_ORDER_TYPE_NAME,
  USER_FIELD_ORDER_TYPE_NAME,
  AUTOMATION_ORDER_TYPE_NAME,
  SLA_POLICY_ORDER_TYPE_NAME,
  VIEW_ORDER_TYPE_NAME,
  WORKSPACE_ORDER_TYPE_NAME,
} from '../constants'

const FIRST_ITERATION: referenceUtils.FieldReferenceDefinition<never>[] = [
  {
    src: { field: 'brand' },
    serializationStrategy: 'id',
    target: { type: BRAND_TYPE_NAME },
  },
  {
    src: { field: 'brand_id' },
    serializationStrategy: 'id',
    target: { type: BRAND_TYPE_NAME },
  },
  {
    src: { field: 'brand_ids' },
    serializationStrategy: 'id',
    target: { type: BRAND_TYPE_NAME },
  },
  {
    src: { field: 'default_brand_id' },
    serializationStrategy: 'id',
    target: { type: BRAND_TYPE_NAME },
  },
  {
    src: { field: 'restricted_brand_ids' },
    serializationStrategy: 'id',
    target: { type: BRAND_TYPE_NAME },
  },
  {
    src: { field: 'category_id' },
    serializationStrategy: 'id',
    target: { type: 'trigger_category' },
  },
  {
    src: { field: 'category_ids' },
    serializationStrategy: 'id',
    target: { type: 'trigger_category' },
  },
  {
    src: { field: 'group_id' },
    serializationStrategy: 'id',
    target: { type: 'group' },
  },
  {
    src: { field: 'locale_ids' },
    serializationStrategy: 'id',
    target: { type: 'locale' },
  },
  {
    src: { field: 'default_locale_id' },
    serializationStrategy: 'id',
    target: { type: 'locale' },
  },
  {
    src: { field: 'variants', parentTypes: ['dynamic_content_item'] },
    target: { type: 'dynamic_content_item__variants' },
  },
  {
    src: { field: 'macro_id' },
    serializationStrategy: 'id',
    target: { type: 'macro' },
  },
  {
    src: { field: 'macro_ids' },
    serializationStrategy: 'id',
    target: { type: 'macro' },
  },
  {
    src: { field: 'active', parentTypes: [TICKET_FORM_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: TICKET_FORM_TYPE_NAME },
  },
  {
    src: { field: 'inactive', parentTypes: [TICKET_FORM_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: TICKET_FORM_TYPE_NAME },
  },
  {
    src: { field: 'active', parentTypes: [ORGANIZATION_FIELD_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: ORG_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'inactive', parentTypes: [ORGANIZATION_FIELD_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: ORG_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'active', parentTypes: [USER_FIELD_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: USER_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'inactive', parentTypes: [USER_FIELD_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: USER_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'active', parentTypes: [WORKSPACE_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'workspace' },
  },
  {
    src: { field: 'inactive', parentTypes: [WORKSPACE_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'workspace' },
  },
  {
    src: { field: 'active', parentTypes: [SLA_POLICY_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'sla_policy' },
  },
  {
    src: { field: 'active', parentTypes: [AUTOMATION_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'automation' },
  },
  {
    src: { field: 'inactive', parentTypes: [AUTOMATION_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'automation' },
  },
  {
    src: { field: 'active', parentTypes: [VIEW_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'view' },
  },
  {
    src: { field: 'inactive', parentTypes: [VIEW_ORDER_TYPE_NAME] },
    serializationStrategy: 'id',
    target: { type: 'view' },
  },
  {
    src: { field: 'active', parentTypes: ['trigger_order_entry'] },
    serializationStrategy: 'id',
    target: { type: 'trigger' },
  },
  {
    src: { field: 'inactive', parentTypes: ['trigger_order_entry'] },
    serializationStrategy: 'id',
    target: { type: 'trigger' },
  },
  {
    src: { field: 'category', parentTypes: ['trigger_order_entry'] },
    serializationStrategy: 'id',
    target: { type: 'trigger_category' },
  },
  {
    src: { field: 'id', parentTypes: ['workspace__selected_macros'] },
    serializationStrategy: 'id',
    target: { type: 'macro' },
  },
  {
    src: { field: 'role_restrictions' },
    serializationStrategy: 'id',
    target: { type: 'custom_role' },
  },
  {
    src: { field: 'ticket_field_id' },
    serializationStrategy: 'id',
    target: { type: TICKET_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'ticket_field_ids' },
    serializationStrategy: 'id',
    target: { type: TICKET_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'parent_field_id' },
    serializationStrategy: 'id',
    target: { type: TICKET_FIELD_TYPE_NAME },
  },
  {
    src: {
      field: 'id',
      parentTypes: [
        'ticket_form__end_user_conditions__child_fields',
        'ticket_form__agent_conditions__child_fields',
      ],
    },
    serializationStrategy: 'id',
    target: { type: TICKET_FIELD_TYPE_NAME },
  },
  {
    src: { field: 'custom_field_options', parentTypes: [TICKET_FIELD_TYPE_NAME] },
    serializationStrategy: 'fullValue',
    target: { type: 'ticket_field__custom_field_options' },
  },
  {
    src: { field: 'default_custom_field_option', parentTypes: [TICKET_FIELD_TYPE_NAME] },
    target: { type: 'ticket_field__custom_field_options' },
  },
  {
    src: { field: 'custom_field_options', parentTypes: [USER_FIELD_TYPE_NAME] },
    serializationStrategy: 'fullValue',
    target: { type: 'user_field__custom_field_options' },
  },
  {
    src: { field: 'default_custom_field_option', parentTypes: [USER_FIELD_TYPE_NAME] },
    target: { type: 'user_field__custom_field_options' },
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

// TODO add other rules
export const REFERENCES: definitions.ApiDefinitions['references'] = {
  rules: FIRST_ITERATION,
}
