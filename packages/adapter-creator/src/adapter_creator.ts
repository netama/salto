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
import _ from 'lodash'
import {
  InstanceElement, Adapter, AdapterAuthentication,
} from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils } from '@salto-io/adapter-components'
import { createCommonFilters } from './filters'
import { createClient } from './client'
import {
  createConfigType, Config, CLIENT_CONFIG, API_COMPONENTS_CONFIG, ConfigTypeCreator,
} from './config'
import { getConfigCreator } from './config_creator'
import { FilterCreator } from './filter'
import { AdapterImplConstructor } from './adapter/types'
import { createAdapterImpl } from './adapter/creator'

const { validateClientConfig } = clientUtils
const { validateDuckTypeApiDefinitionConfig } = configUtils

// TODON see if can customize this as well so that we get better logs per adapter/account???
// const log = logger(module)

// TODON do we want to formalize anything here re validations?
// TODON generalize
// TODON add default config and merge!
const adapterConfigFromConfigNoValidations = <Co extends Config>(
  config: Readonly<InstanceElement> | undefined,
  defaultConfig: Co,
): Co => {
  const adapterConfig = _.defaults(
    {},
    config?.value,
    defaultConfig,
  )
  const apiComponents = configUtils.mergeWithDefaultConfig(
    defaultConfig.apiComponents,
    config?.value.apiComponents
  ) as Config['apiComponents'] // TODON avoid the cast?

  validateClientConfig(CLIENT_CONFIG, config?.value?.client) // TODON
  // TODON validate auth + references config
  // TODON fix validations to support multiple components (+ fetch validation)
  // collections.array.makeArray(apiComponents.sources?.swagger).forEach(swaggerConf => {
  //   validateSwaggerApiDefinitionConfig(API_COMPONENTS_CONFIG, swaggerConf)
  // })
  // TODON add validation just for the swagger parts?
  validateDuckTypeApiDefinitionConfig(API_COMPONENTS_CONFIG, apiComponents.definitions)

  // TODON validate after merging!!!
  // validateSwaggerFetchConfig(
  //   FETCH_CONFIG,
  //   fetch,
  //   apiComponents
  // )
  return adapterConfig
}

// TODON move to dedicated credentials file - in adapter-components??? + this is not really safe...
const defaultCredentialsFromConfig = <Credentials>(config: Readonly<InstanceElement>): Credentials => (
  config.value as Credentials
)

// TODON no need to ever re-implement this???
export const createAdapter = <
  Credentials,
  Co extends Config = Config,
>({
    adapterName,
    // accountName,
    authenticationMethods,
    validateCredentials,
    adapterImpl,
    defaultConfig,
    configTypeCreator,
    operationsCustomizations,
  }: {
  adapterName: string
  // accountName: string
  authenticationMethods: AdapterAuthentication
  validateCredentials: Adapter['validateCredentials']
  adapterImpl?: AdapterImplConstructor<Credentials, Co>
  defaultConfig: Co
  configTypeCreator?: ConfigTypeCreator
  operationsCustomizations: {
    // TODON template the instance element as well for consistency?
    adapterConfigCreator?: (config: Readonly<InstanceElement> | undefined) => Co // TODON too many creators for config?
    credentialsFromConfig?: (config: Readonly<InstanceElement>) => Credentials
    connectionCreatorFromConfig: (config: Co['client']) => clientUtils.ConnectionCreator<Credentials> // TODON config
    customizeFilterCreators?: (config: Co) => FilterCreator<Credentials>[]
    // TODON add a basic paginator that covers things optimistically
    paginate: clientUtils.PaginationFuncCreator // TODON should also be based on the config??? or get it in runtime?
  }
}): Adapter => {
  const {
    adapterConfigCreator,
    credentialsFromConfig,
    connectionCreatorFromConfig,
    paginate,
    customizeFilterCreators,
  } = operationsCustomizations
  return {
    operations: context => {
      const config = (adapterConfigCreator ?? adapterConfigFromConfigNoValidations)(
        context.config,
        defaultConfig,
      )
      const credentials = (credentialsFromConfig ?? defaultCredentialsFromConfig)(context.credentials)
      const adapterOperations = createAdapterImpl<Credentials, Co>(
        {
          client: createClient<Credentials>({ // TODON move to adapter instead of creator?
            adapterName,
            // TODON generalize to not require passing in config?
            createConnection: connectionCreatorFromConfig(config[CLIENT_CONFIG]),
            clientOpts: { // TODON same as before + template on config+creds
              credentials,
              config: config[CLIENT_CONFIG], // TODON require it?
            },
          }),
          config,
          getElemIdFunc: context.getElemIdFunc,
          paginate,
          filterCreators: (
            customizeFilterCreators !== undefined
              ? customizeFilterCreators(config)
              : Object.values(createCommonFilters({ config }))
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
    configType: (configTypeCreator ?? createConfigType)({ adapterName, defaultConfig }),
    configCreator: getConfigCreator(
      adapterName,
      (configTypeCreator ?? createConfigType)({ adapterName, defaultConfig }),
    ),
  }
}
