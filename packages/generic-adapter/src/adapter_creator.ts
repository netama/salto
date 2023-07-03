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
import { logger } from '@salto-io/logging'
import {
  InstanceElement, Adapter,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import _ from 'lodash'
import Client from './client/client'
import AdapterImpl from './adapter'
import { Credentials, genericJsonCredentialsType } from './auth'
import {
  configType, Config, CLIENT_CONFIG, API_DEFINITIONS_CONFIG,
  FETCH_CONFIG, DEFAULT_CONFIG, ApiConfig,
} from './config'
import { validateCredentials } from './client/connection'

const log = logger(module)
const { validateClientConfig } = clientUtils
const { validateSwaggerApiDefinitionConfig, validateSwaggerFetchConfig } = configUtils

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => {
  const { secret, visible } = config.value
  return {
    secret,
    visible,
  }
}

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): Config => {
  const apiDefinitions = configUtils.mergeWithDefaultConfig(
    DEFAULT_CONFIG.apiDefinitions,
    config?.value.apiDefinitions
  ) as ApiConfig

  const fetch = _.defaults(
    {}, config?.value.fetch, DEFAULT_CONFIG[FETCH_CONFIG],
  )

  validateClientConfig(CLIENT_CONFIG, config?.value?.client) // TODON
  // TODON validate auth + references config
  validateSwaggerApiDefinitionConfig(API_DEFINITIONS_CONFIG, apiDefinitions)
  validateSwaggerFetchConfig(
    FETCH_CONFIG,
    fetch,
    apiDefinitions
  )

  const adapterConfig: { [K in keyof Required<Config>]: Config[K] } = {
    client: config?.value?.client,
    fetch: config?.value?.fetch,
    apiDefinitions,
    references: config?.value?.references,
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
    const adapterOperations = new AdapterImpl({
      client: new Client({
        credentials,
        config: config[CLIENT_CONFIG],
      }),
      config,
    })

    return {
      deploy: adapterOperations.deploy.bind(adapterOperations),
      fetch: async args => {
        const fetchRes = await adapterOperations.fetch(args)
        return {
          ...fetchRes,
          updatedConfig: fetchRes.updatedConfig,
        }
      },
      deployModifiers: adapterOperations.deployModifiers,
    }
  },
  validateCredentials, // TODON credentials cannot be validated based on config, because config doesn't exist yet
  authenticationMethods: {
    basic: {
      credentialsType: genericJsonCredentialsType,
    },
  },
  configType,
}
