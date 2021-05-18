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
import { client as clientUtils } from '@salto-io/adapter-components'
import { Credentials } from '../auth'

// TODON adjust?
const baseUrl = (subdomain: string): string => `https://${subdomain}.zendesk.com/api/v2`

export const validateCredentials = async (): Promise<AccountId> => '' // TODON
// {
//   // TODON do we need to validate? check if should copy from zuora + copy comment from somewhere
//   // default to empty to avoid preventing users from refreshing their credentials in the SaaS
//   return ''
// }

export const createConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions => (
  clientUtils.axiosConnection({
    retryOptions,
    authParamsFunc: async ({ username, password }: Credentials) => ({
      // TODON use oauth?
      auth: {
        username,
        password,
      },
    }),
    baseURLFunc: ({ subdomain }) => baseUrl(subdomain),
    credValidateFunc: validateCredentials,
  })
)
