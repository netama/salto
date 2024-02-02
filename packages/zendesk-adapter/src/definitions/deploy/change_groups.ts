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
// import { ActionName } from '@salto-io/adapter-api'
// import { definitions, deployment as deploymentUtils } from '@salto-io/adapter-components'
// import { ARTICLE_ATTACHMENT_TYPE_NAME, CUSTOM_OBJECT_FIELD_OPTIONS_TYPE_NAME, SECTION_TYPE_NAME,
// TICKET_FIELD_CUSTOM_FIELD_OPTION } from '../../constants'
// import { ClientOptions } from '../requests'
// import { DeployDefWithDefault } from './utils'

// const { groupWithFirstParent, selfGroup, groupByType } = deploymentUtils.grouping


// TODON merged with the rest of the config - should still "extract" the relevant part explicitly?

// just the change group part (TODON enforce no overlaps?)
// TODON use a stricter type, and move to change-groups? or keep here?
// TODON should not be component-specific - and doesn't overlap with anything, so maintain separately?
// export const CHANGE_GROUP_CONFIG: DeployDefWithDefault = {
//   default: {
//     // by default, group changes of the same type together
//     changeGroupId: groupByType,
//   },
//   customizations: {
//     // support (TODON move to another file and merge?)

//     // group options/variants/attachments with their parent
//     [TICKET_FIELD_CUSTOM_FIELD_OPTION]: {
//       changeGroupId: groupWithFirstParent,
//     },
//     user_field__custom_field_options: {
//       changeGroupId: groupWithFirstParent,
//     },
//     dynamic_content_item__variants: {
//       changeGroupId: groupWithFirstParent,
//     },
//     organization_field__custom_field_options: {
//       changeGroupId: groupWithFirstParent,
//     },
//     [CUSTOM_OBJECT_FIELD_OPTIONS_TYPE_NAME]: {
//       changeGroupId: groupWithFirstParent,
//     },
//     macro_attachment: {
//       changeGroupId: groupWithFirstParent,
//     },

//     // guide

//     // sections need to be grouped separately as there are dependencies with 'parent_section_id'
//     [SECTION_TYPE_NAME]: {
//       changeGroupId: selfGroup,
//     },
//     // group options/variants/attachments with their parent
//     [ARTICLE_ATTACHMENT_TYPE_NAME]: {
//       changeGroupId: groupWithFirstParent,
//     },
//   },
// }
