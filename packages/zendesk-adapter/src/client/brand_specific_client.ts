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
import { client as clientUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { Credentials } from '../auth'
import ZendeskClient, { LogsFilterConfig } from './client'
import { PAGE_SIZE } from '../config'

const log = logger(module)

export type BrandArgs = {
  subdomain?: string
  brandId: string | number
}

export type BrandSpecificClientInterface = clientUtils.HTTPReadClientInterface<BrandArgs>
  & clientUtils.HTTPWriteClientInterface<BrandArgs>
  & { getClient: (brandId: string | number) => ZendeskClient | undefined }

export const createBrandSpecificClient = (
  clientOpts: clientUtils.ClientOpts<Credentials, clientUtils.ClientRateLimitConfig> & LogsFilterConfig,
  defaultClient?: ZendeskClient,
): BrandSpecificClientInterface => {
  // reuse the client for the default brand's subdomain, to allow sharing rate limits
  const clientBySubdomain: Record<string, ZendeskClient> = {}
  const clientById: Record<string, ZendeskClient> = {}
  if (defaultClient !== undefined) {
    clientBySubdomain[clientOpts.credentials.subdomain] = defaultClient
  }

  const getOrCreateClient = ({ subdomain, brandId }: BrandArgs): ZendeskClient => {
    if (subdomain === undefined) {
      // can only use existing clients
      const client = clientById[brandId.toString()]
      if (client === undefined) {
        throw new Error(`Could not find client id for brand ${brandId}`)
      }
      return client
    }
    if (clientBySubdomain[subdomain] === undefined) {
      clientBySubdomain[subdomain] = new ZendeskClient({
        ...clientOpts,
        credentials: {
          ...clientOpts.credentials,
          subdomain,
        },
      })
    }
    const client = clientBySubdomain[subdomain]
    const clientForBrandId = clientById[brandId]
    if (clientForBrandId !== client) {
      if (clientForBrandId !== undefined) {
        log.warn('mismatch between client by subdomain and client by id - overriding')
      }
      clientById[brandId] = client
    }
    return client
  }

  const getClient = (brandId: string | number): ZendeskClient => getOrCreateClient({ brandId })

  return {
    // TODON do for all functions / wrap a different way
    get: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).get(args),
    delete: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).delete(args),
    head: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).head(args),
    options: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).options(args),
    patch: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).patch(args),
    post: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).post(args),
    put: ({ subdomain, brandId, ...args }) => getOrCreateClient({ subdomain, brandId }).put(args),
    getPageSize: () => clientOpts.config?.pageSize?.get ?? PAGE_SIZE, // TODON not used, remove in new infra?
    getClient,
  }
}
