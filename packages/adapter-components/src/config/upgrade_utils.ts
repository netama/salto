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
// import _ from 'lodash'
// import { collections } from '@salto-io/lowerdash'
// import { DeploymentRequestsByAction } from './request'
// import { InstanceDeployApiDefinitions } from '../definitions/system/deploy'

// this file contains utilities for "upgrading" the old apiDefinitions format to the new definitions

// note: assuming no default was defined for the old deployRequests (since there's no use case in the existing adapters)
// TODON
// export const upgradeDeployTypeDefinitions = <Action extends string, ClientOptions extends string>(
//   oldDef: DeploymentRequestsByAction<Action>,
// ): InstanceDeployApiDefinitions<Action, ClientOptions> =>
//   ({
//     requestsByAction: {
//       customizations: _.mapValues(oldDef, def =>
//         collections.array.makeArray({
//           request: {
//             endpoint: {
//               path: def?.url,
//               method: def?.method,
//               // use default client
//             },
//             transformation: {
//               nestUnderField: def?.deployAsField,
//               omit: def?.fieldsToIgnore,
//             },
//             omitBody: def?.omitRequestBody,
//             context: def?.urlParamsToFields,
//           },
//         }),
//       ),
//     },
//   }) as InstanceDeployApiDefinitions<Action, ClientOptions>
