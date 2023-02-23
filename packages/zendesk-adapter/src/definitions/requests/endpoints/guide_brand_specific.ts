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
import { DEFAULT_QUERY_PARAMS } from '../../../config'
import { PaginationOptions } from '../../types'
import { CATEGORY_TYPE_NAME, SECTION_TYPE_NAME } from '../../../constants'

// const BRAND_CONTEXT: definitions.ContextParams = {
//   brand: '{brand}',
// }

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


// TODON should use brand-specific clients
// TODON add option to restrict "allowed" patterns - in the "base" config?
// TODON add strategy for when an endpoint is not defined ("strict" + some allowed patterns?)
export const GUIDE_BRAND_SPECIFIC_ENDPOINTS: definitions.EndpointByPathAndMethod<PaginationOptions> = {
  default: {
    get: {
      queryArgs: DEFAULT_QUERY_PARAMS,
      pagination: 'cursor',
      // additionalContext: BRAND_CONTEXT, // TODON make sure to expect and pass to the client
      // TODON add option to set default values for response extractors that will be used for everything
      // (except where overwritten)?
    },
    delete: {
      omitBody: true,
      // additionalContext: BRAND_CONTEXT,
    },
    // head: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // options: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // patch: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // post: {
    //   additionalContext: BRAND_CONTEXT,
    // },
    // put: {
    //   additionalContext: BRAND_CONTEXT,
    // },
  },
  customizations: {
    '/hc/api/internal/help_center_translations': {
      get: {
        responseExtractors: [
          {
            transformValue: {
              root: '.',
              adjust: addBrandField,
            },
            toType: 'guide_language_settings',
          },
        ],
      },
    },
    '/hc/api/internal/general_settings': {
      get: {
        responseExtractors: [
          {
            transformValue: {
              root: '.',
              adjust: addBrandField,
            },
            toType: 'guide_settings',
          },
        ],
      },
    },
    '/api/v2/help_center/categories': {
      get: {
        queryArgs: {
          include: 'translations',
        },
        responseExtractors: [
          {
            transformValue: {
              root: 'categories',
              adjust: addBrandField,
            },
            toType: 'category',
          },
        ],
      },
    },
    '/api/v2/help_center/sections': {
      get: {
        queryArgs: {
          include: 'translations',
        },
        responseExtractors: [
          {
            transformValue: {
              root: 'sections',
              adjust: args => {
                const { value } = addBrandField(args)
                return addSectionParentFields({ ...args, value })
              },
            },
            toType: 'section',
          },
        ],
      },
    },
    // we are using this endpoint for better parallelization of requests on large accounts
    // sort_by is added since articles for which the order is alphabetically fail (to avoid future bugs)
    '/api/v2/help_center/categories/{category_id}/articles': {
      get: {
        queryArgs: {
          include: 'translations',
          sort_by: 'updated_at',
        },
        responseExtractors: [
          {
            transformValue: {
              root: 'articles',
              adjust: addBrandField,
            },
            toType: 'article',
          },
        ],
      },
    },
    '/api/v2/help_center/articles/{article_id}/attachments': {
      get: {
        responseExtractors: [
          {
            transformValue: {
              root: 'article_attachments',
              adjust: addBrandField,
            },
            toType: 'article_attachment',
          },
        ],
      },
    },
  },
}

// TODON also look at recent code changes
