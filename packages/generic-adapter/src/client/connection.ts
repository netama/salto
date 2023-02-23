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
import _ from 'lodash'
import { AccountInfo } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { Credentials, GenericJsonCredentials } from '../auth'
import { Config } from '../config'

export const validateCredentials = async (): Promise<AccountInfo> => ({ accountId: '' }) // TODON config, leave accountId as-is

// TODON move to utils
const PARAM_MATCH = /\{([\w]+)}/g
const replaceParams = (value: string, args: Record<string, string>): string => (
  value.replace(
    PARAM_MATCH,
    val => {
      const name = val.slice(1, -1)
      const replacement = args[name]
      if (replacement === undefined) {
        throw new Error(`Could not find param ${name} for replacing ${value}`)
      }
      return replacement
    }
  )
)

export const safeParse = (credentials: Record<string, string>, key: keyof Credentials): Record<string, string> => {
  try {
    const val = credentials[key].trim().length > 0
      ? JSON.parse(credentials[key])
      : {}
    return _.mapValues(val, v => String(v))
  } catch (e) {
    // must not log value OR error as it may contain sensitive data!
    throw new Error(`Could not parse ${key} credentials, make sure they are a valid serialized JSON`)
  } // TODON also validate on input
}

const parseCredentials = (creds: GenericJsonCredentials): Record<string, string> => (
  { ...creds.secret, ...creds.visible }
)

export const createConnectionConfigWrapper = ({ auth }: Config['client']): clientUtils.ConnectionCreator<Credentials> => {
  const extractHeaders = (args: Record<string, string>): Record<string, string> | undefined => {
    const { headers } = auth
    if (headers === undefined) {
      return undefined
    }
    return _.mapValues(headers, header => replaceParams(header, args))
  }

  const genericAuthParamsFunc = (
    creds: GenericJsonCredentials
  ): clientUtils.AuthParams => {
    const allArgs = parseCredentials(creds)
    // TODON get username, password, token, domain, subdomain as dedicated args (+ allow extending later?)

    const headers = extractHeaders(allArgs)
    if (auth.type === 'basic') {
      return {
        auth: { // TODON just get from config as well (with placeholders)
          username: allArgs.username,
          password: allArgs.password,
        },
        headers,
      }
    }
    return { headers }
  }

  return retryOptions => (
    clientUtils.axiosConnection({
      retryOptions,
      authParamsFunc: async (creds: Credentials) => (
        genericAuthParamsFunc(creds)
      ),
      baseURLFunc: async creds => replaceParams(auth.baseURL, parseCredentials(creds)), // TODON config
      credValidateFunc: validateCredentials, // TODON cannot validate in generic adapter because no access to config
    })
  )
}
