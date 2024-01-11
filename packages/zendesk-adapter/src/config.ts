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
import _ from 'lodash'
import { ElemID, CORE_ANNOTATIONS, BuiltinTypes, ListType } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { client as clientUtils, config as configUtils, elements } from '@salto-io/adapter-components'
import {
  ARTICLE_ATTACHMENT_TYPE_NAME,
  ARTICLE_ORDER_TYPE_NAME,
  CATEGORY_ORDER_TYPE_NAME,
  SECTION_ORDER_TYPE_NAME,
  ZENDESK,
} from './constants'

const { defaultMissingUserFallbackField } = configUtils
const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType,
  createUserDeployConfigType,
  createDucktypeAdapterApiConfigType,
  validateDuckTypeFetchConfig,
} = configUtils

export const PAGE_SIZE = 100
export const DEFAULT_QUERY_PARAMS = {
  'page[size]': String(PAGE_SIZE),
}
export const CURSOR_BASED_PAGINATION_FIELD = 'links.next'

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'
export const DEPLOY_CONFIG = 'deploy'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type IdLocator = {
  fieldRegex: string
  idRegex: string
  type: string[]
}

export type Guide = {
  brands: string[]
}

export type ZendeskClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type ZendeskFetchConfig = configUtils.UserFetchConfig
  & {
  enableMissingReferences?: boolean
  includeAuditDetails?: boolean
  addAlias?: boolean
  handleIdenticalAttachmentConflicts?: boolean
  greedyAppReferences?: boolean
  appReferenceLocators?: IdLocator[]
  guide?: Guide
  resolveOrganizationIDs?: boolean
  resolveUserIDs?: boolean
  extractReferencesFromFreeText?: boolean
  convertJsonIdsToReferences?: boolean
}
export type ZendeskDeployConfig = configUtils.UserDeployConfig & configUtils.DefaultMissingUserFallbackConfig & {
  createMissingOrganizations?: boolean
}

// TODON support omitInactive as a user config!!!
export type ZendeskApiConfig = configUtils.AdapterApiConfig<
  configUtils.DuckTypeTransformationConfig & { omitInactive?: boolean },
  configUtils.TransformationDefaultConfig & { omitInactive?: boolean }
  >

export type ZendeskConfig = {
  [CLIENT_CONFIG]?: ZendeskClientConfig
  [FETCH_CONFIG]: ZendeskFetchConfig
  [DEPLOY_CONFIG]?: ZendeskDeployConfig
  [API_DEFINITIONS_CONFIG]: ZendeskApiConfig
}

// export const SUPPORTED_TYPES = {
//   account_setting: ['account_settings'],
//   app_installation: ['app_installations'],
//   app_owned: ['apps_owned'],
//   automation: ['automations'],
//   brand: ['brands'],
//   business_hours_schedule: ['business_hours_schedules'],
//   custom_role: ['custom_roles'],
//   custom_status: ['custom_statuses'],
//   dynamic_content_item: ['dynamic_content_item'],
//   group: ['groups'],
//   locale: ['locales'],
//   macro_categories: ['macro_categories'],
//   macro: ['macros'],
//   monitored_twitter_handle: ['monitored_twitter_handles'],
//   oauth_client: ['oauth_clients'],
//   oauth_global_client: ['oauth_global_clients'],
//   organization: ['organizations'],
//   organization_field: ['organization_fields'],
//   resource_collection: ['resource_collections'],
//   routing_attribute: ['routing_attributes'],
//   sharing_agreement: ['sharing_agreements'],
//   sla_policy: ['sla_policies'],
//   support_address: ['support_addresses'],
//   target: ['targets'],
//   ticket_field: ['ticket_fields'],
//   ticket_form: ['ticket_forms'],
//   trigger_category: ['trigger_categories'],
//   trigger_definition: ['trigger_definitions'],
//   trigger: ['triggers'],
//   user_field: ['user_fields'],
//   view: ['views'],
//   webhook: ['webhooks'],
//   workspace: ['workspaces'],
//   account_features: ['features'],
//   // tags are included in supportedTypes so that they can be easily omitted, but are fetched separately
//   tag: ['tags'],
//   custom_object: ['custom_objects'],
// }

// Types in Zendesk Guide which relate to a certain brand
// export const GUIDE_BRAND_SPECIFIC_TYPES = {
//   article: ['articles'],
//   section: ['sections'],
//   category: ['categories'],
//   guide_settings: ['guide_settings'],
//   guide_language_settings: ['guide_language_settings'],
// }

// Types in Zendesk Guide that whose instances are shared across all brands
// export const GUIDE_GLOBAL_TYPES = {
//   permission_group: ['permission_groups'],
//   user_segment: ['user_segments'],
// }

// export const GUIDE_SUPPORTED_TYPES = {
//   ...GUIDE_BRAND_SPECIFIC_TYPES,
//   ...GUIDE_GLOBAL_TYPES,
// }

// export const GUIDE_TYPES_TO_HANDLE_BY_BRAND = [
//   ...Object.keys(GUIDE_BRAND_SPECIFIC_TYPES),
//   'article_translation',
//   'category_translation',
//   'section_translation',
//   ARTICLE_ATTACHMENT_TYPE_NAME,
//   CATEGORY_ORDER_TYPE_NAME,
//   SECTION_ORDER_TYPE_NAME,
//   ARTICLE_ORDER_TYPE_NAME,
// ]

export const DEFAULT_CONFIG: ZendeskConfig = {
  [FETCH_CONFIG]: {
    include: [{
      type: elements.query.ALL_TYPES,
    }],
    exclude: [
      { type: 'organization' },
      { type: 'oauth_global_client' },
    ],
    hideTypes: true,
    enableMissingReferences: true,
    resolveOrganizationIDs: false,
    resolveUserIDs: true,
    includeAuditDetails: false,
    addAlias: true,
    handleIdenticalAttachmentConflicts: false,
  },
  [DEPLOY_CONFIG]: {
    createMissingOrganizations: false,
  },
  [API_DEFINITIONS_CONFIG]: { // TODON remove from user-facing config
    typeDefaults: {
      request: {
        paginationField: 'next_page',
      },
      transformation: {
        idFields: DEFAULT_ID_FIELDS,
        fileNameFields: DEFAULT_FILENAME_FIELDS,
        fieldsToOmit: FIELDS_TO_OMIT,
        fieldsToHide: FIELDS_TO_HIDE,
        serviceIdField: DEFAULT_SERVICE_ID_FIELD,
        omitInactive: true,
        // TODO: change this to true for SALTO-3593.
        nestStandaloneInstances: false,
      },
    },
    types: DEFAULT_TYPES,
    supportedTypes: SUPPORTED_TYPES,
  },
}

const IdLocatorType = createMatchingObjectType<IdLocator>({
  elemID: new ElemID(ZENDESK, 'IdLocatorType'),
  fields: {
    fieldRegex: {
      refType: BuiltinTypes.STRING,
      annotations: {
        _required: true,
      },
    },
    idRegex: {
      refType: BuiltinTypes.STRING,
      annotations: {
        _required: true,
      },
    },
    type: {
      refType: new ListType(BuiltinTypes.STRING),
      annotations: {
        _required: true,
      },
    },
  },
  annotations: {
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

const GuideType = createMatchingObjectType<Guide>({
  elemID: new ElemID(ZENDESK, 'GuideType'),
  fields: {
    brands: {
      refType: new ListType(BuiltinTypes.STRING),
      annotations: {
        _required: true,
      },
    },
  },
  annotations: {
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type ChangeValidatorName = (
  | 'deployTypesNotSupported'
  | 'createCheckDeploymentBasedOnConfig'
  | 'accountSettings'
  | 'emptyCustomFieldOptions'
  | 'emptyVariants'
  | 'parentAnnotationToHaveSingleValue'
  | 'missingFromParent'
  | 'childMissingParentAnnotation'
  | 'removedFromParent'
  | 'duplicateCustomFieldOptionValues'
  | 'noDuplicateLocaleIdInDynamicContentItem'
  | 'onlyOneTicketFormDefault'
  | 'customRoleName'
  | 'orderInstanceContainsAllTheInstances'
  | 'triggerOrderInstanceContainsAllTheInstances'
  | 'brandCreation'
  | 'webhookAuthData'
  | 'targetAuthData'
  | 'phoneNumbers'
  | 'automationAllConditions'
  | 'macroActionsTicketFieldDeactivation'
  | 'customStatusesEnabled'
  | 'customStatusUniqueAgentLabel'
  | 'customStatusCategoryChange'
  | 'customStatusCategory'
  | 'customStatusActiveDefault'
  | 'defaultCustomStatuses'
  | 'customRoleRemoval'
  | 'sideConversations'
  | 'users'
  | 'requiredAppOwnedParameters'
  | 'oneTranslationPerLocale'
  | 'articleRemoval'
  | 'articleLabelNamesRemoval'
  | 'articleAttachmentSize'
  | 'everyoneUserSegmentModification'
  | 'brandFieldForBrandBasedElements'
  | 'translationForDefaultLocale'
  | 'helpCenterActivation'
  | 'helpCenterCreationOrRemoval'
  | 'externalSourceWebhook'
  | 'defaultGroupChange'
  | 'organizationExistence'
  | 'badFormatWebhookAction'
  | 'guideDisabled'
  | 'additionOfTicketStatusForTicketForm'
  | 'defaultDynamicContentItemVariant'
  | 'featureActivation'
  | 'standardFields'
  | 'defaultAutomationRemoval'
  | 'deflectionAction'
  | 'uniqueAutomationConditions'
  | 'triggerCategoryRemoval'
  | 'childInOrder'
  | 'childrenReferences'
  | 'orderChildrenParent'
  | 'guideOrderDeletion'
  | 'attachmentWithoutContent'
  | 'duplicateRoutingAttributeValue'
  | 'ticketFieldDeactivation'
  | 'duplicateIdFieldValues'
  | 'notEnabledMissingReferences'
  | 'conditionalTicketFields'
  | 'dynamicContentDeletion'
  )

type ChangeValidatorConfig = Partial<Record<ChangeValidatorName, boolean>>

const changeValidatorConfigType = createMatchingObjectType<ChangeValidatorConfig>({
  elemID: new ElemID(ZENDESK, 'changeValidatorConfig'),
  fields: {
    deployTypesNotSupported: { refType: BuiltinTypes.BOOLEAN },
    createCheckDeploymentBasedOnConfig: { refType: BuiltinTypes.BOOLEAN },
    accountSettings: { refType: BuiltinTypes.BOOLEAN },
    emptyCustomFieldOptions: { refType: BuiltinTypes.BOOLEAN },
    emptyVariants: { refType: BuiltinTypes.BOOLEAN },
    parentAnnotationToHaveSingleValue: { refType: BuiltinTypes.BOOLEAN },
    missingFromParent: { refType: BuiltinTypes.BOOLEAN },
    childMissingParentAnnotation: { refType: BuiltinTypes.BOOLEAN },
    removedFromParent: { refType: BuiltinTypes.BOOLEAN },
    duplicateCustomFieldOptionValues: { refType: BuiltinTypes.BOOLEAN },
    noDuplicateLocaleIdInDynamicContentItem: { refType: BuiltinTypes.BOOLEAN },
    onlyOneTicketFormDefault: { refType: BuiltinTypes.BOOLEAN },
    customRoleName: { refType: BuiltinTypes.BOOLEAN },
    orderInstanceContainsAllTheInstances: { refType: BuiltinTypes.BOOLEAN },
    triggerOrderInstanceContainsAllTheInstances: { refType: BuiltinTypes.BOOLEAN },
    brandCreation: { refType: BuiltinTypes.BOOLEAN },
    webhookAuthData: { refType: BuiltinTypes.BOOLEAN },
    targetAuthData: { refType: BuiltinTypes.BOOLEAN },
    phoneNumbers: { refType: BuiltinTypes.BOOLEAN },
    automationAllConditions: { refType: BuiltinTypes.BOOLEAN },
    macroActionsTicketFieldDeactivation: { refType: BuiltinTypes.BOOLEAN },
    customStatusesEnabled: { refType: BuiltinTypes.BOOLEAN },
    customStatusUniqueAgentLabel: { refType: BuiltinTypes.BOOLEAN },
    customStatusCategoryChange: { refType: BuiltinTypes.BOOLEAN },
    customStatusCategory: { refType: BuiltinTypes.BOOLEAN },
    customStatusActiveDefault: { refType: BuiltinTypes.BOOLEAN },
    defaultCustomStatuses: { refType: BuiltinTypes.BOOLEAN },
    customRoleRemoval: { refType: BuiltinTypes.BOOLEAN },
    sideConversations: { refType: BuiltinTypes.BOOLEAN },
    users: { refType: BuiltinTypes.BOOLEAN },
    requiredAppOwnedParameters: { refType: BuiltinTypes.BOOLEAN },
    oneTranslationPerLocale: { refType: BuiltinTypes.BOOLEAN },
    articleRemoval: { refType: BuiltinTypes.BOOLEAN },
    articleLabelNamesRemoval: { refType: BuiltinTypes.BOOLEAN },
    articleAttachmentSize: { refType: BuiltinTypes.BOOLEAN },
    everyoneUserSegmentModification: { refType: BuiltinTypes.BOOLEAN },
    brandFieldForBrandBasedElements: { refType: BuiltinTypes.BOOLEAN },
    translationForDefaultLocale: { refType: BuiltinTypes.BOOLEAN },
    helpCenterActivation: { refType: BuiltinTypes.BOOLEAN },
    helpCenterCreationOrRemoval: { refType: BuiltinTypes.BOOLEAN },
    externalSourceWebhook: { refType: BuiltinTypes.BOOLEAN },
    defaultGroupChange: { refType: BuiltinTypes.BOOLEAN },
    organizationExistence: { refType: BuiltinTypes.BOOLEAN },
    badFormatWebhookAction: { refType: BuiltinTypes.BOOLEAN },
    guideDisabled: { refType: BuiltinTypes.BOOLEAN },
    additionOfTicketStatusForTicketForm: { refType: BuiltinTypes.BOOLEAN },
    defaultDynamicContentItemVariant: { refType: BuiltinTypes.BOOLEAN },
    featureActivation: { refType: BuiltinTypes.BOOLEAN },
    standardFields: { refType: BuiltinTypes.BOOLEAN },
    defaultAutomationRemoval: { refType: BuiltinTypes.BOOLEAN },
    attachmentWithoutContent: { refType: BuiltinTypes.BOOLEAN },
    deflectionAction: { refType: BuiltinTypes.BOOLEAN },
    uniqueAutomationConditions: { refType: BuiltinTypes.BOOLEAN },
    triggerCategoryRemoval: { refType: BuiltinTypes.BOOLEAN },
    childInOrder: { refType: BuiltinTypes.BOOLEAN },
    childrenReferences: { refType: BuiltinTypes.BOOLEAN },
    orderChildrenParent: { refType: BuiltinTypes.BOOLEAN },
    guideOrderDeletion: { refType: BuiltinTypes.BOOLEAN },
    duplicateRoutingAttributeValue: { refType: BuiltinTypes.BOOLEAN },
    ticketFieldDeactivation: { refType: BuiltinTypes.BOOLEAN },
    duplicateIdFieldValues: { refType: BuiltinTypes.BOOLEAN },
    notEnabledMissingReferences: { refType: BuiltinTypes.BOOLEAN },
    conditionalTicketFields: { refType: BuiltinTypes.BOOLEAN },
    dynamicContentDeletion: { refType: BuiltinTypes.BOOLEAN },
  },
  annotations: {
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export const configType = createMatchingObjectType<Partial<ZendeskConfig>>({
  elemID: new ElemID(ZENDESK),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(ZENDESK),
    },
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(
        ZENDESK,
        {
          enableMissingReferences: { refType: BuiltinTypes.BOOLEAN },
          resolveUserIDs: { refType: BuiltinTypes.BOOLEAN },
          includeAuditDetails: { refType: BuiltinTypes.BOOLEAN },
          addAlias: { refType: BuiltinTypes.BOOLEAN },
          handleIdenticalAttachmentConflicts: { refType: BuiltinTypes.BOOLEAN },
          greedyAppReferences: { refType: BuiltinTypes.BOOLEAN },
          appReferenceLocators: { refType: IdLocatorType },
          guide: { refType: GuideType },
          resolveOrganizationIDs: { refType: BuiltinTypes.BOOLEAN },
          extractReferencesFromFreeText: { refType: BuiltinTypes.BOOLEAN },
          convertJsonIdsToReferences: { refType: BuiltinTypes.BOOLEAN },
        },
      ),
    },
    [DEPLOY_CONFIG]: {
      refType: createUserDeployConfigType(
        ZENDESK,
        changeValidatorConfigType,
        {
          ...defaultMissingUserFallbackField,
          createMissingOrganizations: { refType: BuiltinTypes.BOOLEAN },
        },
      ),
    },
    [API_DEFINITIONS_CONFIG]: {
      refType: createDucktypeAdapterApiConfigType({
        adapter: ZENDESK,
        additionalTransformationFields: { omitInactive: { refType: BuiltinTypes.BOOLEAN } },
      }),
    },
  },
  annotations: {
    [CORE_ANNOTATIONS.DEFAULT]: _.omit(
      DEFAULT_CONFIG,
      API_DEFINITIONS_CONFIG,
      `${FETCH_CONFIG}.hideTypes`,
      `${FETCH_CONFIG}.enableMissingReferences`,
      `${FETCH_CONFIG}.guide`,
      `${FETCH_CONFIG}.resolveOrganizationIDs`,
      `${FETCH_CONFIG}.resolveUserIDs`,
      `${FETCH_CONFIG}.includeAuditDetails`,
      `${FETCH_CONFIG}.addAlias`,
      `${FETCH_CONFIG}.handleIdenticalAttachmentConflicts`,
      `${FETCH_CONFIG}.extractReferencesFromFreeText`,
      `${FETCH_CONFIG}.convertJsonIdsToReferences`,
      DEPLOY_CONFIG,
    ),
    [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: ZendeskFetchConfig
  [DEPLOY_CONFIG]?: ZendeskDeployConfig
  [API_DEFINITIONS_CONFIG]: ZendeskApiConfig
}

export const validateFetchConfig = (
  fetchConfigPath: string,
  userFetchConfig: configUtils.UserFetchConfig,
  adapterApiConfig: configUtils.AdapterApiConfig,
): void => validateDuckTypeFetchConfig(
  fetchConfigPath,
  userFetchConfig,
  _.defaults(
    {},
    adapterApiConfig,
    {
      supportedTypes: {
        tag: ['tags'],
      },
    },
  ),
)

/**
 * Validating each Zendesk Guide type has a dataField property in the configuration
 */
export const validateGuideTypesConfig = (
  adapterApiConfig: configUtils.AdapterApiConfig,
): void => {
  const zendeskGuideTypesWithoutDataField = _.values(GUIDE_SUPPORTED_TYPES).flat()
    .filter(type => adapterApiConfig.types[type].transformation?.dataField === undefined)
  if (zendeskGuideTypesWithoutDataField.length > 0) {
    throw Error(`Invalid Zendesk Guide type(s) ${zendeskGuideTypesWithoutDataField} does not have dataField attribute in the type definition.`)
  }
}

export const isGuideEnabled = (
  fetchConfig: ZendeskFetchConfig
): boolean => (
  fetchConfig.guide?.brands !== undefined
)
