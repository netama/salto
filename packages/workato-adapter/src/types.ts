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
import {
  ElemID, ObjectType, BuiltinTypes, CORE_ANNOTATIONS,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType, createApiBootstrapConfigType } = configUtils

// TODON add to documentation
export const CLIENT_CONFIG = 'client'
export const API_CONFIG = 'api'

export type WorkatoClientConfig = configUtils.ClientBaseConfig

export type WorkatoApiConfig = configUtils.ApiEndpointBaseConfig

export type WorkatoConfig = {
  [CLIENT_CONFIG]?: WorkatoClientConfig
  [API_CONFIG]: WorkatoApiConfig
}

export type ConfigChangeSuggestion = {
  // TODON add change suggestions?
  type: keyof WorkatoConfig
  value: string
  reason?: string
}

export type FetchElements<T> = {
  configChanges: ConfigChangeSuggestion[]
  elements: T
}

const configID = new ElemID(constants.WORKATO)

export const usernameTokenCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    token: {
      type: BuiltinTypes.STRING,
    },
  },
})

export class UsernameTokenCredentials {
  constructor({ username, token }:
    { username: string; token: string }) {
    this.username = username
    this.token = token
  }

  username: string
  token: string
}

export type Credentials = UsernameTokenCredentials

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.WORKATO),
    },
    [API_CONFIG]: {
      type: createApiBootstrapConfigType(constants.WORKATO),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          getEndpoints: [
            {
              endpoint: '/connections',
            },
            {
              endpoint: '/recipes',
              fieldsToOmit: ['last_run_at'],
              fieldsToExtract: ['code'],
            },
            {
              // TODON needs recursion, pagination
              endpoint: '/folders',
              queryParams: {
                // eslint-disable-next-line @typescript-eslint/camelcase,no-template-curly-in-string
                parent_id: '${.id}',
              },
              paginationField: 'page',
            },
            {
              endpoint: '/api_collections',
            },
            {
              endpoint: '/api_endpoints',
            },
            {
              endpoint: '/api_clients',
            },
            {
              endpoint: '/api_access_profiles',
            },
            {
              endpoint: '/roles',
            },
            {
              endpoint: '/properties',
              queryParams: {
                prefix: '',
              },
              hasDynamicFields: true,
            },
          ],
          defaultNameField: 'name',
        },
      },
    },
  },
})

export type FilterContext = {
  [API_CONFIG]: WorkatoApiConfig
}

export class WorkatoClient extends clientUtils.AdapterHTTPClient<Credentials> {
  // eslint-disable-next-line class-methods-use-this
  clientName(): string {
    return constants.WORKATO
  }
}
