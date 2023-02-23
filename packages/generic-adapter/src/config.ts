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
import { ElemID, CORE_ANNOTATIONS, ObjectType, BuiltinTypes, MapType, ListType } from '@salto-io/adapter-api'
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-components'
import * as adapterCreator from '@salto-io/adapter-creator'
import { createConfigType, ConfigTypeCreator } from '@salto-io/adapter-creator'
import { createMatchingObjectType } from '@salto-io/adapter-utils'

// TODON add oauth support separately + allow additional params
type AuthDefinitions = {
  type: 'custom' | 'basic' // TODON add oauth
  // TODON formalize basic language and placeholders
  headers?: Record<string, string>
  baseURL: string
}

// matching getCredentialsFromUser
type CredentialsArgConfig = {
  // TODON clarify rules for secret vs visible field names in docs
  name: string
  type: 'string' | 'number' | 'boolean'
  message?: string
}

type CredentialsConfig = {
  args: CredentialsArgConfig[]
}

export type Config = adapterCreator.Config & {
  client: clientUtils.ClientBaseConfig<clientUtils.ClientRateLimitConfig> & { auth: AuthDefinitions }
  credentials?: CredentialsConfig // TODON use to validate input?
}

const createAuthConfigType = ({ adapterName }: { adapterName: string }): ObjectType => {
  const authConfigType = createMatchingObjectType<AuthDefinitions>({
    elemID: new ElemID(adapterName, 'authConfig'),
    fields: {
      type: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      // TODON formalize basic language and placeholders
      headers: { refType: new MapType(BuiltinTypes.STRING) },
      baseURL: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
  return authConfigType
}

export const createCredentialsConfigType = ({ adapterName }: { adapterName: string }): ObjectType => {
  const credsArgConfigType = createMatchingObjectType<CredentialsArgConfig>({
    elemID: new ElemID(adapterName, 'credsArgConfig'),
    fields: {
      name: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      type: {
        refType: BuiltinTypes.STRING,
        annotations: { _required: true },
      },
      message: { refType: BuiltinTypes.STRING },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
  return createMatchingObjectType<CredentialsConfig>({
    elemID: new ElemID(adapterName, 'credsConfig'),
    fields: {
      args: {
        refType: new ListType(credsArgConfigType),
        annotations: {
          _required: true,
        },
      },
    },
    annotations: {
      [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: false,
    },
  })
}

export const createConfigTypeWithAuth: ConfigTypeCreator = ({ adapterName, defaultConfig }) => createConfigType({
  adapterName,
  defaultConfig,
  additionalClientFields: {
    auth: {
      refType: createAuthConfigType({ adapterName }),
      annotations: { _required: true },
    },
  },
  additionalFields: {
    credentials: {
      refType: createCredentialsConfigType({ adapterName }),
      // annotations: { _required: true },
    },
  },
})

export const DEFAULT_CONFIG: Config = {
  fetch: {
    ...elementUtils.query.INCLUDE_ALL_CONFIG,
    hideTypes: false,
  },
  apiComponents: {
    sources: {},
    definitions: {
      supportedTypes: {},
      typeDefaults: {
        transformation: {
          idFields: ['id'],
        },
      },
      types: {},
    },
  },
  client: { // TODON switch to multiple clients
    auth: {
      type: 'custom',
      baseURL: 'https://{subdomain}.salto.io',
      headers: {
        Authorization: 'ZZZ {token}',
      },
    },
  },
  references: {
    rules: [],
  },
  credentials: {
    args: [
      {
        name: 'subdomain',
        type: 'string',
        message: 'The subdomin to use when making HTTP requests to the service, e.g.: \'https://<subdomain>.my-domain.com\'',
      },
      {
        name: 'token',
        type: 'string',
      },
    ],
  },
}
