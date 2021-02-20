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
import { ObjectType } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { safeJsonStringify } from '../../utils'
import { AdapterApiConfig, UserFetchConfig, EndpointConfig } from './endpoint_config'

const log = logger(module)

// TODO do we want to do this by url or (computed) resource names?
const isEndpointAllowed = (url: string, config: UserFetchConfig): boolean => (
  (config.includeRegex ?? []).some(regex => new RegExp(regex).test(url))
  && (config.excludeRegex ?? []).every(regex => !(new RegExp(regex).test(url)))
)

export const filterEndpointsWithDetails = (
  apiConfig: AdapterApiConfig,
  fetchConfig: UserFetchConfig,
  typeByEndpoint: Record<string, ObjectType>,
): EndpointConfig[] => {
  const allGetEndpoints = Object.keys(typeByEndpoint)
  const allowedEndpoints = allGetEndpoints.filter(
    url => isEndpointAllowed(url, fetchConfig)
  )

  // TODO add defaults (nameField, pathField, fieldsToOmit, fieldsToExtract)
  const endpointsWithDeps = allowedEndpoints.map(
    endpoint => ([
      ...(apiConfig.endpointCustomizations ?? []),
      ...(apiConfig.additionalEndpoints ?? []),
    ]).find(
      ({ url }) => url === endpoint
    ) ?? {
      url: endpoint,
    }
  )

  log.info('Based on the configuration, going to use the following endpoints: %s', safeJsonStringify(endpointsWithDeps))
  log.debug('For reference, these are all the endpoints: %s', safeJsonStringify(allGetEndpoints))
  return endpointsWithDeps
}
