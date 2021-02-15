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
import { ElemID, ObjectType, BuiltinTypes, InstanceElement } from '@salto-io/adapter-api'
import * as constants from './constants'

const configID = new ElemID(constants.ZUORA_BILLING)

export const usernamePasswordRESTCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    username: { type: BuiltinTypes.STRING },
    password: { type: BuiltinTypes.STRING },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

export const accessTokenCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    accessToken: { type: BuiltinTypes.STRING },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

export const isAccessTokenConfig = (config: Readonly<InstanceElement>): boolean => (
  // TODON change when changing to full oauth
  config.value.authType === 'accessToken'
)

// TODON use...
export const oauthRequestParameters = new ObjectType({
  elemID: configID,
  fields: {
    clientId: {
      type: BuiltinTypes.STRING,
      annotations: { message: 'OAuth client id' },
    },
    clientSecret: {
      type: BuiltinTypes.NUMBER,
      annotations: { message: 'OAuth client secret' },
    },
    baseURL: { type: BuiltinTypes.STRING },
  },
})

// TODON reuse
export class UsernamePasswordRESTCredentials {
  constructor({ username, password, baseURL }:
    { username: string; password: string; baseURL: string }) {
    this.username = username
    this.password = password
    this.baseURL = baseURL
  }

  username: string
  password: string
  baseURL: string
}

export class OAuthAccessTokenCredentials {
  constructor({ baseURL, accessToken }: {
    baseURL: string
    accessToken: string
  }) {
    this.baseURL = baseURL
    this.accessToken = accessToken
  }

  baseURL: string
  accessToken: string
}

export type Credentials = UsernamePasswordRESTCredentials | OAuthAccessTokenCredentials
