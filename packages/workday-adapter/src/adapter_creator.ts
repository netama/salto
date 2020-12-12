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
import _ from 'lodash'
import { regex } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import {
  InstanceElement, Adapter,
} from '@salto-io/adapter-api'
import WorkdayClient from './client/client'
import changeValidator from './change_validator'
import WorkdayAdapter from './adapter'
import {
  configType, WorkdayConfig, CLIENT_CONFIG, WorkdayClientConfig, RetryStrategyName,
  UsernamePasswordTenantCredentials, Credentials, usernamePasswordTenantCredentialsType,
  API_MODULES_CONFIG,
} from './types'

const log = logger(module)

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => (
  new UsernamePasswordTenantCredentials({
    username: config.value.username,
    password: config.value.password,
    tenant: config.value.tenant,
    subdomain: config.value.subdomain,
  })
)

const adapterConfigFromConfig = (config: Readonly<InstanceElement> | undefined): WorkdayConfig => {
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

  const validateClientConfig = (clientConfig: WorkdayClientConfig | undefined): void => {
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

  const apiRegexLists = (Object.entries(config?.value?.apiModules ?? {})
    .flatMap(([name, def]) => [
      [`${name}.includeRegex`, _.get(def, 'includeRegex')],
      [`${name}.excludeRegex`, _.get(def, 'excludeRegex')],
    ])
    .filter(([_name, def]) => def !== undefined))
  apiRegexLists.forEach(([name, regexList]) => validateRegularExpressions(name, regexList))

  const adapterConfig: { [K in keyof Required<WorkdayConfig>]: WorkdayConfig[K] } = {
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
    return new WorkdayAdapter({
      client: new WorkdayClient({
        credentials,
        config: config[CLIENT_CONFIG],
        apiModules: config[API_MODULES_CONFIG],
      }),
      config,
    })
  },
  // TODON validate credentials
  // validateCredentials: async config => validateCredentials(credentialsFromConfig(config)),
  validateCredentials: async () => (Promise.resolve('ok')),
  authenticationMethods: {
    basic: {
      credentialsType: usernamePasswordTenantCredentialsType,
    },
  },
  configType,
  deployModifiers: {
    changeValidator,
  },
}
