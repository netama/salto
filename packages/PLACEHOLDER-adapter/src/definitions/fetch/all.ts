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
import * as transforms from './transforms'
import { InstanceFetchApiDefinitions } from '../types'

// TODO adjust
export const FETCH_DEFINITIONS: Record<string, InstanceFetchApiDefinitions> = {
  // top-level, independent
  group: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/groups',
        },
        transformation: {
          root: 'groups',
        },
      },
    ],
    resource: {
      // this type can be included/excluded based on the user's fetch query
      directFetch: true,
    },
    element: {
      topLevel: {
        // isTopLevel should be set when the workspace can have instances of this type
        isTopLevel: true,
        serviceUrl: {
          path: '/some/path/to/group/with/potential/placeholder/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
      },
    },
  },
  business_hours_schedule: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/business_hours/schedules',
        },
        transformation: {
          root: 'schedules',
        },
      },
    ],
    resource: {
      directFetch: true,
      recurseInto: {
        holidays: {
          typeName: 'business_hours_schedule_holiday',
          context: {
            args: {
              parent_id: {
                fromField: 'id',
              },
            },
          },
        },
      },
      mergeAndTransform: {
        adjust: transforms.transformBusinessHoursSchedule,
      },
    },
    element: {
      topLevel: {
        isTopLevel: true,
        serviceUrl: {
          path: '/admin/objects-rules/rules/schedules',
        },
      },
      fieldCustomizations: {
        holidays: {
          standalone: {
            typeName: 'business_hours_schedule_holiday',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
        },
      },
    },
  },

  // top-level, dependent
  business_hours_schedule_holiday: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/business_hours/schedules/{parent_id}/holidays',
        },
        transformation: {
          root: 'holidays',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { extendsParent: true },
      },
    },
  },

  // inner types
  group__member: {
    element: {
      fieldCustomizations: {
        id: {
          hide: true,
        },
      },
    },
  },
}
