/*
*                      Copyright 2020 Salto Labs Ltd.
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
import { createClientAsync, WSSecurity, Client } from 'soap'
import requestretry, { RequestRetryOptions } from 'requestretry'
import { Credentials, WorkdayApiModuleConfig } from '../types'

export type WorkdayAPI = Record<string, Client>

export default interface Connection {
  login: (creds: Credentials) => Promise<WorkdayAPI>
}

export const realConnection = (
  config: Record<string, WorkdayApiModuleConfig>,
  retryOptions: RequestRetryOptions,
): Connection => {
  const generateClientForWsdl = async (wsdlUrl: string): Promise<Client> => (
    createClientAsync(
      // TODON cache on first fetch and default to using from local
      wsdlUrl,
      {
        preserveWhitespace: true,
        // allow retries
        request: requestretry.defaults(retryOptions),
      },
    )
  )

  const login = (client: Client, wsSecurity: WSSecurity): Client => {
    client.setSecurity(wsSecurity)
    return client
  }
  const clientPromises = _.mapValues(config, moduleConf => generateClientForWsdl(moduleConf.wsdl))
  return {
    login: async ({ username, password }) => {
      const sec = new WSSecurity(username, password)
      const loginPromises = Object.keys(config).map(async moduleName => {
        const res = await login((await clientPromises[moduleName]), sec)
        return { [moduleName]: res }
      })
      const loginData = await Promise.all(loginPromises)
      return _.assign({}, ...loginData)
    },
  }
}
