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
import ZendeskClient from './client/client'
import changeValidator from './change_validator'
import ZendeskAdapter from './adapter'
import {
  configType, ZendeskConfig, CLIENT_CONFIG, ZendeskClientConfig, RetryStrategyName,
  UsernamePasswordRESTCredentials, Credentials, usernamePasswordRESTCredentialsType,
  API_CONFIG,
} from './types'

const log = logger(module)

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  new UsernamePasswordRESTCredentials({
    username: config.value.username,
    password: config.value.password,
    subdomain: config.value.subdomain,
  })
)

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): ZendeskConfig => {
  const validateClientConfig = (clientConfig: ZendeskClientConfig | undefined): void => {
    if (clientConfig?.rateLimit !== undefined) {
      const invalidValues = (Object.entries(clientConfig.rateLimit)
        .filter(([_name, value]) => value === 0))
      if (invalidValues.length > 0) {
        throw Error(`${CLIENT_CONFIG}.rateLimit values cannot be set to 0. Invalid keys: ${invalidValues.map(([name]) => name).join(', ')}`)
      }
    }

    if (clientConfig?.retry?.retryStrategy !== undefined
        && RetryStrategyName[clientConfig.retry.retryStrategy] === undefined) {
      throw Error(`${CLIENT_CONFIG}.clientConfig.retry.retryStrategy value '${clientConfig.retry.retryStrategy}' is not supported`)
    }
  }

  validateClientConfig(config?.value?.client)

  const adapterConfig: { [K in keyof Required<ZendeskConfig>]: ZendeskConfig[K] } = {
    client: config?.value?.client,
    api: config?.value?.api,
    disableFilters: config?.value?.disableFilters,
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
      client: new ZendeskClient({
        credentials,
        config: config[CLIENT_CONFIG],
        api: config[API_CONFIG],
      }),
      config,
    })
  },
  // TODON validate credentials
  // validateCredentials: async config => validateCredentials(credentialsFromConfig(config)),
  validateCredentials: async () => (Promise.resolve('ok')),
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
