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
import { client as clientUtils } from '@salto-io/adapter-utils'
import { Credentials } from '../types'

export const validateCredentials = async (
  _creds: Credentials, conn: clientUtils.APIConnection,
): Promise<void> => {
  await conn.get('/users/me')
}

export const realConnection: clientUtils.ConnectionCreator = ({ apiConfig, retryOptions }) => (
  clientUtils.axiosConnection({
    apiConfig,
    retryOptions,
    authParamsFunc: ({ username, token }: Credentials) => ({
      headers: {
        'x-user-email': username,
        'x-user-token': token,
      },
    }),
    credValidateFunc: validateCredentials,
  })
)
