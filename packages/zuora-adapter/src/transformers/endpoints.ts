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
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { ZuoraApiModuleConfig, DependsOnConfig } from '../types'
import { ModuleTypeDefs } from './type_elements'

const log = logger(module)

const isEndpointAllowed = (apiName: string, config: ZuoraApiModuleConfig): boolean => (
  (config.include ?? []).some(r => new RegExp(r.endpointRegex).test(apiName))
  && (config.excludeRegex ?? []).every(r => !(new RegExp(r).test(apiName)))
)

export const filterEndpointsWithDetails = (
  modulesConfig: Record<string, ZuoraApiModuleConfig>,
  typesByModuleAndEndpoint: Record<string, ModuleTypeDefs>,
): Record<
  string,
  {
    endpoint: string
    dependsOn: Record<string, DependsOnConfig>
    doNotPersist?: boolean
  }[]
> => {
  const allGetEndpoints = _.mapValues(
    modulesConfig,
    (_c, name) => Object.keys(typesByModuleAndEndpoint[name] ?? {})
  )

  const allowedEndpoints = _.mapValues(
    modulesConfig,
    (conf, name) => allGetEndpoints[name].filter(apiName => isEndpointAllowed(apiName, conf))
  )
  // TODON reduce duplication?
  const endpointsWithDeps = _.mapValues(
    allowedEndpoints,
    (endpoints, moduleName) => endpoints
      .map(endpoint => ({
        endpoint,
        dependsOn: Object.assign(
          {},
          ...((modulesConfig[moduleName].include ?? [])
            .filter(include => new RegExp(include.endpointRegex).test(endpoint))
            .filter(include => include.dependsOn !== undefined)
            .map(include => include.dependsOn)),
        ) as Record<string, DependsOnConfig>,
        doNotPersist: (modulesConfig[moduleName].include ?? [])
          .filter(include => new RegExp(include.endpointRegex).test(endpoint))
          .some(include => include.doNotPersist),
      }))
  )

  log.info('Based on the configuration, going to use the following endpoints: %s', JSON.stringify(endpointsWithDeps))
  log.debug('For reference, these are all the endpoints: %s', JSON.stringify(allGetEndpoints))
  return endpointsWithDeps
}
