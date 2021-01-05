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
import axios, { AxiosInstance, AxiosError } from 'axios'
import axiosRetry from 'axios-retry'
import { Credentials, OAuthAccessTokenCredentials } from '../types'

export type ZuoraAPI = AxiosInstance

export default interface Connection {
  login: (creds: Credentials) => Promise<ZuoraAPI>
}

export type RetryOptions = {
  retries: number
  retryDelay?: (retryCount: number, error: AxiosError) => number
}

export const realConnection = (
  retryOptions: RetryOptions,
): Connection => {
  const login = async (
    creds: Credentials,
  ): Promise<ZuoraAPI> => {
    const headers = (creds instanceof OAuthAccessTokenCredentials
      ? {
        Authorization: `Bearer ${creds.accessToken}`,
      }
      : {
        apiAccessKeyId: creds.username,
        apiSecretAccessKey: creds.password,
      })
    const httpClient = axios.create({
      baseURL: creds.baseURL,
      headers,
    })
    axiosRetry(httpClient, retryOptions)

    // TODON validate credentials
    return httpClient
  }

  return {
    login,
  }
}
