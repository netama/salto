/*
*                      Copyright 2023 Salto Labs Ltd.
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
import { ActionName } from '@salto-io/adapter-api'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { ApiDefinitions, HTTPEndpointDetails, HTTPEndpointIdentifier, HTTPMethod, mergeWithDefault } from '../definitions'
import { ClientEndpoints } from '../definitions/system/requests/endpoint'

export type TypeEndpointRelations<ClientOptions extends string> = {
  // TODON see if need to formalize? technically can do on-demand, but can help narrow the context
  // context required either by endpoint definition of client definition
  // endpointToRequiredContext: Record<string, Set<string>>
  // endpointsToTypes: Record<string, Record<string, Set<string>>>
  typeToEndpoints: Record<string, HTTPEndpointIdentifier[]>
  // map for each endpoint which client should be used to call it
  endpointToClient: Record<string, ClientOptions>
  // // types fetched using recurseInto are not fetched independently (TODON validate no overlaps)
  // typeToRecurseIntoParentTypes: Record<string, Set<string>>
  // // when there is a depends-on (context) relationship, map the types that should be fetched first
  // typeToContextTypes: Record<string, Set<string>>
  // independentTypes: Set<string>
}

const getExtractedTypes = <PaginationOptions extends string | 'none'>(
  endpointDetails: HTTPEndpointDetails<PaginationOptions>,
): string[] => (
    _.uniq(endpointDetails.responseExtractors?.map(ext => ext.toType).filter(lowerdashValues.isDefined) ?? [])
  )

// TODON add generic helper function for reverting edges

const getEndpointToClient = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends ActionName
>(
    clientDefs: ApiDefinitions<ClientOptions, PaginationOptions, Action>['clients']
  ): Record<string, HTTPEndpointIdentifier[]> => {
  // TODON handle casting
  const allEndpoints = {
    ...Object.values(
      _.mapValues(
        clientDefs.options, options => mergeWithDefault(options.endpoints) as ClientEndpoints<PaginationOptions>
      )
    ),
  } as unknown as Record<string, Record<HTTPMethod, HTTPEndpointDetails<PaginationOptions>>>

  const endpointToExtractedType = _.mapValues(allEndpoints, (methodToDetails, path) => (
    _.mapValues(methodToDetails, (details, method) => getExtractedTypes(details).map(type => ({ path, method, type })))
  ))
  const allItems = Object.values(endpointToExtractedType).flatMap(val => Object.values(val)).flat()
  return _.mapValues(
    _.groupBy(allItems, ({ type }) => type),
    items => items.map(({ type: _type, ...item }) => item)
  ) as Record<string, HTTPEndpointIdentifier[]>
}

// TODON later expand from identifier to allow customization args as well?
// TODON move to requester, since only relies on client?
export const computeDependencies = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends ActionName
>(
    defs: Pick<ApiDefinitions<ClientOptions, PaginationOptions, Action>, 'fetch' | 'clients'>
  ): TypeEndpointRelations<ClientOptions> => {
  if (defs.fetch?.instances === undefined) {
    throw new Error('no fetch information') // TODON
  }
  // TODON assuming uniqueness of endpoints across clients - validate before reaching here
  // sources were already processed, ignoring them here
  const endpointsByClient: Record<ClientOptions, string[]> = _.mapValues(
    defs.clients.options,
    // options => mergeWithDefault(options.endpoints)
    options => Object.keys(options.endpoints)
  )
  // TODON see if can avoid casts
  const endpointToClient = Object.fromEntries(Object.entries(endpointsByClient).flatMap(
    ([clientName, endpoints]) => (endpoints as string[]).map(e => [e, clientName as ClientOptions])
  ))

  // const x = mergeWithDefault(defs.fetch.instances)

  return {
    endpointToClient,
    typeToEndpoints: getEndpointToClient(defs.clients),
  }
}
