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
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { definitions } from '@salto-io/adapter-components'
import { ARTICLE_ATTACHMENT_TYPE_NAME, ARTICLE_ORDER_TYPE_NAME, CATEGORY_ORDER_TYPE_NAME, EVERYONE_USER_TYPE, SECTION_ORDER_TYPE_NAME, CATEGORY_TYPE_NAME, SECTION_TYPE_NAME } from '../../constants'
import { DEFAULT_ID_PARTS, NAME_ID_FIELD } from './shared'
import { ZendeskFetchConfig } from '../../config'
import { InstanceFetchApiDefinitions } from '../types'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge

const BRAND_ID_PART: definitions.fetch.FieldIDPart = { fieldName: 'brand', isReference: true }


const addBrandField: definitions.AdjustFunction = ({ value, context }) => {
  // TODON generalize to shared function if repeats more
  if (!lowerdashValues.isPlainObject(value)) {
    throw new Error() // TODON
  }
  const brandId = _.get(context, 'brand.id')
  if (brandId === undefined) {
    throw new Error() // TODON
  }
  return {
    value: {
      ...value,
      brand: brandId,
    },
  }
}

const addSectionParentFields: definitions.AdjustFunction = ({ value }) => {
  // TODON generalize to shared function if repeats more
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error() // TODON
  }
  // TODON add guard
  // eslint-disable-next-line camelcase
  const { parent_section_id, category_id } = value
  // eslint-disable-next-line camelcase
  if (parent_section_id === undefined || parent_section_id === null) {
    return {
      value: {
        ...value,
        direct_parent_id: category_id,
        direct_parent_type: CATEGORY_TYPE_NAME,
      },
    }
  }
  return {
    value: {
      ...value,
      direct_parent_id: parent_section_id,
      direct_parent_type: SECTION_TYPE_NAME,
    },
  }
}

/**
 * If Guide is enabled, filter and pass as context all brands selected by the user to include Guide.
 */
const getBrandContext = (userConfig: ZendeskFetchConfig): definitions.fetch.ContextCombinationDefinition => ({
  dependsOn: {
    brand: {
      parentTypeName: 'brand',
      transformation: {
        // we need both the id and the subdomain
        pick: ['id', 'subdomain', 'name'],
      },
      // TODON only brands from userConfig.guide?.brands
      // TODON use brand.id and brand.subdomain in client requests + pass back
    },
  },
  conditions: [
    {
      fromField: 'subdomain',
      // TODON based on getBrandsForGuide
      match: userConfig.guide?.brands ?? [],
    },
  ],
})

export const getGuideFetchDef = (
  userConfig: ZendeskFetchConfig,
): Record<string, InstanceFetchApiDefinitions> => ({
  // top-level, independent, global
  permission_group: {
    resource: {
      directFetch: true,
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/guide/permission_groups',
        },
        transformation: {
          root: 'permission_groups',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: DEFAULT_ID_PARTS },
        serviceUrl: {
          path: '/knowledge/permissions/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          hide: true,
          fieldType: 'number',
        },
      },
    },
  },
  user_segment: {
    requests: [
      {
        endpoint: {
          path: '/api/v2/help_center/user_segments',
        },
        transformation: {
          root: 'user_segments',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: { parts: DEFAULT_ID_PARTS },
        serviceUrl: {
          path: '/knowledge/user_segments/edit/{id}',
        },
      },
      fieldCustomizations: {
        id: {
          hide: true,
          fieldType: 'number',
        },
        added_user_ids: {
          fieldType: 'list<unknown>', // TODON confirm works, used to be List<...>
        },
        organization_ids: {
          fieldType: 'list<unknown>', // TODON confirm works, used to be List<...>
        },
        user_type: {
          fieldType: 'string',
          restrictions: { enforce_value: true, values: ['signed_in_users', 'staff', EVERYONE_USER_TYPE] },
        },
      },
    },
  },

  // top-level, independent (except for dependency on brand) - TODON formalize!
  guide_settings: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: '/hc/api/internal/general_settings',
          client: 'by_brand',
        },
        transformation: {
          root: '.',
          adjust: addBrandField,
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [BRAND_ID_PART],
        },
      },
      fieldCustomizations: {
        default_locale: { // TODON won't be needed if setting as part of request?
          fieldType: 'string',
        },
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  guide_language_settings: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: '/hc/api/internal/help_center_translations',
          client: 'by_brand',
        },
        transformation: {
          root: '.',
          adjust: addBrandField,
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            BRAND_ID_PART,
            { fieldName: 'locale' },
          ],
        },
        // serviceUrl is created in help_center_service_url filter - TODON see if can move
      },
    },
  },
  category: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/help_center/categories',
          client: 'by_brand',
        },
        transformation: {
          root: 'categories',
          adjust: addBrandField,
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            NAME_ID_FIELD,
            BRAND_ID_PART,
          ],
        },
        // serviceUrl is created in help_center_service_url filter - TODON see if can move
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            typeName: 'category_translation',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
          // fieldType: 'list<category_translation>', // TODON can conclude? make sure happens
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        position: {
          hide: true,
        },
        sections: {
          fieldType: 'list<section>',
        },
        html_url: {
          omit: true,
        },
      },
    },
  },
  section: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/help_center/sections',
          client: 'by_brand',
        },
        transformation: {
          root: 'sections',
          adjust: args => {
            const { value } = addBrandField(args)
            return addSectionParentFields({ ...args, value })
          },
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            NAME_ID_FIELD,
            { fieldName: 'direct_parent_id', isReference: true },
          ],
        },
        // serviceUrl is created in help_center_service_url filter - TODON see if can move
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            typeName: 'section_translation',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
          // fieldType: 'list<section_translation>', // TODON make sure created
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        parent_section_id: {
          fieldType: 'number',
        },
        position: {
          hide: true,
        },
        sections: {
          fieldType: 'list<section>',
        },
        articles: {
          fieldType: 'list<section>',
        },
        html_url: {
          omit: true,
        },
        // directParent and parentType are created to avoid collisions
        direct_parent_id: {
          hide: true,
        },
        direct_parent_type: {
          hide: true,
        },
      },
    },
  },
  article: {
    resource: {
      directFetch: true,
      context: { // TODON make sure context is aggregated from "parent" endpoint (category)
        dependsOn: {
          category_id: {
            parentTypeName: 'category',
            transformation: {
              root: 'id',
            },
          },
        },
      },
      recurseInto: {
        attachments: {
          typeName: 'article_attachment',
          context: {
            args: {
              article_id: {
                fromField: 'id', // TODON align with transformation config here as well?
              },
            },
          },
        },
      },
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/help_center/categories/{category_id}/articles',
          client: 'by_brand',
        },
        transformation: {
          root: 'articles',
          adjust: addBrandField,
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [
            { fieldName: 'title' },
            { fieldName: 'section_id', isReference: true },
          ],
        },
        // serviceUrl is created in help_center_service_url filter - TODON see if can move
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            typeName: 'category_translation',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
          // fieldType: 'list<category_translation>', // TODON make sure happens
        },
        attachments: {
          standalone: {
            typeName: 'article_attachment',
            addParentAnnotation: true,
            referenceFromParent: true,
            nestPathUnderParent: true,
          },
          // fieldType: 'list<article_attachment>', // TODON not needed if will get automatically from recurseInto?
        },
        id: {
          fieldType: 'number',
          hide: true,
        },
        author_id: {
          fieldType: 'unknown',
        },
        html_url: {
          omit: true,
        },
        vote_sum: {
          omit: true,
        },
        vote_count: {
          omit: true,
        },
        edited_at: {
          omit: true,
        },
        name: {
          omit: true,
        },
      },
    },
  },

  // top-level, dependent

  // TODON currently built in filter (and only added here for the elem-id regenerate?) -
  // decide if should implement here or still in filter - probably here (similar to other order items)?
  category_order: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: 'TODON',
          client: 'by_brand',
        },
        transformation: {
          root: 'TODON',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [],
          extendsParent: true,
        },
      },
    },
  },
  section_order: {
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: 'TODON',
          client: 'by_brand',
        },
        transformation: {
          root: 'TODON',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [],
          extendsParent: true,
        },
      },
    },
  },
  article_order: { // TODON define similarly to support order instances (as a "side-effect" of another request)
    // TODON assuming context not needed since inherited from parent for endpoint? but not implemented yet...
    resource: {
      directFetch: true,
      context: getBrandContext(userConfig),
    },
    requests: [
      {
        endpoint: {
          path: 'TODON',
          client: 'by_brand',
        },
        transformation: {
          root: 'TODON',
        },
      },
    ],
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          parts: [],
          extendsParent: true,
        },
      },
    },
  },

  // the following 3 are almost identical, consolidate
  category_translation: {
    // TODON had dataField: 'translations' but probably not in use anymore?
    element: {
      topLevel: {
        isTopLevel: true, // TODON verify isTopLevel is aligned with standalone! or maybe not needed?
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'locale', isReference: true }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        brand: {
          fieldType: 'number',
        },
        created_by_id: {
          fieldType: 'unknown',
        },
        updated_by_id: {
          fieldType: 'unknown',
        },
        html_url: {
          omit: true,
        },
        source_id: {
          omit: true,
        },
        source_type: {
          omit: true,
        },
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  section_translation: {
    // TODON had { dataField: 'translations' } but probably not in use anymore?
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'locale', isReference: true }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        brand: {
          fieldType: 'number',
        },
        created_by_id: {
          fieldType: 'unknown',
        },
        updated_by_id: {
          fieldType: 'unknown',
        },
        html_url: {
          omit: true,
        },
        source_id: {
          omit: true,
        },
        source_type: {
          omit: true,
        },
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  article_translation: {
    // TODON had { dataField: 'translations' } but probably not in use anymore?
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [{ fieldName: 'locale', isReference: true }],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        brand: {
          fieldType: 'number',
        },
        created_by_id: {
          fieldType: 'unknown',
        },
        updated_by_id: {
          fieldType: 'unknown',
        },
        html_url: {
          omit: true,
        },
        source_id: {
          omit: true,
        },
        source_type: {
          omit: true,
        },
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  // old comment:
  // currently articles do not share attachments, if this changes the attachment code should be reviewed!
  article_attachment: {
    // TODON ensure context is passed from parent
    element: {
      topLevel: {
        isTopLevel: true,
        elemID: {
          extendsParent: true,
          parts: [
            { fieldName: 'file_name' },
            { fieldName: 'inline' },
          ],
        },
      },
      fieldCustomizations: {
        id: {
          fieldType: 'number',
          hide: true,
        },
        content_url: {
          hide: true,
        },
        size: {
          hide: true,
        },
        hash: {
          hide: true,
          fieldType: 'string', // TODON won't need to override if defining during fetch instead of in a filter
        },
        content: {
          fieldType: 'string', // TODON won't need to override if defining during fetch instead of in a filter
        },
        // TODON most fields that are omitted here can instead be omitted in the endpoint!
        // except those needed for elem-id generation / a dependent request or element
        article_id: {
          omit: true,
        },
        display_file_name: {
          omit: true,
        },
        relative_path: {
          omit: true,
        },
        // TODON article_attachments was listed in old config but seems incorrect? confirm
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
    requests: [
      {
        endpoint: {
          path: '/api/v2/help_center/articles/{article_id}/attachments',
        },
        transformation: {
          root: 'article_attachments',
          adjust: addBrandField,
        },
      },
    ],
  },

  // inner types
  guide_settings__help_center: {
    element: {
      fieldCustomizations: {
        feature_restrictions: { // TODON move to omit in endpoint
          omit: true, // omitted as it does not impact deploy? (TODON confirm?)
        },
      },
    },
  },
  guide_settings__help_center__settings: {
    element: {
      fieldCustomizations: {
        id: {
          omit: true,
        },
        account_id: {
          omit: true,
        },
        help_center_id: {
          omit: true,
        },
        created_at: {
          omit: true,
        },
        updated_at: {
          omit: true,
        },
        draft: {
          omit: true,
        },
        kind: {
          omit: true,
        },
      },
    },
  },
  guide_settings__help_center__text_filter: {
    element: {
      fieldCustomizations: {
        id: {
          omit: true,
        },
        account_id: {
          omit: true,
        },
        help_center_id: {
          omit: true,
        },
        created_at: {
          omit: true,
        },
        updated_at: {
          omit: true,
        },
      },
    },
  },
})

// Types in Zendesk Guide which relate to a certain brand
export const GUIDE_BRAND_SPECIFIC_TYPES = ['article', 'section', 'category', 'guide_settings', 'guide_language_settings']

// Types in Zendesk Guide that whose instances are shared across all brands
export const GUIDE_GLOBAL_TYPES = ['permission_group', 'user_segment', 'theme']

export const GUIDE_SUPPORTED_TYPES = [
  ...GUIDE_BRAND_SPECIFIC_TYPES,
  ...GUIDE_GLOBAL_TYPES,
]

export const GUIDE_TYPES_TO_HANDLE_BY_BRAND = [
  GUIDE_BRAND_SPECIFIC_TYPES,
  'article_translation',
  'category_translation',
  'section_translation',
  ARTICLE_ATTACHMENT_TYPE_NAME,
  CATEGORY_ORDER_TYPE_NAME,
  SECTION_ORDER_TYPE_NAME,
  ARTICLE_ORDER_TYPE_NAME,
]
