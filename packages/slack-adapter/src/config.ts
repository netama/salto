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
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { SLACK } from './constants'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createSwaggerAdapterApiConfigType } = configUtils

const DEFAULT_ID_FIELDS = ['id']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = [
]

export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_DEFINITIONS_CONFIG = 'apiDefinitions'

export type SlackClientConfig = clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig>

export type SlackFetchConfig = configUtils.UserFetchConfig
export type SlackApiConfig = configUtils.AdapterSwaggerApiConfig

export type SlackConfig = {
  [CLIENT_CONFIG]?: SlackClientConfig
  [FETCH_CONFIG]: SlackFetchConfig
  [API_DEFINITIONS_CONFIG]: SlackApiConfig
}

const DEFAULT_TYPE_CUSTOMIZATIONS: SlackApiConfig['types'] = {
}

export const DEFAULT_API_DEFINITIONS: SlackApiConfig = {
  swagger: {
    url: 'https://api.slack.com/specs/openapi/v2/slack_web.json',
    typeNameOverrides: [
      { originalName: 'admin_teams_list@v', newName: 'admin_teams_list' },
      { originalName: 'team_info@v', newName: 'team_info' },
      { originalName: 'usergroups_list@v', newName: 'usergroups_list' },
    ],
  },
  typeDefaults: {
    transformation: {
      idFields: DEFAULT_ID_FIELDS,
      fieldsToOmit: FIELDS_TO_OMIT,
    },
  },
  types: DEFAULT_TYPE_CUSTOMIZATIONS,
}

const ALL_SUPPORTED_TYPES = [
  // we can clean the type names in typeNameOverrides and then use the updated names here
  'admin_teams_list',
  'team_info',
  'usergroups_list',
  // or we can just keep the old names
  'emoji_list@v',
]

export const DEFAULT_INCLUDE_TYPES = ALL_SUPPORTED_TYPES

export const DEFAULT_CONFIG: SlackConfig = {
  [FETCH_CONFIG]: {
    includeTypes: DEFAULT_INCLUDE_TYPES,
  },
  [API_DEFINITIONS_CONFIG]: DEFAULT_API_DEFINITIONS,
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
      refType: createSwaggerAdapterApiConfigType({
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
