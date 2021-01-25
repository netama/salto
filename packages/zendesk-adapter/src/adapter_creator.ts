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
import { logger } from '@salto-io/logging'
import {
  InstanceElement, Adapter,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-utils'
import changeValidator from './change_validator'
import ZendeskAdapter from './adapter'
import {
  configType, ZendeskConfig, CLIENT_CONFIG, ZendeskClient,
  UsernamePasswordRESTCredentials, Credentials, usernamePasswordRESTCredentialsType,
} from './types'
import { realConnection } from './client/connection'
import { baseUrl } from './constants'

const log = logger(module)
const { validateCredentials } = clientUtils
const { validateClientConfig } = configUtils

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  new UsernamePasswordRESTCredentials({
    username: config.value.username,
    password: config.value.password,
    subdomain: config.value.subdomain,
  })
)

// TODON generalize too? or too early?
const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): ZendeskConfig => {
  validateClientConfig(CLIENT_CONFIG, config?.value?.client)

  const adapterConfig: { [K in keyof Required<ZendeskConfig>]: ZendeskConfig[K] } = {
    client: config?.value?.client,
    api: config?.value?.api,
  }
  Object.keys(config?.value ?? {})
    .filter(k => !Object.keys(adapterConfig).includes(k))
    .forEach(k => log.debug('Unknown config property was found: %s', k))
  return adapterConfig
}

export const adapter: Adapter = {
  operations: context => {
    const config = adapterConfigFromConfig(context.config)
    const credentials = credentialsFromConfig(context.credentials)
    return new ZendeskAdapter({
      client: new ZendeskClient(
        {
          credentials,
          config: config[CLIENT_CONFIG],
          api: { baseUrl: baseUrl(credentials.subdomain) },
        },
        realConnection,
      ),
      config,
    })
  },
  validateCredentials: async config => validateCredentials(
    credentialsFromConfig(config),
    {
      apiConfig: { baseUrl: baseUrl(credentialsFromConfig(config).subdomain) },
      createConnection: realConnection,
    },
  ),
  authenticationMethods: {
    basic: {
      credentialsType: usernamePasswordRESTCredentialsType,
    },
  },
  configType,
  deployModifiers: {
    changeValidator,
  },
}
