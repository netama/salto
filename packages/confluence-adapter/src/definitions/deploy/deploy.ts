/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import { definitions, deployment } from '@salto-io/adapter-components'
import { isAdditionOrModificationChange } from '@salto-io/adapter-api'
import { AdditionalAction, ClientOptions } from '../types'
import {
  addSpaceKey,
  adjustBlogPostOnModification,
  adjustPageOnModification,
  adjustUserReferencesOnBlogPostReverse,
  adjustUserReferencesOnPageReverse,
  createAdjustUserReferencesReverse,
  homepageAdditionToModification,
  putHomepageIdInAdditionContext,
  shouldDeleteRestrictionOnPageModification,
  shouldNotModifyRestrictionOnPageAddition,
  spaceChangeGroupWithItsHomepage,
} from '../utils'
import {
  BLOG_POST_TYPE_NAME,
  GLOBAL_TEMPLATE_TYPE_NAME,
  GROUP_TYPE_NAME,
  LABEL_TYPE_NAME,
  PAGE_TYPE_NAME,
  PERMISSION_TYPE_NAME,
  SPACE_SETTINGS_TYPE_NAME,
  SPACE_TYPE_NAME,
  TEMPLATE_TYPE_NAME,
} from '../../constants'

type InstanceDeployApiDefinitions = definitions.deploy.InstanceDeployApiDefinitions<AdditionalAction, ClientOptions>

const createCustomizations = (): Record<string, InstanceDeployApiDefinitions> => {
  const standardRequestDefinitions = deployment.helpers.createStandardDeployDefinitions<
    AdditionalAction,
    ClientOptions
  >({
    [BLOG_POST_TYPE_NAME]: { bulkPath: '/wiki/api/v2/blogposts', idField: 'id' },
  })

  const customDefinitions: Record<string, Partial<InstanceDeployApiDefinitions>> = {
    [LABEL_TYPE_NAME]: {
      requestsByAction: {
        customizations: {
          // TODO add change validator to explain labels are not deployed directly SALTO-5816
          add: [
            {
              request: {
                earlySuccess: true,
              },
            },
          ],
          modify: [
            {
              request: {
                earlySuccess: true,
              },
            },
          ],
          remove: [
            {
              request: {
                earlySuccess: true,
              },
            },
          ],
        },
      },
    },
    [PAGE_TYPE_NAME]: {
      toActionNames: homepageAdditionToModification,
      requestsByAction: {
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/api/v2/pages',
                  method: 'post',
                },
                transformation: {
                  omit: ['restriction', 'version'],
                  adjust: adjustUserReferencesOnPageReverse,
                },
              },
            },
            {
              condition: {
                custom: () => shouldNotModifyRestrictionOnPageAddition,
              },
              request: {
                earlySuccess: true,
              },
            },
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/content/{id}/restriction',
                  method: 'put',
                },
                transformation: {
                  pick: ['restriction'],
                  adjust: async ({ value }) => ({ value: { results: _.get(value, 'restriction') } }),
                },
              },
            },
          ],
          modify: [
            {
              condition: {
                transformForCheck: {
                  omit: ['restriction', 'version'],
                },
              },
              request: {
                endpoint: {
                  path: '/wiki/api/v2/pages/{id}',
                  method: 'put',
                },
                transformation: {
                  omit: ['restriction'],
                  adjust: adjustPageOnModification,
                },
                context: {
                  custom: () => putHomepageIdInAdditionContext,
                },
              },
              copyFromResponse: {
                additional: {
                  pick: ['version.number'],
                },
              },
            },
            {
              condition: {
                custom: () => shouldDeleteRestrictionOnPageModification,
              },
              request: {
                endpoint: {
                  path: '/wiki/rest/api/content/{id}/restriction',
                  method: 'delete',
                },
              },
            },
            {
              condition: {
                custom: () => shouldDeleteRestrictionOnPageModification,
              },
              request: {
                // delete page restrictions are setting them to default, so no need to make another request
                earlySuccess: true,
              },
            },
            {
              condition: {
                transformForCheck: {
                  pick: ['restriction'],
                },
              },
              request: {
                endpoint: {
                  path: '/wiki/rest/api/content/{id}/restriction',
                  method: 'put',
                },
                transformation: {
                  pick: ['restriction'],
                  adjust: async ({ value }) => ({ value: { results: _.get(value, 'restriction') } }),
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/api/v2/pages/{id}',
                  method: 'delete',
                },
              },
            },
          ],
        },
      },
    },
    [BLOG_POST_TYPE_NAME]: {
      toActionNames: homepageAdditionToModification,
      requestsByAction: {
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/api/v2/blogposts',
                  method: 'post',
                },
                transformation: {
                  omit: ['version'],
                  adjust: adjustUserReferencesOnBlogPostReverse,
                },
              },
            },
          ],
          modify: [
            {
              condition: {
                transformForCheck: {
                  omit: ['version'],
                },
              },
              request: {
                endpoint: {
                  path: '/wiki/api/v2/blogposts/{id}',
                  method: 'put',
                },
                transformation: {
                  adjust: adjustBlogPostOnModification,
                },
              },
              copyFromResponse: {
                additional: {
                  pick: ['version.number'],
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/api/v2/blogposts/{id}',
                  method: 'delete',
                },
              },
            },
          ],
        },
      },
    },
    [SPACE_TYPE_NAME]: {
      referenceResolution: {
        when: 'early',
      },
      changeGroupId: spaceChangeGroupWithItsHomepage,
      requestsByAction: {
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/space',
                  method: 'post',
                },
                transformation: {
                  omit: ['permissions', 'homepage'],
                  adjust: createAdjustUserReferencesReverse(SPACE_TYPE_NAME),
                },
              },
              copyFromResponse: {
                toSharedContext: {
                  root: 'homepage',
                  pick: ['id'],
                },
              },
            },
          ],
          modify: [
            {
              condition: {
                transformForCheck: {
                  omit: ['permissions'],
                },
              },
              request: {
                endpoint: {
                  path: '/wiki/rest/api/space/{key}',
                  method: 'put',
                },
                transformation: {
                  omit: ['permissions'],
                  adjust: createAdjustUserReferencesReverse(SPACE_TYPE_NAME),
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/space/{key}',
                  method: 'delete',
                },
                transformation: {
                  omit: ['permissions'],
                },
              },
            },
          ],
        },
      },
    },
    [SPACE_SETTINGS_TYPE_NAME]: {
      toActionNames: async ({ change }) => {
        if (isAdditionOrModificationChange(change)) {
          return ['modify']
        }
        return [change.action]
      }, // no addition of space settings, we should modify instead
      requestsByAction: {
        default: {
          request: {
            endpoint: {
              queryArgs: {
                spaceKey: '{spaceKey}',
              },
            },
            context: {
              spaceKey: '{_parent.0.key}',
            },
          },
        },
        customizations: {
          modify: [
            {
              condition: {
                transformForCheck: {
                  pick: ['custom'],
                },
              },
              request: {
                transformation: {
                  pick: ['custom'],
                  adjust: async ({ value }) => ({ value: { ..._.get(value, 'custom') } }),
                },
                endpoint: {
                  path: '/wiki/rest/api/settings/lookandfeel/custom',
                  method: 'post',
                },
              },
            },
          ],
        },
      },
    },
    // If updating the template deploy definitions, check if need to update global template as well
    [TEMPLATE_TYPE_NAME]: {
      requestsByAction: {
        default: {
          request: {
            context: {
              space_key: '{_parent.0.key}',
            },
          },
        },
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template',
                  method: 'post',
                },
                transformation: {
                  adjust: addSpaceKey,
                },
              },
            },
          ],
          modify: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template',
                  method: 'put',
                },
                transformation: {
                  adjust: addSpaceKey,
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template/{templateId}',
                  method: 'delete',
                },
              },
            },
          ],
        },
      },
    },
    // If updating the global template deploy definitions, check if need to update template as well
    // This differs from the template definitions in the context queryArgs (no spaceKey)
    [GLOBAL_TEMPLATE_TYPE_NAME]: {
      requestsByAction: {
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template',
                  method: 'post',
                },
              },
            },
          ],
          modify: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template',
                  method: 'put',
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/template/{templateId}',
                  method: 'delete',
                },
              },
            },
          ],
        },
      },
    },
    // Permission is not a top-level type, we use it to deploy permissions changes on space instances
    [PERMISSION_TYPE_NAME]: {
      requestsByAction: {
        default: {
          request: {
            context: {
              spaceKey: '{_parent.0.value.key}',
            },
          },
        },
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/space/{spaceKey}/permission',
                  method: 'post',
                },
              },
              copyFromResponse: {
                additional: {
                  pick: ['id'],
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/space/{spaceKey}/permission/{id}',
                  method: 'delete',
                },
              },
            },
          ],
        },
      },
    },
    [GROUP_TYPE_NAME]: {
      requestsByAction: {
        customizations: {
          add: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/group',
                  method: 'post',
                },
              },
            },
          ],
          remove: [
            {
              request: {
                endpoint: {
                  path: '/wiki/rest/api/group/by-id',
                  method: 'delete',
                  queryArgs: {
                    id: '{id}',
                  },
                },
              },
            },
          ],
        },
      },
    },
  }
  return _.merge(standardRequestDefinitions, customDefinitions)
}

export const createDeployDefinitions = (): definitions.deploy.DeployApiDefinitions<never, ClientOptions> => ({
  instances: {
    default: {
      requestsByAction: {
        default: {
          request: {
            context: deployment.helpers.DEFAULT_CONTEXT,
          },
        },
        customizations: {},
      },
      changeGroupId: deployment.grouping.selfGroup,
    },
    customizations: createCustomizations(),
  },
  dependencies: [
    {
      first: { type: PAGE_TYPE_NAME },
      second: { type: SPACE_TYPE_NAME, action: 'add' },
    },
  ],
})
