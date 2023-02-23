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
import { config as configUtils, elements } from '@salto-io/adapter-components'
import { Config } from '@salto-io/adapter-creator'

const DEFAULT_ID_FIELDS = ['id']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: 'object', fieldType: 'string' },
  { fieldName: 'created', fieldType: 'number' },
  { fieldName: 'updated', fieldType: 'number' },
]

export const ALL_SUPPORTED_TYPES = {
  country_spec: ['country_specs'],
  coupon: ['coupons'],
  product: ['products'],
  reporting_report_type: ['reporting__report_types'],
  tax_rate: ['tax_rates'],
  webhook_endpoint: ['webhook_endpoints'],
}

const DEFAULT_TYPE_CUSTOMIZATIONS: configUtils.AdapterApiConfig['types'] = {
  coupon: {
    transformation: {
      idFields: ['name', 'duration', 'id'],
    },
  },
  products: {
    request: {
      url: '/v1/products',
      recurseInto: [
        {
          type: 'prices',
          toField: 'product_prices',
          context: [{ name: 'productId', fromField: 'id' }],
        },
      ],
    },
    transformation: {
      dataField: 'data',
    },
  },
  product: {
    transformation: {
      idFields: ['name', 'id'],
      fieldTypeOverrides: [{ fieldName: 'product_prices', fieldType: 'list<price>' }],
    },
  },
  prices: {
    request: {
      url: '/v1/prices?product={productId}',
    },
    transformation: {
      dataField: 'data',
    },
  },
  reporting_report_type: {
    transformation: {
      fieldsToHide: [
        { fieldName: 'data_available_end', fieldType: 'number' },
        { fieldName: 'data_available_start', fieldType: 'number' },
      ],
    },
  },
  tax_rate: {
    transformation: {
      idFields: ['display_name', 'id', 'country', 'percentage'],
    },
  },
}

export const DEFAULT_CONFIG: Config = {
  client: {}, // TODON
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
    hideTypes: true,
  },
  apiComponents: {
    sources: {
      swagger: [
        {
          url: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.yaml',
          typeNameOverrides: [
            { originalName: 'v1__country_specs', newName: 'country_specs' },
            { originalName: 'v1__coupons', newName: 'coupons' },
            { originalName: 'v1__prices', newName: 'prices' },
            { originalName: 'v1__products', newName: 'products' },
            { originalName: 'v1__reporting__report_types', newName: 'reporting__report_types' },
            { originalName: 'v1__tax_rates', newName: 'tax_rates' },
            { originalName: 'v1__webhook_endpoints', newName: 'webhook_endpoints' },
          ],
        },
      ],
    },
    definitions: {
      typeDefaults: {
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
          // TODO: change this to true for SALTO-3885.
          nestStandaloneInstances: false,
        },
      },
      types: DEFAULT_TYPE_CUSTOMIZATIONS,
      supportedTypes: ALL_SUPPORTED_TYPES,
    },
  },
  references: {
    rules: [
      {
        src: { field: 'product', parentTypes: ['plan', 'price'] },
        serializationStrategy: 'id',
        target: { type: 'product' },
      },
    ],
  },
}
