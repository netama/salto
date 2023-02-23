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
import { Values } from '@salto-io/adapter-api'
import { deployment as deploymentUtils } from '@salto-io/adapter-components'
import { serializeTemplates } from '@salto-io/adapter-utils'
import { ARTICLES_FIELD, BRAND_FIELD, DEFAULT_LOCALE, PARENT_SECTION_ID_FIELD, SECTIONS_FIELD, TRANSLATIONS_FIELD } from '../../constants'
import { prepRef as articleBodyPrepRef } from '../../filters/article/article_body'
import { createStandardItemDeployConfigs, createStandardTranslationDeployConfigs } from './utils'
import { InstanceDeployApiDefinitions } from '../types'

const { groupWithFirstParent, selfGroup } = deploymentUtils.grouping

// TODON make sure "global" client shares rate limits with the client assigned to the default brand, if one exists!
// TODON - maybe just use one shared client by subdomain? and have the default one also for the "unknown" brand...
// TODON add a "client proxy" that will route to the correct client
// TODON just make sure to make a single request for the others (basically - do not depend on brand, and that's it?)

export const GUIDE_DEPLOY_DEF: Record<string, InstanceDeployApiDefinitions> = {
  // global types
  ...createStandardItemDeployConfigs({
    permission_group: { bulkPath: '/api/v2/guide/permission_groups' },
    user_segment: { bulkPath: '/api/v2/help_center/user_segments' },
  }),

  // brand-specific types

  // replacing filters - WIP (TODON continue, only config for most)
  ...createStandardItemDeployConfigs({
    category: {
      bulkPath: '/api/v2/help_center/categories',
      overrides: {
        default: {
          request: {
            transformValue: {
              omit: [TRANSLATIONS_FIELD, SECTIONS_FIELD, BRAND_FIELD],
            },
          },
        },
      },
    },
  }),
  section: {
    // sections need to be grouped separately as there are dependencies with 'parent_section_id'
    changeGroupId: selfGroup,
    requestsByAction: {
      default: {
        request: {
          context: {
            category_id: 'category_id',
          },
          transformValue: {
            nestUnderField: 'section',
            omit: [TRANSLATIONS_FIELD, 'attachments', 'brand'],
          },
        },
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/help_center/categories/{category_id}/sections',
            method: 'post',
            transformValue: {
              omit: [
                // TODON parent_section_id is modified after addition, see guide_parent_to_section filter - move here?
                TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, PARENT_SECTION_ID_FIELD, BRAND_FIELD,
              ],
            },
          },
        }],
        modify: [{
          request: {
            path: '/api/v2/help_center/sections/{section_id}',
            method: 'put',
            transformValue: {
              omit: [TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, BRAND_FIELD],
            },
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/help_center/sections/{section_id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  article: {
    requestsByAction: {
      default: {
        request: {
          context: {
            section_id: 'section_id',
          },
          transformValue: {
            nestUnderField: 'article',
            omit: ['translations', 'attachments', 'brand'],
          },
        },
      },
      customizations: {
        add: [{
          request: {
            path: '/api/v2/help_center/sections/{section_id}/articles',
            method: 'post',
          },
        }],
        modify: [{
          request: {
            path: '/api/v2/help_center/articles/{id}',
            method: 'put',
          },
        }],
        remove: [{
          request: {
            path: '/api/v2/help_center/articles/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },
  ...createStandardTranslationDeployConfigs({
    category_translation: { parentPlural: 'categories' },
    section_translation: { parentPlural: 'sections' },
    article_translation: {
      parentPlural: 'articles',
      // TODON define here or aggregate from other places?
      // TODON mark replaced filter if not marked
      additionalResolvers: [
        ({ value }: { value: Values }) => serializeTemplates({ value, fieldName: 'body', prepRef: articleBodyPrepRef }),
      ],
    },
  }),
  article_attachment: {
    changeGroupId: groupWithFirstParent,
    requestsByAction: {
      customizations: {
        remove: [{
          request: {
            path: '/api/v2/help_center/articles/attachments/{id}',
            method: 'delete',
          },
        }],
      },
    },
  },

  guide_language_settings: {
    requestsByAction: {
      default: {
        request: {
          context: {
            locale: 'locale',
          },
          transformValue: {
            omit: ['brand'], // TODON theoretically can omit by default in this client if aggregating (or mark field as local-only...)
            nestUnderField: 'translation',
          },
        },
      },
      customizations: {
        add: [{
          request: {
            path: '/hc/api/internal/help_center_translations',
            method: 'post',
            transformValue: {
              nestUnderField: 'locales',
            },
          },
        }],
        modify: [{
          request: {
            path: '/hc/api/internal/help_center_translations/{locale}',
            method: 'put',
          },
        }],
        remove: [{
          request: {
            path: '/hc/api/internal/help_center_translations/{locale}',
            method: 'delete',
          },
        }],
      },
    },
  },
  guide_settings: {
    requestsByAction: {
      default: {
        request: {
          context: {
            locale: 'locale',
          },
          transformValue: {
            nestUnderField: 'translation',
            omit: [DEFAULT_LOCALE], // TODON not omitting brand, make sure intentional
          },
        },
      },
      customizations: {
        modify: [{
          request: {
            path: '/hc/api/internal/general_settings',
            method: 'put',
          },
        }],
        // old TODO - check what happens when help center (guide) is created or removed (SALTO-2914)
      },
    },
  },
}
