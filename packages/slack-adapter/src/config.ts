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
import _ from 'lodash'
import { ElemID, CORE_ANNOTATIONS } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { createMatchingObjectType, pathNaclCase, naclCase } from '@salto-io/adapter-utils'
import { SLACK } from './constants'

const { createClientConfigType } = clientUtils
const {
  createUserFetchConfigType, createDucktypeAdapterApiConfigType, validateDuckTypeFetchConfig,
} = configUtils

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
  { fieldName: 'response_metadata' },
]

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type SlackClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type SlackFetchConfig = configUtils.UserFetchConfig
export type SlackApiConfig = configUtils.AdapterDuckTypeApiConfig

export type SlackConfig = {
  [CLIENT_CONFIG]?: SlackClientConfig
  [FETCH_CONFIG]: SlackFetchConfig
  [API_DEFINITIONS_CONFIG]: SlackApiConfig
}

const ALL_SUPPORTED_ENDPOINTS = [
  // 'admin.apps.approved.list',
  // 'admin.apps.requests.list',
  // 'admin.apps.restricted.list',
  // 'admin.auth.policy.getEntities',
  // 'admin.barriers.list',
  // 'admin.conversations.getConversationPrefs',
  // 'admin.conversations.getCustomRetention',
  // 'admin.conversations.getTeams',
  // 'admin.conversations.ekm.listOriginalConnectedChannelInfo',
  // 'admin.conversations.restrictAccess.listGroups',
  // 'admin.emoji.list',
  // 'admin.inviteRequests.list',
  // 'admin.inviteRequests.approved.list',
  // 'admin.inviteRequests.denied.list',
  // 'admin.teams.admins.list',
  // 'admin.teams.list',
  // 'admin.teams.owners.list',
  // 'admin.teams.settings.info',
  // 'admin.usergroups.listChannels',
  // 'admin.users.list',
  // 'admin.users.session.list',
  'auth.teams.list',
  'bots.info',
  'conversations.list',
  'emoji.list',
  'team.billableInfo',
  'team.info',
  'team.billing.info',
  'team.preferences.list',
  'team.profile.get',
  'usergroups.list',
  'users.list',
]

const TYPE_ADDITIONAL_CONFIG: Record<string, configUtils.TypeDuckTypeConfig> = {
  emoji_list__emoji: {
    transformation: {
      isSingleton: true,
    },
  },
  team_billableInfo__billable_info: {
    transformation: {
      hasDynamicFields: true,
      // isSingleton: true,
    },
  },
  team_preferences_list: {
    transformation: {
      isSingleton: true,
    },
  },
  users_list: {
    transformation: {
      dataField: 'members',
    },
  },
  teams: {
    transformation: {
      sourceTypeName: 'auth_teams_list__teams',
    },
  },
}

export const DEFAULT_TYPES: Record<string, configUtils.TypeDuckTypeConfig> = _.defaultsDeep(
  {},
  Object.fromEntries(
    ALL_SUPPORTED_ENDPOINTS.map(e => [pathNaclCase(naclCase(e)), { request: { url: `/${e}` } }])
  ),
  TYPE_ADDITIONAL_CONFIG,
)

export const DEFAULT_CONFIG: SlackConfig = {
  [FETCH_CONFIG]: {
    includeTypes: [
      ...Object.keys(_.pickBy(DEFAULT_TYPES, def => def.request !== undefined)),
    ].sort(),
  },
  [API_DEFINITIONS_CONFIG]: {
    typeDefaults: {
      transformation: {
        idFields: DEFAULT_ID_FIELDS,
        fieldsToOmit: FIELDS_TO_OMIT,
      },
    },
    types: DEFAULT_TYPES,
  },
}

export const configType = createMatchingObjectType<Partial<SlackConfig>>({
  elemID: new ElemID(SLACK),
  fields: {
    [CLIENT_CONFIG]: {
      refType: createClientConfigType(SLACK),
    },
    [FETCH_CONFIG]: {
      refType: createUserFetchConfigType(SLACK),
    },
    [API_DEFINITIONS_CONFIG]: {
      refType: createDucktypeAdapterApiConfigType({
        adapter: SLACK,
      }),
    },
  },
  annotations: {
    [CORE_ANNOTATIONS.DEFAULT]: _.omit(DEFAULT_CONFIG, API_DEFINITIONS_CONFIG),
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: SlackFetchConfig
  [API_DEFINITIONS_CONFIG]: SlackApiConfig
}

export const validateFetchConfig = (
  fetchConfigPath: string,
  userFetchConfig: SlackFetchConfig,
  adapterApiConfig: configUtils.AdapterApiConfig,
): void => {
  validateDuckTypeFetchConfig(fetchConfigPath, userFetchConfig, adapterApiConfig)
}
