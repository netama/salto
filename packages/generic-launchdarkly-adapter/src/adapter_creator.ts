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
import { client as clientUtils } from '@salto-io/adapter-components'
import { createAdapter } from '@salto-io/adapter-creator'
import { createConnectionConfigWrapper, validateCredentials, Credentials, createGenericJsonCredentialsType, Config, createConfigTypeWithAuth } from '@salto-io/generic-adapter'
import { DEFAULT_CONFIG } from './config'
import { ADAPTER_NAME } from './constants'

const { getWithCursorPagination } = clientUtils

// TODON add adapterConfigFromConfig with extended validations for auth, references etc
// (whatever doesn't go into the adapter-creator)

export const adapter = createAdapter<Credentials, Config>({
  adapterName: ADAPTER_NAME, // TODON customize via config as well? not sure needed...
  authenticationMethods: {
    basic: {
      credentialsType: createGenericJsonCredentialsType(ADAPTER_NAME),
    },
  },
  validateCredentials, // TODON credentials cannot be validated based on config, because config doesn't exist yet
  defaultConfig: DEFAULT_CONFIG,
  configTypeCreator: createConfigTypeWithAuth,
  operationsCustomizations: {
    paginate: () => getWithCursorPagination(), // TODON control based on endpoint... and then don't need this?
    connectionCreatorFromConfig: createConnectionConfigWrapper,
  },
})
