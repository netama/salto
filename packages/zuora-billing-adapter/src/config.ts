/*
*                      Copyright 2021 Salto Labs Ltd.
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
import { ElemID, ObjectType, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { ZUORA_BILLING } from './constants'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createSwaggerAdapterApiConfigType } = configUtils

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: 'createdBy', fieldType: 'string' },
  { fieldName: 'createdOn', fieldType: 'string' },
  { fieldName: 'updatedBy', fieldType: 'string' },
  { fieldName: 'updatedOn', fieldType: 'string' },
  { fieldName: 'updatedById', fieldType: 'string' },
  { fieldName: 'CreatedDate', fieldType: 'string' },
  { fieldName: 'UpdatedDate', fieldType: 'string' },
  { fieldName: 'nextPage', fieldType: 'string' },
  { fieldName: 'next', fieldType: 'string' },
  { fieldName: 'pagination' },
]

// TODO add to documentation
export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type ZuoraClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type ZuoraFetchConfig = configUtils.UserFetchConfig
export type ZuoraApiConfig = configUtils.AdapterSwaggerApiConfig

export type ZuoraConfig = {
  [CLIENT_CONFIG]?: ZuoraClientConfig
  [FETCH_CONFIG]: ZuoraFetchConfig
  [API_DEFINITIONS_CONFIG]: ZuoraApiConfig
}

export type ConfigChangeSuggestion = {
  type: keyof ZuoraConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const DEFAULT_TYPE_CUSTOMIZATIONS: ZuoraApiConfig['types'] = {
  WorkflowExport: {
    request: {
      // TODON handle variable names even if they're not the same as the swagger?
      // may need to be more careful if using regexes (or just disallow regexes for this)
      url: '/workflows/{workflow_id}/export',
      dependsOn: [
        { pathParam: 'workflow_id', from: { type: 'Workflows', field: 'id' } },
      ],
    },
    transformation: {
      idFields: ['workflow.name'],
      standaloneFields: [
        { fieldName: 'workflow' },
        { fieldName: 'tasks' },
      ],
    },
  },
  CustomObject: {
    transformation: {
      dataField: 'definitions',
    },
  },
  CustomObjectDefinition: {
    transformation: {
      idFields: ['type'],
    },
  },
  StandardObject: {
    request: {
      url: '/objects/definitions/com_zuora',
    },
    transformation: {
      dataField: 'definitions',
    },
  },
  HostedPages: {
    transformation: {
      dataField: 'hostedpages',
    },
  },
  HostedPage: {
    transformation: {
      idFields: ['pageType', 'pageName'],
      fieldTypeOverrides: [
        { fieldName: 'pageVersion', fieldType: 'number' },
      ],
    },
  },
  ListAllSettings: {
    transformation: {
      dataField: 'settings',
    },
  },
  SettingItemWithOperationsInformation: {
    transformation: {
      idFields: ['key'],
    },
  },
  CatalogProduct: {
    transformation: {
      dataField: 'products',
    },
  },
  AccountingCodeItem: {
    transformation: {
      idFields: ['type', 'name'],
    },
  },
  ProductType: {
    transformation: {
      idFields: ['sku'],
      fileNameFields: ['name'],
      fieldTypeOverrides: [
        { fieldName: 'productRatePlans', fieldType: 'list<GETProductRatePlanType>' },
      ],
    },
  },
  AccountingPeriod: {
    transformation: {
      fieldTypeOverrides: [
        { fieldName: 'fiscalYear', fieldType: 'number' },
      ],
    },
  },
  GETAccountingPeriodType: {
    transformation: {
      fieldTypeOverrides: [
        { fieldName: 'fiscalYear', fieldType: 'number' },
      ],
    },
  },
  GETProductRatePlanChargePricingType: {
    transformation: {
      fieldTypeOverrides: [
        { fieldName: 'price', fieldType: 'number' },
        { fieldName: 'discountPercentage', fieldType: 'number' },
        { fieldName: 'includedUnits', fieldType: 'number' },
        { fieldName: 'overagePrice', fieldType: 'number' },
      ],
    },
  },
  GETProductRatePlanChargePricingTierType: {
    transformation: {
      fieldTypeOverrides: [
        { fieldName: 'price', fieldType: 'number' },
        { fieldName: 'startingUnit', fieldType: 'number' },
        { fieldName: 'endingUnit', fieldType: 'number' },
      ],
    },
  },
  GETProductRatePlanChargeType: {
    transformation: {
      fieldTypeOverrides: [
        { fieldName: 'defaultQuantity', fieldType: 'number' },
      ],
    },
  },
}

const DEFAULT_SWAGGER_CONFIG: ZuoraApiConfig['swagger'] = {
  url: 'https://assets.zuora.com/zuora-documentation/swagger.yaml',
  typeNameOverrides: [
    { originalName: 'notifications__email_templates@uub', newName: 'NotificationEmailTemplates' },
    { originalName: 'notifications__notification_definitions@uub', newName: 'NotificationDefinitions' },
    { originalName: 'workflows___workflow_id___export@uu_00123u_00125uu', newName: 'WorkflowExport' },
    { originalName: 'GETAccountingCodeItemWithoutSuccessType', newName: 'AccountingCodeItem' },
    { originalName: 'GETAccountingCodesType', newName: 'AccountingCodes' },
    { originalName: 'GETAccountingPeriodsType', newName: 'AccountingPeriods' },
    { originalName: 'GETAccountingPeriodWithoutSuccessType', newName: 'AccountingPeriod' },
    { originalName: 'GETAllCustomObjectDefinitionsInNamespaceResponse', newName: 'CustomObject' },
    { originalName: 'GETCatalogType', newName: 'CatalogProduct' },
    { originalName: 'GetHostedPagesType', newName: 'HostedPages' },
    { originalName: 'GetHostedPageType', newName: 'HostedPage' },
    { originalName: 'GETPaymentGatwaysResponse', newName: 'PaymentGateways' },
    { originalName: 'GETPublicEmailTemplateResponse', newName: 'PublicEmailTemplate' },
    { originalName: 'GETPublicNotificationDefinitionResponse', newName: 'PublicNotificationDefinition' },
    { originalName: 'GETSequenceSetResponse', newName: 'SequenceSet' },
    { originalName: 'GETSequenceSetsResponse', newName: 'SequenceSets' },
    { originalName: 'GetWorkflowsResponse', newName: 'Workflows' },
    { originalName: 'ListAllSettingsResponse', newName: 'ListAllSettings' },
    { originalName: 'GETProductType', newName: 'ProductType' },
  ],
  additionalTypes: [
    { typeName: 'StandardObject', cloneFrom: 'CustomObject' },
  ],
}

export const DEFAULT_API_DEFINITIONS: ZuoraApiConfig = {
  swagger: DEFAULT_SWAGGER_CONFIG,
  typeDefaults: {
    transformation: {
      idFields: DEFAULT_ID_FIELDS,
      fieldsToOmit: FIELDS_TO_OMIT,
    },
  },
  types: DEFAULT_TYPE_CUSTOMIZATIONS,
  // TODON apiVersion (also enforce)
}

export const DEFAULT_INCLUDE_ENDPOINTS: string[] = [
  'CatalogProduct',
  'CustomObject',
  'StandardObject',
  'AccountingCodes',
  'AccountingPeriods',
  'HostedPages',
  'NotificationDefinitions',
  'NotificationEmailTemplates',
  'PaymentGateways',
  'SequenceSets',
  'ListAllSettings',
  'WorkflowExport',
]

export const configType = new ObjectType({
  elemID: new ElemID(ZUORA_BILLING),
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(ZUORA_BILLING),
    },
    [FETCH_CONFIG]: {
      type: createUserFetchConfigType(ZUORA_BILLING),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          includeTypes: DEFAULT_INCLUDE_ENDPOINTS,
        },
      },
    },
    [API_DEFINITIONS_CONFIG]: {
      type: createSwaggerAdapterApiConfigType({
        adapter: ZUORA_BILLING,
      }),
      annotations: {
        [CORE_ANNOTATIONS.DEFAULT]: DEFAULT_API_DEFINITIONS,
      },
    },
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: ZuoraFetchConfig
  [API_DEFINITIONS_CONFIG]: ZuoraApiConfig
}
