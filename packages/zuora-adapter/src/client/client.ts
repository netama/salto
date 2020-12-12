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
import { realConnection } from './connection'
import { ZUORA, DEFAULT_MAX_CONCURRENT_API_REQUESTS, DEFAULT_PAGE_SIZE } from '../constants'
import { Credentials } from '../auth'

const { getWithCursorPagination, DEFAULT_RETRY_OPTS } = clientUtils

export class UnauthorizedError extends Error {}

export default class ZuoraClient extends clientUtils.AdapterHTTPClient<
  Credentials, clientUtils.ClientRateLimitConfig
> {
  constructor(
    clientOpts: clientUtils.ClientOpts<Credentials, clientUtils.ClientRateLimitConfig>,
  ) {
    super(
      ZUORA,
      clientOpts,
      realConnection,
      {
        pageSize: DEFAULT_PAGE_SIZE,
        rateLimit: DEFAULT_MAX_CONCURRENT_API_REQUESTS,
        retry: DEFAULT_RETRY_OPTS,
      }
    )
  }

  protected getAllItems = getWithCursorPagination
}
