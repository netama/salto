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
import { client as clientUtils, definitions } from '@salto-io/adapter-components'

const { DEFAULT_RETRY_OPTS, RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS } = clientUtils

interface ClientConstructor<Credentials> {
  new (
    adapterName: string,
    createConnection: clientUtils.ConnectionCreator<Credentials>,
    clientOpts: clientUtils.ClientOpts<Credentials, definitions.ClientRateLimitConfig>,
  ): clientUtils.AdapterHTTPClient<Credentials, definitions.ClientRateLimitConfig>
}

export class Client<Credentials> extends clientUtils.AdapterHTTPClient<Credentials, definitions.ClientRateLimitConfig> {
  constructor(
    adapterName: string, // TODON check if can templatize instead of passing in as arg? (+ also use account name)
    createConnection: clientUtils.ConnectionCreator<Credentials>,
    clientOpts: clientUtils.ClientOpts<Credentials, definitions.ClientRateLimitConfig>,
  ) {
    super(
      adapterName,
      clientOpts,
      createConnection,
      // TODON should be defined by the adapter as well - not sure there are good defaults? maybe default to unlimited?
      // TODON don't require these args for the parent client in the first place?
      // + add wrapper for extracting from config
      {
        pageSize: { get: 100 },
        rateLimit: {
          total: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
          get: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
          deploy: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
        },
        maxRequestsPerMinute: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
        retry: DEFAULT_RETRY_OPTS,
      },
    )
  }
}

// createConnection: ConnectionCreator<TCredentials>,
export const createClient = <
  Credentials,
  P extends clientUtils.ClientOpts<Credentials, definitions.ClientRateLimitConfig> = clientUtils.ClientOpts<
    Credentials,
    definitions.ClientRateLimitConfig
  >,
>({
  adapterName,
  clientOpts,
  createConnection,
  clientCls,
}: {
  adapterName: string
  clientOpts: P
  createConnection: clientUtils.ConnectionCreator<Credentials>
  clientCls?: ClientConstructor<Credentials>
}): clientUtils.AdapterHTTPClient<Credentials, definitions.ClientRateLimitConfig> =>
  // eslint-disable-next-line new-cap
  new (clientCls ?? Client)(adapterName, createConnection, clientOpts)
