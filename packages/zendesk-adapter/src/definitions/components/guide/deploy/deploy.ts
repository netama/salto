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
import { ActionName, Values } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { serializeTemplates } from '@salto-io/adapter-utils'
import { ARTICLES_FIELD, BRAND_FIELD, DEFAULT_LOCALE, PARENT_SECTION_ID_FIELD, SECTIONS_FIELD, TRANSLATIONS_FIELD } from '../../../../constants'
import { prepRef as articleBodyPrepRef } from '../../../../filters/article/article_body'
import { ClientOptions } from '../../../requests'
import { createStandardItemDeployConfigs, createStandardTranslationDeployConfigs } from '../../shared/deploy/utils'

// TODON move somewhere shared
const DEFAULT_CONTEXT = {
  id: 'id',
  // TODON make sure doesn't break when no parent exists
  parent_id: '_parent.0.id',
}

// TODON make sure "global" client shares rate limits with the client assigned to the default brand, if one exists!
// TODON - maybe just use one shared client by subdomain? and have the default one also for the "unknown" brand...
// TODON add a "client proxy" that will route to the correct client
// TODON just make sure to make a single request for the others (basically - do not depend on brand, and that's it?)

export const GUIDE_DEPLOY_CONFIG: definitions.deploy.DeployApiDefinitions<ActionName, ClientOptions> = {
  instances: {
    default: {
      requestsByAction: {
        default: {
          // TODON move template and reference resolution here in a generic way? first see cases
          // additionalResolvers: [],
          request: {
            context: DEFAULT_CONTEXT,
          },
        },
      },
    },
    customizations: {
      // global types - using global client
      ...createStandardItemDeployConfigs({
        permission_group: { bulkPath: '/api/v2/guide/permission_groups' },
        user_segment: { bulkPath: '/api/v2/help_center/user_segments' },
      }),

      // replacing filters - WIP (TODON continue, only config for most)
      ...createStandardItemDeployConfigs({
        category: {
          bulkPath: '/api/v2/help_center/categories',
          overrides: { default: { request: { omit: [TRANSLATIONS_FIELD, SECTIONS_FIELD, BRAND_FIELD] } } },
        },
      }),
      section: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'section',
              context: {
                category_id: 'category_id',
              },
              omit: [TRANSLATIONS_FIELD, 'attachments', 'brand'],
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/help_center/categories/{category_id}/sections',
                method: 'post',
                omit: [
                  // TODON parent_section_id is modified after addition, see guide_parent_to_section filter - move here?
                  TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, PARENT_SECTION_ID_FIELD, BRAND_FIELD,
                ],
              },
            },
            modify: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}',
                method: 'put',
                omit: [TRANSLATIONS_FIELD, ARTICLES_FIELD, SECTIONS_FIELD, BRAND_FIELD, BRAND_FIELD],
              },
            },
            remove: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}',
                method: 'delete',
              },
            },
          },
        },
      },
      article: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'article',
              context: {
                section_id: 'section_id',
              },
              omit: ['translations', 'attachments', 'brand'],
            },
          },
          customizations: {
            add: {
              request: {
                path: '/api/v2/help_center/sections/{section_id}/articles',
                method: 'post',
              },
            },
            modify: {
              request: {
                path: '/api/v2/help_center/articles/{id}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/api/v2/help_center/articles/{id}',
                method: 'delete',
              },
            },
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
        requestsByAction: {
          customizations: {
            remove: {
              request: {
                path: '/api/v2/help_center/articles/attachments/{id}',
                method: 'delete',
              },
            },
          },
        },
      },

      guide_language_settings: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'translation',
              context: {
                locale: 'locale',
              },
              omit: ['brand'], // TODON theoretically can omit by default in this client if aggregating (or mark field as local-only...)
            },
          },
          customizations: {
            add: {
              request: {
                path: '/hc/api/internal/help_center_translations',
                method: 'post',
                nestUnderField: 'locales',
              },
            },
            modify: {
              request: {
                path: '/hc/api/internal/help_center_translations/{locale}',
                method: 'put',
              },
            },
            remove: {
              request: {
                path: '/hc/api/internal/help_center_translations/{locale}',
                method: 'delete',
              },
            },
          },
        },
      },
      guide_settings: {
        requestsByAction: {
          default: {
            request: {
              nestUnderField: 'translation',
              context: {
                locale: 'locale',
              },
              omit: [DEFAULT_LOCALE], // TODON not omitting brand, make sure intentional
            },
          },
          customizations: {
            modify: {
              request: {
                path: '/hc/api/internal/general_settings',
                method: 'put',
              },
            },
            // old TODO - check what happens when help center (guide) is created or removed (SALTO-2914)
          },
        },
      },
    },
  },
}
