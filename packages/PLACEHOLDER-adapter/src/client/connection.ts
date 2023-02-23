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
import axios from 'axios'
import FormData from 'form-data'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import HTMLParser from 'node-html-parser'
import { AccountInfo } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { Credentials } from '../auth'

const log = logger(module)

export const validateCredentials = async ({ connection }: {
  // credentials: Credentials
  connection: clientUtils.APIConnection
}): Promise<AccountInfo> => {
  try {
    await connection.get('/api/v2/account') // TODO replace with some valid endpoint, validate response if needed
    return { accountId: '' }
  } catch (e) {
    log.error('Failed to validate credentials: %s', e)
    throw new clientUtils.UnauthorizedError(e)
  }
}

export const createConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions => (
  clientUtils.axiosConnection({
    retryOptions,
    baseURLFunc: async () => 'https://localhost:80', // TODO replace with base URL, creds can be used
    authParamsFunc: async ({ token, username, password }: Credentials) => {
      // TODO adjust / remove - sample for private APIs requiring cookies
      const jar = new CookieJar()
      const client = wrapper(axios.create({ jar }))
      const { data } = await client.get('https://localhost:80/sign_in')
      const root = HTMLParser.parse(data)
      const authenticityToken = root.querySelector('TODO')?.attrs.value // TODO adjust query
      const form = new FormData()
      form.append('admin[email]', username)
      form.append('admin[password]', password)
      form.append('authenticity_token', authenticityToken)
      await client.post(
        'https://localhost:80/authenticate',
        form,
        { headers: form.getHeaders() },
      )

      // TODO return arguments that should be used by all client calls
      return {
        headers: { Authorization: `Bearer ${token}` },
        jar, // TODO remove if cookies are not needed (usually not needed for public APIs)
      }
    },
    credValidateFunc: validateCredentials,
  })
)