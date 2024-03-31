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
import { definitions } from '@salto-io/adapter-components'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { UserFetchConfig } from '../../config'
import { Options } from '../types'

// TODO example - adjust and remove:
// * irrelevant definitions and comments
// * unneeded function args

// Note: hiding fields inside arrays is not supported, and can result in a corrupted workspace.
// when in doubt, it's best to hide fields only for relevant types, or to omit them.
const DEFAULT_FIELDS_TO_HIDE: Record<string, definitions.fetch.ElementFieldCustomization> = {}
const DEFAULT_FIELDS_TO_OMIT: Record<string, definitions.fetch.ElementFieldCustomization> = {
  creationTime: {
    omit: true,
  },
  // TODO we dont need those fields for now
  kind: {
    omit: true,
  },
  etag: {
    omit: true,
  },
  etags: {
    omit: true,
  },
}

const NAME_ID_FIELD: definitions.fetch.FieldIDPart = { fieldName: 'name' }
const DEFAULT_ID_PARTS = [NAME_ID_FIELD]

const DEFAULT_FIELD_CUSTOMIZATIONS: Record<string, definitions.fetch.ElementFieldCustomization> = _.merge(
  {},
  DEFAULT_FIELDS_TO_HIDE,
  DEFAULT_FIELDS_TO_OMIT,
)

const createCustomizations = (): Record<string, definitions.fetch.InstanceFetchApiDefinitions<Options>> => ({
  role: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/roles',
        },
        transformation: {
          root: 'items',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['roleId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'roleName' }] },
      },
      fieldCustomizations: {
        roleId: {
          hide: true,
        },
      },
    },
  },
  // TODO need to make sure that the privilege is a closed list
  // If so, we do not need to fetch it
  // privilege: {
  //   requests: [
  //     {
  //       endpoint: {
  //         path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/roles/ALL/privileges',
  //       },
  //       transformation: {
  //         root: 'items',
  //       },
  //     },
  //   ],
  //   resource: {
  //     directFetch: true,
  //     serviceIDFields: ['serviceId'],
  //   },
  //   element: {
  //     topLevel: {
  //       isTopLevel: true,
  //       elemID: { parts: [{ fieldName: 'privilegeName' }] },
  //     },
  //   },
  // },
  domain: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/domains',
        },
        transformation: {
          root: 'domains',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['domainName'],
      recurseInto: {
        groups: {
          typeName: 'group',
          context: {
            args: {
              domain: {
                fromField: 'domainName',
              },
            },
          },
        },
      },
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'domainName' }] },
      },
      fieldCustomizations: {
        groups: {
          standalone: {
            typeName: 'group',
            addParentAnnotation: true,
            referenceFromParent: false,
            nestPathUnderParent: false,
          },
        },
        // domainAliases: {
        //   standalone: {
        //     typeName: 'domain__domainAliases',
        //     addParentAnnotation: false,
        //     referenceFromParent: true,
        //     nestPathUnderParent: true,
        //   },
        // },
      },
    },
  },
  domain__domainAliases: {
    element: {
      fieldCustomizations: {
        parentDomainName: {
          omit: true,
        },
      },
    },
  },
  group: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/groups?domain={domain}',
        },
        transformation: {
          root: 'groups',
        },
      },
    ],
    resource: {
      directFetch: false,
      recurseInto: {
        groupSettings: {
          typeName: 'groupSetting',
          single: true,
          context: {
            args: {
              groupKey: {
                fromField: 'email',
              },
            },
          },
        },
        roleAssignments: {
          typeName: 'roleAssignment',
          context: {
            args: {
              groupId: {
                fromField: 'id',
              },
            },
          },
        },
      },
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
      fieldCustomizations: {
        roleAssignments: {
          standalone: {
            typeName: 'roleAssignment',
            addParentAnnotation: false,
            referenceFromParent: false,
            nestPathUnderParent: false,
          },
        },
        id: {
          hide: true,
        },
        directMembersCount: {
          omit: true,
        },
        adminCreated: {
          omit: true,
        },
        nonEditableAliases: {
          omit: true,
        },
      },
    },
  },
  // RoleAssignment is assigned to a user/group we currently fetch the groups only
  roleAssignment: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/roleassignments?userKey={groupId}',
        },
        transformation: {
          root: 'items',
        },
      },
    ],
    resource: {
      directFetch: false,
      serviceIDFields: ['roleAssignmentId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'roleId', isReference: true },
            { fieldName: 'assignedTo', isReference: true },
          ],
        },
      },
      fieldCustomizations: {
        roleAssignmentId: {
          hide: true,
        },
        assigneeType: {
          omit: true,
        },
      },
    },
  },
  groupSetting: {
    requests: [
      {
        endpoint: {
          path: 'https://www.googleapis.com/groups/v1/groups/{groupKey}?alt=json',
        },
      },
    ],
    resource: {
      directFetch: false,
    },
    element: {
      fieldCustomizations: {
        email: {
          omit: true,
        },
        name: {
          omit: true,
        },
        description: {
          omit: true,
        },
      },
    },
  },
  orgUnit: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/orgunits?type=ALL_INCLUDING_PARENT',
        },
        transformation: {
          root: 'organizationUnits',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['orgUnitId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'parentOrgUnitId', isReference: true }, { fieldName: 'name' }] },
        // path: {
        //   pathParts: [
        //     { parts: [{ fieldName: 'parentOrgUnitId', isReference: true }] },
        //     { parts: [{ fieldName: 'orgUnitPath' }] },
        //   ],
        // },
      },

      fieldCustomizations: {
        orgUnitId: {
          hide: true,
        },
        orgUnitPath: {
          hide: true,
        },
        parentOrgUnitPath: {
          omit: true,
        },
      },
    },
  },
  schema: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/schemas',
        },
        transformation: {
          root: 'schemas',
          adjust: item => {
            const { value } = item
            if (!(lowerdashValues.isPlainRecord(value) && Array.isArray(value.fields))) {
              throw new Error('Expected schema to be an object')
            }
            return {
              value: {
                ...value,
                fields: _.keyBy(value.fields, 'fieldName'),
              },
            }
          },
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['schemaId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'schemaName' }] },
      },
      fieldCustomizations: {
        schemaId: {
          hide: true,
        },
        fields: {
          isMapWithDynamicType: true,
        },
      },
    },
  },
  schema__fields: {
    resource: {
      directFetch: false,
    },
    element: {
      fieldCustomizations: {
        fieldId: {
          hide: true,
        },
      },
    },
  },
  building: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/resources/buildings',
        },
        transformation: {
          root: 'buildings',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['buildingId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'buildingName' }] },
      },
      fieldCustomizations: {
        buildingId: {
          hide: true,
        },
      },
    },
  },
  room: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/resources/calendars',
        },
        transformation: {
          root: 'items',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['resourceId'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: [{ fieldName: 'resourceName' }] },
      },
      fieldCustomizations: {
        resourceId: {
          hide: true,
        },
        generatedResourceName: {
          omit: true,
        },
      },
    },
  },
  feature: {
    requests: [
      {
        endpoint: {
          path: 'https://admin.googleapis.com/admin/directory/v1/customer/my_customer/resources/features',
        },
        transformation: {
          root: 'features',
        },
      },
    ],
    resource: {
      directFetch: true,
      serviceIDFields: ['name'],
    },
    element: {
      topLevel: {
        isTopLevel: true,
      },
    },
  },
})

export const createFetchDefinitions = (
  _fetchConfig: UserFetchConfig,
): definitions.fetch.FetchApiDefinitions<Options> => ({
  instances: {
    default: {
      resource: {
        serviceIDFields: ['id'],
      },
      element: {
        topLevel: {
          elemID: { parts: DEFAULT_ID_PARTS },
        },
        fieldCustomizations: DEFAULT_FIELD_CUSTOMIZATIONS,
      },
    },
    customizations: createCustomizations(),
  },
})
