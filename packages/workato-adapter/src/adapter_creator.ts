/*
*                      Copyright 2020 Salto Labs Ltd.
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
import WorkatoClient from './client/client'
import changeValidator from './change_validator'
import WorkatoAdapter from './adapter'
import {
  configType, WorkatoConfig, CLIENT_CONFIG, WorkatoClientConfig, RetryStrategyName,
  UsernameTokenCredentials, Credentials, usernameTokenCredentialsType,
  API_CONFIG,
} from './types'

const log = logger(module)

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  new UsernameTokenCredentials({
    username: config.value.username,
    token: config.value.token,
  })
)

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): WorkatoConfig => {
  const validateClientConfig = (clientConfig: WorkatoClientConfig | undefined): void => {
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

  const adapterConfig: { [K in keyof Required<WorkatoConfig>]: WorkatoConfig[K] } = {
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
    return new WorkatoAdapter({
      client: new WorkatoClient({
        credentials,
        config: config[CLIENT_CONFIG],
        api: config[API_CONFIG],
      }),
      config,
    })
  },
  // TODON validate credentials - use the /users/me endpoint
  // validateCredentials: async config => validateCredentials(credentialsFromConfig(config)),
  validateCredentials: async () => (Promise.resolve('ok')),
  authenticationMethods: {
    basic: {
      credentialsType: usernameTokenCredentialsType,
    },
  },
  configType,
  deployModifiers: {
    changeValidator,
  },
}
