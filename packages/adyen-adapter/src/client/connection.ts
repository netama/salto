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

export const validateCredentials = async ({
  connection,
  credentials,
}: {
  credentials: Credentials
  connection: clientUtils.APIConnection
}): Promise<AccountInfo> => {
  try {
    // TODO replace with some valid endpoint, identify production accounts
    const res = await connection.get('/v3/me')
    const accountId = res.data.companyName
    return { accountId, isProduction: !credentials.test }
  } catch (e) {
    log.error('Failed to validate credentials: %s', e)
    throw new clientUtils.UnauthorizedError(e)
  }
}

export const createConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions =>
  clientUtils.axiosConnection({
    retryOptions,
    baseURLFunc: async ({ test }) => (test ? 'https://management-test.adyen.com' : 'https://management-live.adyen.com'),
    // baseURLFunc: async () => 'https://ca-test.adyen.com',
    authParamsFunc: async ({ apiKey }: Credentials) => ({
      headers: {
        'x-API-key': `${apiKey}`,
      },
    }),
    credValidateFunc: validateCredentials,
  })
