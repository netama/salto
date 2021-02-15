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
import { AccountId } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-utils'
import { Credentials } from '../auth'

const baseUrl = (subdomain: string): string => `https://${subdomain}.zendesk.com/api/v2`

export const validateCredentials = async (
  creds: Credentials, _conn: clientUtils.APIConnection,
): Promise<AccountId> => (
  // TODON temporary, not correct
  creds.username
)

export const createConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions => (
  clientUtils.axiosConnection({
    retryOptions,
    authParamsFunc: ({ username, password }: Credentials) => ({
      auth: {
        username,
        password,
      },
    }),
    baseURLFunc: ({ subdomain }) => baseUrl(subdomain),
    credValidateFunc: validateCredentials,
  })
)
