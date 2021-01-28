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
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-utils'
import * as constants from './constants'

const { createClientConfigType } = clientUtils
const { createUserFetchConfigType, createAdapterApiConfigType } = elementUtils.ducktype

// TODO add to documentation
export const CLIENT_CONFIG = 'client'
export const FETCH_CONFIG = 'fetch'

export const API_RESOURCES_CONFIG = 'apiResources'

export type WorkatoClientConfig = clientUtils.ClientBaseConfig

export type WorkatoFetchConfig = elementUtils.ducktype.UserFetchConfig
export type WorkatoApiConfig = elementUtils.ducktype.AdapterApiConfig

export type WorkatoConfig = {
  [CLIENT_CONFIG]?: WorkatoClientConfig
  [FETCH_CONFIG]: WorkatoFetchConfig
  [API_RESOURCES_CONFIG]?: WorkatoApiConfig
}

export type ConfigChangeSuggestion = {
  // TODO either add change suggestions or remove
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

export const DEFAULT_RESOURCES: Record<string, elementUtils.ducktype.ResourceConfig> = {
  connections: {
    endpoint: {
      url: '/connections',
    },
  },
  recipes: {
    endpoint: {
      url: '/recipes',
      fieldsToOmit: ['last_run_at'],
      fieldsToExtract: ['code'],
    },
  },
  folders: {
    endpoint: {
      url: '/folders',
      recursiveQueryByResponseField: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        parent_id: 'id',
      },
      paginationField: 'page',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  api_collections: {
    endpoint: {
      url: '/api_collections',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  api_endpoints: {
    endpoint: {
      url: '/api_endpoints',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  api_clients: {
    endpoint: {
      url: '/api_clients',
    },
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  api_access_profiles: {
    endpoint: {
      url: '/api_access_profiles',
    },
  },
  roles: {
    endpoint: {
      url: '/roles',
    },
  },
  properties: {
    endpoint: {
      url: '/properties',
      queryParams: {
        prefix: '',
      },
      hasDynamicFields: true,
    },
  },
}

export const configType = new ObjectType({
  elemID: configID,
  fields: {
    [CLIENT_CONFIG]: {
      type: createClientConfigType(constants.WORKATO),
    },
    [FETCH_CONFIG]: {
      type: createUserFetchConfigType(constants.WORKATO),
      annotations: {
        [CORE_ANNOTATIONS.REQUIRED]: true,
        [CORE_ANNOTATIONS.DEFAULT]: {
          includeResources: [...Object.keys(DEFAULT_RESOURCES)].sort(),
        },
      },
    },
    [API_RESOURCES_CONFIG]: {
      type: createAdapterApiConfigType(constants.WORKATO),
      // TODO decide if want to keep visible
      annotations: {
        [CORE_ANNOTATIONS.DEFAULT]: {
          resources: DEFAULT_RESOURCES,
        },
      },
    },
  },
})

export type FilterContext = {
  [FETCH_CONFIG]: WorkatoFetchConfig
  [API_RESOURCES_CONFIG]: WorkatoApiConfig
}
