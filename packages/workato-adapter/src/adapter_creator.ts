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
import { logger } from '@salto-io/logging'
import {
  InstanceElement, Adapter,
} from '@salto-io/adapter-api'
import { client as clientUtils, elements as elementUtils } from '@salto-io/adapter-utils'
import changeValidator from './change_validator'
import WorkatoAdapter from './adapter'
import {
  configType, WorkatoConfig, CLIENT_CONFIG, FETCH_CONFIG, DEFAULT_RESOURCES,
  UsernameTokenCredentials, Credentials, usernameTokenCredentialsType,
} from './types'
import WorkatoClient from './client/client'
import { realConnection } from './client/connection'
import { BASE_URL } from './constants'

const log = logger(module)
const { validateCredentials, validateClientConfig } = clientUtils
const { validateFetchConfig } = elementUtils.ducktype

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  new UsernameTokenCredentials({
    username: config.value.username,
    token: config.value.token,
  })
)

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): WorkatoConfig => {
  const apiResources: elementUtils.ducktype.AdapterApiConfig = _.defaults(
    {}, config?.value?.apiResources, { resources: DEFAULT_RESOURCES }
  )

  const adapterConfig: { [K in keyof Required<WorkatoConfig>]: WorkatoConfig[K] } = {
    client: config?.value?.client,
    fetch: config?.value?.fetch,
    apiResources,
  }

  validateClientConfig(CLIENT_CONFIG, adapterConfig.client)
  validateFetchConfig(FETCH_CONFIG, adapterConfig.fetch, apiResources)

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
        api: { baseUrl: BASE_URL },
      }),
      config,
    })
  },
  validateCredentials: async config => validateCredentials(
    credentialsFromConfig(config),
    {
      apiConfig: { baseUrl: BASE_URL },
      createConnection: realConnection,
    },
  ),
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
