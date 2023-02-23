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
import { InstanceElement } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { createAdapter } from '@salto-io/adapter-creator'
import { Credentials, tokenCredentialsType } from './auth'
import { DEFAULT_CONFIG } from './config'
import { createConnection } from './client/connection'
import { ADAPTER_NAME } from './constants'

const { validateCredentials, getWithCursorPagination } = clientUtils

// TODO adjust if needed. if the config is the same as the credentials, just use it
const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => config.value as Credentials

export const adapter = createAdapter({
  adapterName: ADAPTER_NAME,
  authenticationMethods: {
    basic: {
      credentialsType: tokenCredentialsType,
    },
  },
  validateCredentials: async config => validateCredentials(
    credentialsFromConfig(config),
    {
      createConnection,
    },
  ),
  defaultConfig: DEFAULT_CONFIG,
  operationsCustomizations: {
    // TODO adjust
    // cursor pagination follows links in the response page (and is recommended when available)
    // also possible: offset+limit, offset + last (boolean), by page
    paginate: () => getWithCursorPagination(),
    connectionCreatorFromConfig: () => createConnection,
  },
})
