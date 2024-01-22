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
import { definitions } from '@salto-io/adapter-components'
import { EVERYONE_USER_TYPE } from '../../constants'
import { DEFAULT_ID_PARTS, NAME_ID_FIELD } from './shared'

// TODON before finalizing, do another pass and make sure didn't accidentally leave "in"
// fields as hidden/omitted because of hcange from override to merge

const BRAND_ID_PART: definitions.fetch.FieldIDPart = { fieldName: 'brand', isReference: true }

const BRAND_CONTEXT: definitions.fetch.ContextParamDefinitions = {
  // TODON make sure to get from the same instance...
  brand_id: {
    componentName: 'support',
    typeName: 'brand',
    fieldName: 'id',
  },
  brand_subdomain: {
    componentName: 'support',
    typeName: 'brand',
    fieldName: 'subdomain',
  },
}

export const GUIDE_FETCH_DEF: Record<string, definitions.fetch.InstanceFetchApiDefinitions> = {
  // top-level, independent, global
  permission_group: {
    isTopLevel: true,
    instance: {
      elemID: { parts: DEFAULT_ID_PARTS },
      fieldCustomizations: {
        id: {
          hide: true,
          fieldType: 'number',
        },
      },
      serviceUrl: '/knowledge/permissions/{id}',
    },
  },
  user_segment: {
    isTopLevel: true,
    // requests: {
    //   default: {
    //     client: 'global',
    //   },
    // },
    instance: {
      elemID: { parts: DEFAULT_ID_PARTS },
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
      serviceUrl: '/knowledge/user_segments/edit/{id}',
    },
  },

  // top-level, independent (except for dependency on brand) - TODON formalize!
  guide_settings: {
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [BRAND_ID_PART],
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
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [
          BRAND_ID_PART,
          { fieldName: 'locale' },
        ],
      },
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  category: {
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [
          NAME_ID_FIELD,
          BRAND_ID_PART,
        ],
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
          },
          fieldType: 'list<category_translation>',
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
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  section: {
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [
          NAME_ID_FIELD,
          { fieldName: 'direct_parent_id', isReference: true },
        ],
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
          },
          fieldType: 'list<section_translation>',
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
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },
  article: {
    isTopLevel: true,
    resource: {
      context: { // TODON make sure context is aggregated from "parent" endpoint (category)
        category_id: {
          typeName: 'category',
          fieldName: 'id',
        },
      },
      recurseInto: {
        attachments: {
          type: 'article_attachment',
          context: {
            article_id: 'id',
          },
        },
      },
    },
    instance: {
      elemID: {
        parts: [
          { fieldName: 'title' },
          { fieldName: 'section_id', isReference: true },
        ],
      },
      fieldCustomizations: {
        translations: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
          },
          fieldType: 'list<category_translation>',
        },
        attachments: {
          standalone: {
            addParentAnnotation: true,
            referenceFromParent: true,
          },
          fieldType: 'list<article_attachment>', // TODON not needed if will get automatically from recurseInto?
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
      // serviceUrl is created in help_center_service_url filter - TODON see if can move
    },
  },

  // top-level, dependent

  // TODON currently built in filter (and only added here for the elem-id regenerate?) -
  // decide if should implement here or still in filter - probably here (similar to other order items)?
  category_order: {
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [],
        extendsParent: true,
      },
    },
  },
  section_order: {
    isTopLevel: true,
    resource: {
      context: BRAND_CONTEXT,
    },
    instance: {
      elemID: {
        parts: [],
        extendsParent: true,
      },
    },
  },
  article_order: { // TODON define similarly to support order instances (as a "side-effect" of another request)
    isTopLevel: true,
    // TODON assuming context not needed since inherited from parent for endpoint? but not implemented yet...
    instance: {
      elemID: {
        parts: [],
        extendsParent: true,
      },
    },
  },

  // the following 3 are almost identical, consolidate
  category_translation: {
    // TODON had dataField: 'translations' but probably not in use anymore?
    isTopLevel: true,
    instance: {
      elemID: {
        extendsParent: true,
        parts: [{ fieldName: 'locale', isReference: true }],
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
    isTopLevel: true,
    instance: {
      elemID: {
        extendsParent: true,
        parts: [{ fieldName: 'locale', isReference: true }],
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
    isTopLevel: true,
    instance: {
      elemID: {
        extendsParent: true,
        parts: [{ fieldName: 'locale', isReference: true }],
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
    isTopLevel: true,
    // TODON ensure context is passed from parent
    instance: {
      elemID: {
        extendsParent: true,
        parts: [
          { fieldName: 'file_name' },
          { fieldName: 'inline' },
        ],
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
  },

  // inner types
  guide_settings__help_center: {
    isTopLevel: false,
    instance: {
      fieldCustomizations: {
        feature_restrictions: { // TODON move to omit in endpoint
          omit: true, // omitted as it does not impact deploy? (TODON confirm?)
        },
      },
    },
  },
  guide_settings__help_center__settings: {
    isTopLevel: false,
    instance: {
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
    isTopLevel: false,
    instance: {
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
}
