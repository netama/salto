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
import {
  AdapterOperations, DeployModifiers, DeployOptions, DeployResult, ElemIdGetter, FetchOptions, FetchResult,
  FixElementsFunc, InstanceElement, isInstanceElement,
  ReadOnlyElementsSource, SaltoError,
} from '@salto-io/adapter-api'
import { combineElementFixers, config as configUtils, definitions, elements as elementUtils, fetch as fetchUtils } from '@salto-io/adapter-components'
import {
  getElemIdFuncWrapper, inspectValue, logDuration,
} from '@salto-io/adapter-utils'
import { types } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { createClientDefinitions, createFetchDefinitions, createDeployDefinitions } from './definitions'
import ZendeskClient from './client/client'
import { FilterCreator } from './filter'
import { API_DEFINITIONS_CONFIG, CLIENT_CONFIG, configType, DEPLOY_CONFIG, FETCH_CONFIG, ZendeskConfig } from './config'
import {
  ARTICLE_ATTACHMENT_TYPE_NAME, BRAND_LOGO_TYPE_NAME, CUSTOM_OBJECT_FIELD_OPTIONS_TYPE_NAME, ZENDESK,
  CUSTOM_OBJECT_FIELD_ORDER_TYPE_NAME, DEFAULT_CUSTOM_STATUSES_TYPE_NAME, GUIDE_THEME_TYPE_NAME,
  THEME_SETTINGS_TYPE_NAME,
} from './constants'
import { getBrandsForGuide } from './filters/utils'
import { GUIDE_ORDER_TYPES } from './filters/guide_order/guide_order_utils'
import createChangeValidator from './change_validator'
import fetchCriteria from './fetch_criteria'
import { getChangeGroupIds } from './group_change'
import fieldReferencesFilter from './filters/field_references'
import listValuesMissingReferencesFilter from './filters/references/list_values_missing_references'
import unorderedListsFilter from './filters/unordered_lists'
import omitCollisionFilter from './filters/omit_collision'
import ticketFieldFilter from './filters/custom_field_options/ticket_field'
import userFieldFilter from './filters/custom_field_options/user_field'
import dynamicContentFilter from './filters/dynamic_content'
import dynamicContentReferencesFilter from './filters/dynamic_content_references'
import restrictionFilter from './filters/restriction'
import organizationFieldFilter from './filters/custom_field_options/organization_field'
import removeDefinitionInstancesFilter from './filters/remove_definition_instances'
import hardcodedChannelFilter from './filters/hardcoded_channel'
import usersFilter from './filters/user'
import addFieldOptionsFilter from './filters/add_field_options'
// import appOwnedConvertListToMapFilter from './filters/app_owned_convert_list_to_map'
import appInstallationsFilter from './filters/app_installations'
import serviceUrlFilter from './filters/service_url'
import macroAttachmentsFilter from './filters/macro_attachments'
import tagsFilter from './filters/tag'
import guideLocalesFilter from './filters/guide_locale'
import defaultDeployFilter from './filters/default_deploy'
import commonFilters from './filters/common'
import handleTemplateExpressionFilter from './filters/handle_template_expressions'
import handleAppInstallationsFilter from './filters/handle_app_installations'
import brandLogoFilter from './filters/brand_logo'
import articleFilter from './filters/article/article'
import articleBodyFilter from './filters/article/article_body'
import { dependencyChanger } from './dependency_changers'
import { Credentials } from './auth'
import guideSectionCategoryFilter from './filters/guide_section_and_category'
import guideTranslationFilter from './filters/guide_translation'
import guideThemeFilter from './filters/guide_theme'
import fetchCategorySection from './filters/guide_fetch_article_section_and_category'
import guideParentSection from './filters/guide_parent_to_section'
import guideGuideSettings from './filters/guide_guide_settings'
import categoryOrderFilter from './filters/guide_order/category_order'
import sectionOrderFilter from './filters/guide_order/section_order'
import articleOrderFilter from './filters/guide_order/article_order'
import guideServiceUrl from './filters/guide_service_url'
import everyoneUserSegmentFilter from './filters/everyone_user_segment'
import guideArrangePaths from './filters/guide_arrange_paths'
import guideDefaultLanguage from './filters/guide_default_language_settings'
import guideAddBrandToArticleTranslation from './filters/guide_add_brand_to_translation'
import ticketFormDeploy from './filters/ticket_form'
import supportAddress from './filters/support_address'
import customStatus from './filters/custom_statuses'
import organizationsFilter from './filters/organizations'
import auditTimeFilter from './filters/audit_logs'
import sideConversationsFilter from './filters/side_conversation'
import { isCurrentUserResponse } from './user_utils'
import addAliasFilter from './filters/add_alias'
import customRoleDeployFilter from './filters/custom_role_deploy'
import routingAttributeValueDeployFilter from './filters/routing_attribute_value'
import localeFilter from './filters/locale'
import handleIdenticalAttachmentConflicts from './filters/handle_identical_attachment_conflicts'
import addImportantValuesFilter from './filters/add_important_values'
import customObjectFilter from './filters/custom_objects/custom_object'
import customObjectFieldFilter from './filters/custom_objects/custom_object_fields'
import customObjectFieldsOrderFilter from './filters/custom_objects/custom_object_fields_order'
import customObjectFieldOptionsFilter from './filters/custom_field_options/custom_object_field_options'
import { createFixElementFunctions } from './fix_elements'
import guideThemeSettingFilter from './filters/guide_theme_settings'
import { ClientOptions, PaginationOptions } from './definitions/types'
import { BrandSpecificClientInterface, createBrandSpecificClient } from './client/brand_specific_client'
import { PAGINATION } from './definitions/requests/pagination'

const log = logger(module)
// const { createPaginator } = clientUtils
// const {
//   replaceInstanceTypeForDeploy,
//   restoreInstanceTypeFromDeploy,
// } = elementUtils.ducktype
const { getElements } = fetchUtils
// const { awu } = collections.asynciterable
// const { concatObjects } = objects

export const DEFAULT_FILTERS = [ // TODON un-export
  // ticketStatusCustomStatusDeployFilter, // replaced by config
  ticketFieldFilter, // RUNS ON ticekt_field + options
  userFieldFilter, // RUNS ON user_field + options
  // viewFilter, // RUNS ON view
  // workspaceFilter, // RUNS ON workspace

  // TODON handled deploy (except trigger), still need to handle fetch
  // ticketFormOrderFilter, // RUNS ON ticket_form + order?
  // userFieldOrderFilter, // RUNS ON user_field + order?
  // organizationFieldOrderFilter, // RUNS ON organization + order?
  // workspaceOrderFilter, // RUNS ON workspace + order?
  // slaPolicyOrderFilter, // RUNS ON sla_policy + order?
  // automationOrderFilter, // RUNS ON automation + order?
  // triggerOrderFilter, // RUNS ON trigger + order?
  // viewOrderFilter, // RUNS ON view + order?
  // end of order instances

  // businessHoursScheduleFilter, // RUNS ON business_hours_schedule
  // accountSettingsFilter, // RUNS ON account_settings
  dynamicContentFilter, // RUNS ON dynamic_content_item + variants
  restrictionFilter,
  organizationFieldFilter, // RUNS ON organization_field + options
  hardcodedChannelFilter,
  auditTimeFilter, // needs to be before userFilter as it uses the ids of the users
  // removeDefinitionInstancesFilter should be after hardcodedChannelFilter
  removeDefinitionInstancesFilter,
  usersFilter, // RUNS ON many - and one-way. consolidate these as another "resolve"? but notice fallbacks
  organizationsFilter, // RUNS ON many - and one-way
  tagsFilter, // RUNS ON many - and one-way
  localeFilter,
  // supportAddress should run before referencedIdFieldsFilter
  supportAddress, // RUNS ON support_address
  customStatus, // RUNS ON custom_status, default_custom_statuses
  guideAddBrandToArticleTranslation,
  // macroFilter, // RUNS ON macro
  macroAttachmentsFilter, // RUNS ON macro, macro_attachment
  ticketFormDeploy, // RUNS ON ticket_form
  customRoleDeployFilter, // RUNS ON custom_role
  sideConversationsFilter,
  brandLogoFilter, // RUNS ON brand_logo
  categoryOrderFilter, // RUNS ON category_order
  sectionOrderFilter, // RUNS ON section_order
  articleOrderFilter, // RUNS ON article_order
  // help center filters need to be before fieldReferencesFilter (assume fields are strings)
  // everyoneUserSegmentFilter needs to be before articleFilter
  everyoneUserSegmentFilter,
  articleFilter, // RUNS ON article, article_attachment (maybe also article_translation?)
  guideSectionCategoryFilter, // RUNS ON category, section
  guideTranslationFilter, // RUNS ON article_translation / section_translation / category_translation? (double check)
  guideGuideSettings,
  guideDefaultLanguage, // RUNS ON guide_settings // needs to be after guideGuideSettings
  guideServiceUrl,
  guideLocalesFilter, // Needs to be after guideServiceUrl
  customObjectFilter, // RUNS ON custom_object
  customObjectFieldsOrderFilter, // RUNS ON custom_object_field_order
  customObjectFieldOptionsFilter, // RUNS ON custom_object_field, custom_object_field__options
  // need to be after customObjectFieldOptionsFilter
  customObjectFieldFilter, // RUNS ON trigger, ticket_field, custom_object_field, <something else?>
  // fieldReferencesFilter should be after:
  // usersFilter, macroAttachmentsFilter, tagsFilter, guideLocalesFilter, customObjectFilter, customObjectFieldFilter
  fieldReferencesFilter,
  // listValuesMissingReferencesFilter should be after fieldReferencesFilter
  listValuesMissingReferencesFilter,
  appInstallationsFilter, // RUNS ON app_installation
  // appOwnedConvertListToMapFilter,
  // slaPolicyFilter, // RUNS ON sla_policy
  routingAttributeValueDeployFilter, // RUNS ON routing_attribute_value
  addFieldOptionsFilter, // RUNS ON organization_field, user_field
  // webhookFilter, // RUNS ON webhook
  // unorderedListsFilter should run after fieldReferencesFilter
  unorderedListsFilter,
  dynamicContentReferencesFilter, // RUNS ON everything
  guideParentSection, // RUNS ON section
  serviceUrlFilter, // RUNS ON <everything>
  // referencedIdFieldsFilter and queryFilter should run after element references are resolved
  ...Object.values(commonFilters),
  handleAppInstallationsFilter, // RUNS ON app_installation, TODON check if overlaps with template expression filter
  handleTemplateExpressionFilter, // RUNS ON <everything>
  // needs to be after handleTemplateExpressionFilter
  articleBodyFilter, // RUNS ON article_translation
  // handleIdenticalAttachmentConflicts needs to be before collisionErrorsFilter and after referencedIdFieldsFilter
  // and articleBodyFilter
  handleIdenticalAttachmentConflicts,
  omitCollisionFilter, // needs to be after referencedIdFieldsFilter (which is part of the common filters)
  // deployBrandedGuideTypesFilter,
  guideThemeFilter, // fetches a lot of data, so should be after omitCollisionFilter to remove theme collisions
  guideThemeSettingFilter, // needs to be after guideThemeFilter as it depends on successful theme fetches
  addAliasFilter, // should run after fieldReferencesFilter and guideThemeSettingFilter
  guideArrangePaths,
  // hideAccountFeatures,
  fetchCategorySection, // need to be after arrange paths as it uses the 'name'/'title' field
  addImportantValuesFilter,
  // defaultDeployFilter should be last!
  defaultDeployFilter,
]

export const SKIP_RESOLVE_TYPE_NAMES = [ // TODON un-export
  'organization_field__custom_field_options',
  CUSTOM_OBJECT_FIELD_OPTIONS_TYPE_NAME,
  'macro',
  'macro_attachment',
  'brand_logo',
  ...GUIDE_ORDER_TYPES,
]

// const getBrandsFromElementsSourceNoCache = async (
//   elementsSource: ReadOnlyElementsSource
// ): Promise<InstanceElement[]> => (
//   awu(await elementsSource.list())
//     .filter(id => id.typeName === BRAND_TYPE_NAME && id.idType === 'instance')
//     .map(id => elementsSource.get(id))
//     .filter(isInstanceElement)
//     .toArray()
// )

export interface ZendeskAdapterParams {
  filterCreators?: FilterCreator[]
  // client: ZendeskClient // TODON remove
  credentials: Credentials
  config: ZendeskConfig
  elementsSource: ReadOnlyElementsSource
  // callback function to get an existing elemId or create a new one by the ServiceIds values
  getElemIdFunc?: ElemIdGetter
  configInstance?: InstanceElement
}

export default class ZendeskAdapter implements AdapterOperations {
  private client: ZendeskClient
  private brandSpecificClient: BrandSpecificClientInterface
  // private paginator: clientUtils.Paginator
  private userConfig: ZendeskConfig
  private getElemIdFunc?: ElemIdGetter
  private configInstance?: InstanceElement
  // private elementsSource: ReadOnlyElementsSource
  private fetchQuery: elementUtils.query.ElementQuery
  private definitions: types.PickyRequired<definitions.ApiDefinitions<ClientOptions, PaginationOptions>, 'clients' | 'pagination' | 'fetch'>
  private logIdsFunc?: () => void
  private fixElementsFunc: FixElementsFunc
  // private createClientBySubdomain: (subdomain: string, deployRateLimit?: boolean) => ZendeskClient
  // private getClientBySubdomain: (subdomain: string, deployRateLimit?: boolean) => ZendeskClient
  // private brandsList: Promise<InstanceElement[]> | undefined
  // private createFiltersRunner: ({
  //   filterRunnerClient,
  //   paginator,
  // } : {
  //   filterRunnerClient?: ZendeskClient
  //   paginator?: clientUtils.Paginator
  // }) => Promise<Required<Filter>>

  public constructor({
    // filterCreators = DEFAULT_FILTERS as FilterCreator[],
    // client,
    credentials,
    getElemIdFunc,
    config,
    configInstance,
    elementsSource,
  }: ZendeskAdapterParams) {
    // TODON "upgrade" to generic adapter after seeing the basic upgrade work
    // TODON use in generic adapter creator as well?
    const wrapper = getElemIdFunc ? getElemIdFuncWrapper(getElemIdFunc) : undefined
    this.userConfig = config
    // TODON make sure config instance is able to customize elem ids
    // TODON define alternative mechanism for adjusting the "system" config
    // TODON add safeties
    this.configInstance = configInstance
    this.getElemIdFunc = wrapper?.getElemIdFunc
    this.logIdsFunc = wrapper?.logIdsFunc
    // this.elementsSource = elementsSource
    // this.brandsList = undefined
    // TODON adjust
    // TODON for backward-compatibility, keep the default client as this.client?
    this.client = new ZendeskClient({
      credentials,
      config: config[CLIENT_CONFIG],
      allowOrganizationNames: config[FETCH_CONFIG].resolveOrganizationIDs,
    })

    // this.paginators = createPaginators({
    //   client: this.client,
    //   paginationFuncCreator: paginate,
    // })
    this.brandSpecificClient = createBrandSpecificClient(
      {
        credentials,
        config: config[CLIENT_CONFIG],
        allowOrganizationNames: config[FETCH_CONFIG].resolveOrganizationIDs,
      },
      this.client,
    )
    this.definitions = {
      clients: createClientDefinitions({
        global: this.client,
        by_brand: this.brandSpecificClient,
      }),
      pagination: PAGINATION,
      fetch: createFetchDefinitions(this.userConfig[FETCH_CONFIG]),
      deploy: createDeployDefinitions(),
    }

    this.fetchQuery = elementUtils.query.createElementQuery(
      this.userConfig[FETCH_CONFIG],
      fetchCriteria,
    )

    // this.createFiltersRunner = async ({
    //   filterRunnerClient, // TODON ?
    //   paginator,
    // } : {
    //   filterRunnerClient?: ZendeskClient
    //   paginator?: clientUtils.Paginator
    // }) => (
    //   filtersRunner(
    //     {
    //       client: filterRunnerClient ?? this.client, // TODON see if can get rid of the need in deploy
    //       paginator: paginator ?? this.paginator,
    //       config,
    //       getElemIdFunc: this.getElemIdFunc,
    //       fetchQuery: this.fetchQuery,
    //       elementsSource,
    //       brandIdToClient: this.brandSpecificClient.getClient,
    //     },
    //     filterCreators,
    //     concatObjects, // TODON make this the default aggregator in the infra? used in jira+zendesk+okta
    //   )
    // )

    this.fixElementsFunc = combineElementFixers(createFixElementFunctions({
      client: this.client,
      config,
      elementsSource,
    }))
  }

  // private filterSupportedTypes(): Record<string, string[]> { // TODON use
  //   const isGuideEnabledInConfig = isGuideEnabled(this.userConfig[FETCH_CONFIG])
  //   const isGuideThemesEnabledInConfig = isGuideThemesEnabled(this.userConfig[FETCH_CONFIG])
  //   const keysToOmit = isGuideEnabledInConfig
  //     ? Object.keys(GUIDE_BRAND_SPECIFIC_TYPES) : Object.keys(GUIDE_SUPPORTED_TYPES)
  //   if (!isGuideThemesEnabledInConfig) {
  //     keysToOmit.push(GUIDE_THEME_TYPE_NAME)
  //   }
  //   const { supportedTypes: allSupportedTypes } = this.userConfig.apiDefinitions
  //   return _.omit(allSupportedTypes, ...keysToOmit)
  // }

  @logDuration('generating instances and types from service')
  private async getElements(): Promise<ReturnType<typeof getElements>> {
    // const supportedTypes = this.filterSupportedTypes()
    // TODON make sure we allow fetching tags!!! even though fetched in a filter
    const res = await getElements({
      adapterName: ZENDESK, // TODON generalize similarly to adapter-creator
      definitions: this.definitions,
      fetchQuery: this.fetchQuery,
      getElemIdFunc: this.getElemIdFunc,
      // TODON replace computeGetArgs
      // TODON in infra - make sure to "consume" all parts! and avoid caching full responses unnecessarily
      // customInstanceFilter: filterOutInactiveInstancesForType(this.userConfig), - TODON use!!! and move location
    })

    // TODON still need this warning - ideally before fetching guide? but not critical since not blocking the fetch
    const brandsList = getBrandsForGuide(
      res.elements.filter(isInstanceElement),
      this.userConfig[FETCH_CONFIG]
    )
    if (_.isEmpty(brandsList)) {
      const brandPatterns = Array.from(this.userConfig[FETCH_CONFIG].guide?.brands ?? []).join(', ')
      const message = `Could not find any brands matching the included patterns: [${brandPatterns}]. Please update the configuration under fetch.guide.brands in the configuration file`
      log.warn(message)
      res.errors = (res.errors ?? []).concat([{
        message,
        severity: 'Warning',
      }])
    }

    return res
  }

  private async isLocaleEnUs(): Promise<SaltoError | undefined> {
    try {
      const res = (await this.client.get({
        url: '/api/v2/users/me',
      })).data
      if (isCurrentUserResponse(res)) {
        if (res.user.locale !== 'en-US') {
          return {
            message: 'You are fetching zendesk with a user whose locale is set to a language different than US English. This may affect Salto\'s behavior in some cases. Therefore, it is highly recommended to set the user\'s language to "English (United States)" or to create another user with English as its Zendesk language and change Salto‘s credentials to use it. For help on how to change a Zendesk user\'s language, go to https://support.zendesk.com/hc/en-us/articles/4408835022490-Viewing-and-editing-your-user-profile-in-Zendesk-Support',
            severity: 'Warning',
          }
        }
        return undefined
      }
      log.error('could not verify fetching user\'s locale is set to en-US. received invalid response')
    } catch (e) {
      log.error(`could not verify fetching user's locale is set to en-US'. error: ${e}`)
    }
    return undefined
  }

  private async logSubscriptionData(): Promise<void> {
    try {
      const { data } = await this.client.get({ url: '/api/v2/account/subscription.json' })
      const subscriptionData = !_.isArray(data) ? data.subscription : undefined
      if (subscriptionData) {
        log.info(`Account subscription data: ${inspectValue(subscriptionData)}`)
      } else {
        log.info(`Account subscription data invalid: ${inspectValue(data)}`)
      }
      // This log is not crucial for the fetch to succeed, so we don't want to fail the fetch if it fails
    } catch (e) {
      if (e.response?.status === 422) {
        log.info('Account subscription data unavailable because this is a sandbox environment')
      } else {
        log.info(`Account subscription data unavailable because of an error ${inspectValue(e)}`)
      }
    }
  }

  /**
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch({ progressReporter }: FetchOptions): Promise<FetchResult> {
    log.debug('going to fetch zendesk account configuration..')
    progressReporter.reportProgress({ message: 'Fetching types and instances' })
    await this.logSubscriptionData()
    const localeError = await this.isLocaleEnUs()
    const { elements, configChanges, errors } = await this.getElements()
    // log.debug('going to run filters on %d fetched elements', elements.length)
    // progressReporter.reportProgress({ message: 'Running filters for additional information' })
    // // This exposes different subdomain clients for Guide related types filters
    // // TODON use the wrapper client in filters and pass brand info (make sure can lookup by id as well)
    // const result = await (await this.createFiltersRunner({}))
    //   .onFetch(elements) as FilterResult
    const updatedConfig = this.configInstance && configChanges
      ? configUtils.getUpdatedCofigFromConfigChanges({
        configChanges,
        currentConfig: this.configInstance,
        configType,
      }) : undefined

    // const fetchErrors = (errors ?? []).concat(result.errors ?? []).concat(localeError ?? [])
    const fetchErrors = (errors ?? []).concat(localeError ?? []) // TODON remove
    if (this.logIdsFunc !== undefined) { // TODON use as well?
      this.logIdsFunc()
    }
    return { elements, errors: fetchErrors, updatedConfig }
  }

  // private getBrandsFromElementsSource(): Promise<InstanceElement[]> {
  //   if (this.brandsList === undefined) {
  //     this.brandsList = getBrandsFromElementsSourceNoCache(this.elementsSource)
  //   }
  //   return this.brandsList
  // }

  // private async deployGuideChanges(guideResolvedChanges: Change<InstanceElement>[]): Promise<DeployResult[]> {
  //   if (_.isEmpty(guideResolvedChanges)) {
  //     return []
  //   }
  //   const brandsList = await this.getBrandsFromElementsSource()
  //   log.debug('Found %d brands to handle %d guide changes', brandsList.length, guideResolvedChanges.length)
  //   const resolvedBrandIdToSubdomain = Object.fromEntries(brandsList.map(
  //     brandInstance => [brandInstance.value.id, brandInstance.value.subdomain]
  //   ))
  //   const subdomainToGuideChanges = _.groupBy(
  //     guideResolvedChanges,
  //     change => {
  //       const { brand } = getChangeData(change).value
  //       // If the change was in SKIP_RESOLVE_TYPE_NAMES, brand is a reference expression
  //       return resolvedBrandIdToSubdomain[isReferenceExpression(brand) ? brand.value.value.id : brand]
  //     }
  //   )
  //   const subdomainsList = brandsList
  //     .map(brandInstance => brandInstance.value.subdomain)
  //     .filter(isString)
  //   const subdomainToClient = Object.fromEntries(subdomainsList
  //     .filter(subdomain => subdomainToGuideChanges[subdomain] !== undefined)
  //         // TODON sets deployRateLimit, keep!
  //     .map(subdomain => ([subdomain, this.getClientBySubdomain(subdomain, true)])))
  //   try {
  //     return await awu(Object.entries(subdomainToClient))
  //       .map(async ([subdomain, client]) => {
  //         const brandRunner = await this.createFiltersRunner({
  //           filterRunnerClient: client, // TDOON replace with brandSpecificClient and pass as context
  //           paginator: createPaginator({
  //             client,
  //             paginationFuncCreator: paginate,
  //           }),
  //         })
  //         await brandRunner.preDeploy(subdomainToGuideChanges[subdomain])
  //         const { deployResult: brandDeployResults } = await brandRunner.deploy(
  //           subdomainToGuideChanges[subdomain]
  //         )
  //         const guideChangesBeforeRestore = [...brandDeployResults.appliedChanges]
  //         try {
  //           await brandRunner.onDeploy(guideChangesBeforeRestore)
  //         } catch (e) {
  //           if (!isSaltoError(e)) {
  //             throw e
  //           }
  //           brandDeployResults.errors = brandDeployResults.errors.concat([e])
  //         }
  //         return {
  //           appliedChanges: guideChangesBeforeRestore,
  //           errors: brandDeployResults.errors,
  //         }
  //       })
  //       .toArray()
  //   } catch (e) {
  //     if (!isSaltoError(e)) {
  //       throw e
  //     }
  //     return [{
  //       appliedChanges: [],
  //       errors: [e],
  //     }]
  //   }
  // }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
  async deploy(_args: DeployOptions): Promise<DeployResult> {
  // async deploy({ changeGroup }: DeployOptions): Promise<DeployResult> {
    throw new Error('WIP')
    // const [instanceChanges, nonInstanceChanges] = _.partition(changeGroup.changes, isInstanceChange)
    // if (nonInstanceChanges.length > 0) {
    //   log.warn(`We currently can't deploy types. Therefore, the following changes will not be deployed: ${
    //     nonInstanceChanges.map(elem => getChangeData(elem).elemID.getFullName()).join(', ')}`)
    // }
    // const changesToDeploy = instanceChanges
    //   .map(change => ({
    //     action: change.action,
    //     data: _.mapValues(change.data, (instance: InstanceElement) =>
    //       replaceInstanceTypeForDeploy({
    //         instance,
    //         config: this.userConfig[API_DEFINITIONS_CONFIG],
    //       })),
    //   })) as Change<InstanceElement>[]
    // const sourceChanges = _.keyBy(
    //   changesToDeploy,
    //   change => getChangeData(change).elemID.getFullName(),
    // )
    // const runner = await this.createFiltersRunner({})
    // const resolvedChanges = await awu(changesToDeploy)
    //   .map(async change =>
    //     (SKIP_RESOLVE_TYPE_NAMES.includes(getChangeData(change).elemID.typeName)
    //       ? change
    //       : resolveChangeElement(
    //         change,
    //         lookupFunc,
    //         async (element, getLookUpName, elementsSource) =>
    //           resolveValues(element, getLookUpName, elementsSource, true),
    //       )))
    //   .toArray()
    // const [guideResolvedChanges, supportResolvedChanges] = _.partition(
    //   resolvedChanges,
    //   change => GUIDE_TYPES_TO_HANDLE_BY_BRAND.includes(getChangeData(change).elemID.typeName)
    // )
    // const saltoErrors: SaltoError[] = []
    // try {
    //   await runner.preDeploy(supportResolvedChanges)
    // } catch (e) {
    //   if (!isSaltoError(e)) {
    //     throw e
    //   }
    //   return {
    //     appliedChanges: [],
    //     errors: [e],
    //   }
    // }
    // const { deployResult } = await runner.deploy(supportResolvedChanges)
    // const appliedChangesBeforeRestore = [...deployResult.appliedChanges]
    // try {
    //   await runner.onDeploy(appliedChangesBeforeRestore)
    // } catch (e) {
    //   if (!isSaltoError(e)) {
    //     throw e
    //   }
    //   saltoErrors.push(e)
    // }


    // const guideDeployResults = await this.deployGuideChanges(guideResolvedChanges)
    // const allChangesBeforeRestore = appliedChangesBeforeRestore.concat(
    //   guideDeployResults.flatMap(result => result.appliedChanges)
    // )
    // const appliedChanges = await awu(allChangesBeforeRestore)
    //   .map(change => restoreChangeElement(
    //     change,
    //     sourceChanges,
    //     lookupFunc,
    //   ))
    //   .toArray()
    // const restoredAppliedChanges = restoreInstanceTypeFromDeploy({
    //   appliedChanges,
    //   originalInstanceChanges: instanceChanges,
    // })
    // return {
    //   appliedChanges: restoredAppliedChanges,
    //   errors: deployResult.errors.concat(guideDeployResults.flatMap(result => result.errors)).concat(saltoErrors),
    // }
  }

  // eslint-disable-next-line class-methods-use-this
  public get deployModifiers(): DeployModifiers {
    return {
      changeValidator: createChangeValidator({
        client: this.client,
        config: this.userConfig,
        apiConfig: this.userConfig[API_DEFINITIONS_CONFIG],
        fetchConfig: this.userConfig[FETCH_CONFIG],
        deployConfig: this.userConfig[DEPLOY_CONFIG],
        typesDeployedViaParent: ['organization_field__custom_field_options', 'macro_attachment', BRAND_LOGO_TYPE_NAME, CUSTOM_OBJECT_FIELD_OPTIONS_TYPE_NAME],
        // article_attachment and guide themes additions supported in a filter
        typesWithNoDeploy: ['tag', ARTICLE_ATTACHMENT_TYPE_NAME, GUIDE_THEME_TYPE_NAME, THEME_SETTINGS_TYPE_NAME, ...GUIDE_ORDER_TYPES, DEFAULT_CUSTOM_STATUSES_TYPE_NAME, CUSTOM_OBJECT_FIELD_ORDER_TYPE_NAME],
      }),
      dependencyChanger,
      getChangeGroupIds,
    }
  }

  fixElements: FixElementsFunc = elements => this.fixElementsFunc(elements)
}
