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
import _ from 'lodash'
import { InstanceElement, Adapter, AdapterAuthentication, ActionName } from '@salto-io/adapter-api'
import { client as clientUtils, filterUtils, definitions as definitionUtils } from '@salto-io/adapter-components'
import { types } from '@salto-io/lowerdash'
import { createCommonFilters } from './filters'
import { createClient } from './client'
import { getConfigCreator } from './config_creator'
import { AdapterImplConstructor } from './adapter/types'
import { createAdapterImpl } from './adapter/creator'

const { validateClientConfig } = definitionUtils

// TODON see if can customize this as well so that we get better logs per adapter/account???
// const log = logger(module)

// TODON do we want to formalize anything here re validations?
// TODON generalize
// TODON add default config and merge!
const adapterConfigFromConfigNoValidations = <Co extends definitionUtils.UserConfig>(
  config: Readonly<InstanceElement> | undefined,
  defaultConfig: Co,
): Co => {
  const adapterConfig = _.defaults({}, config?.value, defaultConfig)
  validateClientConfig('client', config?.value?.client) // TODON
  return adapterConfig
}

// TODON move to dedicated credentials file - in adapter-components??? + this is not really safe...
const defaultCredentialsFromConfig = <Credentials>(config: Readonly<InstanceElement>): Credentials =>
  config.value as Credentials

// TODON no need to ever re-implement this???
export const createAdapter = <
  Credentials,
  Co extends definitionUtils.UserConfig = definitionUtils.UserConfig,
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName,
>({
  adapterName,
  // accountName,
  initialClients,
  definitionsCreator,
  authenticationMethods,
  validateCredentials,
  adapterImpl,
  defaultConfig,
  configTypeCreator,
  operationsCustomizations,
}: {
  adapterName: string
  // accountName: string
  initialClients: Record<ClientOptions, undefined>
  authenticationMethods: AdapterAuthentication
  validateCredentials: Adapter['validateCredentials']
  adapterImpl?: AdapterImplConstructor<Credentials, Co, ClientOptions, PaginationOptions, Action>
  defaultConfig: Co
  definitionsCreator: (args: {
    clients: Record<string, clientUtils.HTTPReadClientInterface & clientUtils.HTTPWriteClientInterface>
    userConfig: Co
  }) => types.PickyRequired<
    definitionUtils.ApiDefinitions<ClientOptions, PaginationOptions, Action>,
    'clients' | 'pagination' | 'fetch'
  >
  configTypeCreator?: definitionUtils.ConfigTypeCreator
  operationsCustomizations: {
    // TODON template the instance element as well for consistency?
    adapterConfigCreator?: (config: Readonly<InstanceElement> | undefined) => Co // TODON too many creators for config?
    credentialsFromConfig?: (config: Readonly<InstanceElement>) => Credentials
    connectionCreatorFromConfig: (config: Co['client']) => clientUtils.ConnectionCreator<Credentials> // TODON config
    customizeFilterCreators?: (
      config: Co,
    ) => filterUtils.AdapterFilterCreator<
      definitionUtils.UserConfig,
      filterUtils.FilterResult,
      {},
      ClientOptions,
      PaginationOptions,
      Action
    >[]
  }
}): Adapter => {
  const { adapterConfigCreator, credentialsFromConfig, connectionCreatorFromConfig, customizeFilterCreators } =
    operationsCustomizations
  return {
    operations: context => {
      const config = (adapterConfigCreator ?? adapterConfigFromConfigNoValidations)(context.config, defaultConfig)
      const credentials = (credentialsFromConfig ?? defaultCredentialsFromConfig)(context.credentials)
      const clients = _.mapValues(initialClients, () =>
        createClient<Credentials>({
          adapterName,
          // TODON generalize to not require passing in config?
          createConnection: connectionCreatorFromConfig(config.client),
          clientOpts: {
            // TODON same as before + template on config+creds
            credentials,
            config: config.client, // TODON require it?
          },
        }),
      )
      const adapterOperations = createAdapterImpl<Credentials, Co, ClientOptions, PaginationOptions, Action>(
        {
          // TODON allow customizing
          // TODON move to adapter instead of creator?
          clients,
          config,
          getElemIdFunc: context.getElemIdFunc,
          definitions: definitionsCreator({ clients, userConfig: config }),
          filterCreators:
            customizeFilterCreators !== undefined
              ? customizeFilterCreators(config)
              : Object.values(
                  createCommonFilters<definitionUtils.UserConfig, ClientOptions, PaginationOptions, Action>({ config }),
                ), // TODON generalize passing in params?
          adapterName,
          accountName: adapterName, // TODON not true
          configInstance: context.config, // TODON check if really needed
        },
        adapterImpl,
      )

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
        // TODON check if should update based on sf/ns with additional parts???
      }
    },
    validateCredentials, // TODON credentials cannot be validated based on config, because config doesn't exist yet
    authenticationMethods,
    configType: (configTypeCreator ?? definitionUtils.createUserConfigType)({ adapterName, defaultConfig }),
    configCreator: getConfigCreator(
      adapterName,
      (configTypeCreator ?? definitionUtils.createUserConfigType)({ adapterName, defaultConfig }),
    ),
  }
}
