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
import { Credentials } from '../types'

export type ZendeskAPI = AxiosInstance

export default interface Connection {
  login: (creds: Credentials) => Promise<ZendeskAPI>
}

// TODON support retries
export const realConnection = (
  // config: ZendeskApiConfig,
  // TODON use retry options
  // retryOptions: RequestRetryOptions,
): Connection => {
  const login = async (
    { username, password, subdomain }: Credentials,
  ): Promise<ZendeskAPI> => {
    const httpClient = axios.create({
      baseURL: `https://${subdomain}.zendesk.com/api/v2`,
      auth: {
        username,
        password,
      },
    })

    // TODON validate
    return httpClient
  }

  return {
    login,
  }
}
