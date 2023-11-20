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
    await connection.get('https://api.intercom.io/me') // TODO replace with some valid endpoint, validate response if needed
    return { accountId: '' }
  } catch (e) {
    log.error('Failed to validate credentials: %s', e)
    throw new clientUtils.UnauthorizedError(e)
  }
}

export const createConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions => (
  clientUtils.axiosConnection({
    retryOptions,
    authParamsFunc: async ({ token, username, password }: Credentials) => {
      // for private APIs
      const jar = new CookieJar()
      const client = wrapper(axios.create({ jar }))

      const signinHTML = await client.get('https://app.intercom.com/admins/sign_in')
      const root = HTMLParser.parse(signinHTML.data)
      const authenticityToken = root.querySelector('.new_admin input[name="authenticity_token"]')?.attrs.value
      const form = new FormData()
      form.append('authenticity_token', authenticityToken)
      form.append('admin[email]', username)
      form.append('admin[password]', password)
      form.append('admin[remember_me]', '0')
      form.append('selected_region', 'us-east-1')
      form.append('utf8', '✓')
      await client.post(
        'https://app.intercom.com/admins/sign_in',
        form,
        { headers: form.getHeaders() },
      )

      return {
        headers: { Authorization: `Bearer ${token}` }, // for public APIs
        jar,
      }
    },
    // TODON can do per client probably instead
    // baseURLFunc: async () => 'https://api.intercom.io', // TODON allow customizing better per endpoint
    credValidateFunc: validateCredentials,
  })
)
