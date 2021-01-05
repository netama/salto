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
import axios, { AxiosInstance } from 'axios'
import { Credentials, WorkatoApiConfig } from '../types'

export type WorkatoAPI = AxiosInstance

export default interface Connection {
  login: (creds: Credentials) => Promise<WorkatoAPI>
}

// TODON support retries
export const realConnection = (
  config: WorkatoApiConfig,
  // TODON use retry options
  // retryOptions: RequestRetryOptions,
): Connection => {
  const login = async (
    { username, token }: Credentials,
  ): Promise<WorkatoAPI> => {
    const httpClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'x-user-email': username,
        'x-user-token': token,
      },
    })

    // TODON move to config, also use to validate credentials
    await httpClient.get('/users/me')
    return httpClient
  }

  return {
    login,
  }
}
