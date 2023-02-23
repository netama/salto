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
import {
  InstanceElement,
} from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { createAdapter } from '@salto-io/adapter-creator'
import { Credentials, oauthClientCredentialsType } from './auth'
import { DEFAULT_CONFIG } from './config'
import { createConnection } from './client/connection'
import { ADAPTER_NAME } from './constants'

const { validateCredentials, getWithCursorPagination } = clientUtils

// TODON add generic function that extracts all fields from the instance
const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => {
  const { clientId, clientSecret, authorizationUrl, baseUrl } = config.value
  return {
    clientId,
    clientSecret,
    authUrl: authorizationUrl,
    baseUrl,
  }
}

export const adapter = createAdapter({
  adapterName: ADAPTER_NAME,
  authenticationMethods: {
    basic: {
      credentialsType: oauthClientCredentialsType,
    },
  },
  validateCredentials: async config => validateCredentials( // TODON simplify with just the login?
    credentialsFromConfig(config), // TODON could have used the default...
    {
      createConnection,
    },
  ),
  defaultConfig: DEFAULT_CONFIG,
  operationsCustomizations: {
    paginate: () => getWithCursorPagination(),
    connectionCreatorFromConfig: () => createConnection,
  },
})
