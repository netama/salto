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
import { deployment as deploymentUtils } from '@salto-io/adapter-components'
import { createStandardItemDeployConfigs } from './utils'
import { InstanceDeployApiDefinitions } from '../types'
import { shouldDeployIntervals } from './conditions'

const { groupWithFirstParent } = deploymentUtils.grouping

export const DEPLOY_DEFINITIONS: Record<string, InstanceDeployApiDefinitions> = {
  ..._.merge(
    createStandardItemDeployConfigs({
      group: { bulkPath: '/api/v2/groups' },
      business_hours_schedule: {
        bulkPath: '/api/v2/business_hours/schedules',
        overrides: {
          default: {
            request: {
              transformation: {
                nestUnderField: 'schedule',
                omit: ['holidays'],
              },
            },
          },
        },
        appendRequests: {
          add: [{
            condition: ({ change }) => shouldDeployIntervals(change),
            request: {
              endpoint: {
                path: '/api/v2/business_hours/schedules/{id}/workweek',
                method: 'put',
              },
              transformation: {
                root: 'intervals',
                nestUnderField: 'workweek',
              },
            },
          }],
          modify: [{
            condition: ({ change }) => shouldDeployIntervals(change),
            request: {
              endpoint: {
                path: '/api/v2/business_hours/schedules/{id}/workweek',
                method: 'put',
              },
              transformation: {
                root: 'intervals',
                nestUnderField: 'workweek',
              },
            },
          }],
        },
      },
    }),
    {
      dynamic_content_item__variants: {
        changeGroupId: groupWithFirstParent,
      },
    },
  ),
  // TODON add more examples including transformations, move utility functions to adapter-components
}
