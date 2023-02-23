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
import { AccountInfo } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { Credentials } from '../auth'

const log = logger(module)

const BASE_URL = 'https://api.stripe.com'

export const validateCredentials = async ({ connection }: {
  connection: clientUtils.APIConnection
}): Promise<AccountInfo> => {
  try {
    const res = await connection.get('/v1/products')
    if (res.status !== 200) {
      throw new clientUtils.UnauthorizedError('Authentication failed')
    }
  } catch (e) {
    log.error('Failed to validate credentials: %s', e)
    throw new clientUtils.UnauthorizedError(e)
  }
  return { accountId: '' }
}

export const createConnection: clientUtils.ConnectionCreator<Credentials> = (retryOptions, timeout) => (
  clientUtils.axiosConnection({
    retryOptions,
    authParamsFunc: async (creds: Credentials) => ({
      headers: {
        Authorization: `Bearer ${creds.token}`,
      },
    }),
    baseURLFunc: async () => BASE_URL,
    credValidateFunc: validateCredentials,
    timeout,
  })
)

// TODON make sure used before deleting
// const DEFAULT_MAX_CONCURRENT_API_REQUESTS: Required<clientUtils.ClientRateLimitConfig> = {
//   total: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
//   get: 25,
//   deploy: 25,
// }

// // Stripe uses cursor pagination so this parameter is not in use
// const DEFAULT_PAGE_SIZE: Required<clientUtils.ClientPageSizeConfig> = {
//   get: 100,
// }
