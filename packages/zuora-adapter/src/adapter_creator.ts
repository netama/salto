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
import { regex } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import {
  InstanceElement, Adapter,
} from '@salto-io/adapter-api'
import ZuoraClient from './client/client'
import changeValidator from './change_validator'
import ZuoraAdapter from './adapter'
import {
  configType, ZuoraConfig, CLIENT_CONFIG, ZuoraClientConfig,
  UsernamePasswordRESTCredentials, Credentials, usernamePasswordRESTCredentialsType,
  accessTokenCredentialsType, OAuthAccessTokenCredentials, isAccessTokenConfig,
} from './types'

const log = logger(module)

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  isAccessTokenConfig(config)
    ? new OAuthAccessTokenCredentials({
      accessToken: config.value.accessToken,
      baseURL: config.value.baseURL,
    })
    : new UsernamePasswordRESTCredentials({
      username: config.value.username,
      password: config.value.password,
      baseURL: config.value.baseURL,
    })
)

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): ZuoraConfig => {
  const validateRegularExpressions = (listName: string, regularExpressions: string[]): void => {
    const invalidRegularExpressions = regularExpressions
      .filter(strRegex => !regex.isValidRegex(strRegex))
    if (!_.isEmpty(invalidRegularExpressions)) {
      const errMessage = `Failed to load config due to an invalid ${listName} value. `
        + `The following regular expressions are invalid: ${invalidRegularExpressions}`
      log.error(errMessage)
      throw Error(errMessage)
    }
  }

  const validateClientConfig = (clientConfig: ZuoraClientConfig | undefined): void => {
    if (clientConfig?.rateLimit !== undefined) {
      const invalidValues = (Object.entries(clientConfig.rateLimit)
        .filter(([_name, value]) => value === 0))
      if (invalidValues.length > 0) {
        throw Error(`${CLIENT_CONFIG}.rateLimit values cannot be set to 0. Invalid keys: ${invalidValues.map(([name]) => name).join(', ')}`)
      }
    }

    // if (clientConfig?.retry?.retryStrategy !== undefined
    //     && RetryStrategyName[clientConfig.retry.retryStrategy] === undefined) {
    //   throw Error(`${CLIENT_CONFIG}.clientConfig.retry.retryStrategy value '${
    //     clientConfig.retry.retryStrategy}' is not supported`)
    // }
  }

  validateClientConfig(config?.value?.client)

  const apiRegexLists = (Object.entries(config?.value?.apiModules ?? {})
    .flatMap(([name, def]) => [
      [`${name}.include.endpointRegex`, _.get(def, 'include.endpointRegex')],
      [`${name}.excludeRegex`, _.get(def, 'excludeRegex')],
    ])
    .filter(([_name, def]) => def !== undefined))
  apiRegexLists.forEach(([name, regexList]) => validateRegularExpressions(name, regexList))

  const adapterConfig: { [K in keyof Required<ZuoraConfig>]: ZuoraConfig[K] } = {
    client: config?.value?.client,
    apiModules: config?.value?.apiModules,
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
    return new ZuoraAdapter({
      client: new ZuoraClient({
        credentials,
        config: config[CLIENT_CONFIG],
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
    // TODON do the full flow
    accessToken: {
      credentialsType: accessTokenCredentialsType,
    },
  },
  configType,
  deployModifiers: {
    changeValidator,
  },
}
