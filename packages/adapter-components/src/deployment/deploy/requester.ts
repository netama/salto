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
import { Change, InstanceElement, getChangeData, ActionName, isServiceId, Values } from '@salto-io/adapter-api'
import { ChangeElementResolver } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import { ResponseValue, Response } from '../../client'
import { ApiDefinitions, DefQuery, queryWithDefault } from '../../definitions'
import { DeployHTTPEndpointDetails } from '../../definitions/system'
import {
  DeployRequestDefinition,
  DeployRequestEndpointDefinition,
  InstanceChangeAndGroup,
  InstanceDeployApiDefinitions,
} from '../../definitions/system/deploy'
import { createValueTransformer } from '../../fetch/utils' // TODON move
import { replaceAllArgs } from '../../fetch/request/utils' // TODON move
import { TransformDefinition } from '../../definitions/system/shared'

const log = logger(module)
const { awu } = collections.asynciterable

// TODON avoid the potentially-invalid cast?
const getActionFromChange = <Action extends string = ActionName>(change: Change<InstanceElement>): Action =>
  change.action as Action

export type DeployRequester<ClientOptions extends string> = {
  // TODO improve both functions to allow returning partial errors as the return value (SALTO-5427)

  request: (
    args: InstanceChangeAndGroup & {
      requestDef: DeployRequestEndpointDefinition<ClientOptions>
    },
  ) => Promise<Response<ResponseValue | ResponseValue[]>>

  requestAllForChange: (args: InstanceChangeAndGroup) => Promise<void>
}

type ItemExtractor = (args: InstanceChangeAndGroup & { value: Values }) => unknown

const createExtractor = (transformationDef?: TransformDefinition<InstanceChangeAndGroup>): ItemExtractor => {
  const transform = createValueTransformer(transformationDef)
  return ({ value, ...args }) =>
    collections.array.makeArray(
      transform({
        // TODON handle references each time since we might need e.g. ids from a previous call?
        value,
        typeName: getChangeData(args.change).elemID.typeName,
        context: { ...args },
      }),
    )[0]?.value
}

export const getRequester = <
  Action extends string,
  PaginationOptions extends string | 'none',
  ClientOptions extends string,
>({
  clients,
  deployDefQuery,
  changeResolver,
}: {
  clients: ApiDefinitions<ClientOptions, PaginationOptions, Action>['clients']
  deployDefQuery: DefQuery<InstanceDeployApiDefinitions<Action, ClientOptions>>
  changeResolver: ChangeElementResolver<Change<InstanceElement>>
}): DeployRequester<ClientOptions> => {
  const clientDefs = _.mapValues(clients.options, ({ endpoints, ...def }) => ({
    endpoints: queryWithDefault(endpoints),
    ...def,
  }))

  const getMergedRequestDefinition = (
    requestDef: DeployRequestEndpointDefinition<ClientOptions>,
  ): {
    merged: DeployRequestDefinition<ClientOptions> & { endpoint: DeployHTTPEndpointDetails }
    clientName: ClientOptions
  } => {
    const { endpoint: requestEndpoint } = requestDef
    const clientName = requestEndpoint.client ?? clients.default
    const clientDef = clientDefs[clientName]
    // TODON decide if there's a point in keeping get as the default method
    const endpointDef = clientDef.endpoints.query(requestEndpoint.path)?.[requestEndpoint.method ?? 'get']
    return {
      merged: {
        ...requestDef,
        endpoint: _.merge({}, endpointDef, requestDef.endpoint),
      },
      clientName,
    }
  }

  const singleRequest: DeployRequester<ClientOptions>['request'] = async ({ requestDef, change, changeGroup }) => {
    const { merged: mergedRequestDef, clientName } = getMergedRequestDefinition(requestDef)
    const mergedEndpointDef = mergedRequestDef.endpoint

    const extractor = createExtractor(mergedRequestDef.transformation)

    // TODON make sure no unresolved references at this point
    const { elemID, value } = getChangeData(change)

    // TODON ensure ok to always resolve (continuing other comments about using smarter logic)
    const resolvedChange = await changeResolver(change)
    // TODON compare extractor before and after - if identical and flag for avoiding identical is set, skip request

    const extractedBody = mergedEndpointDef.omitBody
      ? undefined
      : extractor({
          change,
          changeGroup,
          value: getChangeData(resolvedChange).value,
        })
    const data = Array.isArray(extractedBody) ? extractedBody[0] : extractedBody
    const callArgs = {
      queryParams: mergedEndpointDef.queryArgs,
      headers: mergedEndpointDef.headers,
      data,
    }

    log.trace(
      'making request for change %s client %s endpoint %s.%s',
      elemID.getFullName(),
      clientName,
      mergedRequestDef.endpoint.path,
      mergedRequestDef.endpoint.method,
    )

    // TODON see if might need additional context
    const finalEndpointIdentifier = replaceAllArgs({
      value: mergedEndpointDef,
      context: value,
      throwOnUnresolvedArgs: true,
    })

    const client = clientDefs[clientName].httpClient

    return client[finalEndpointIdentifier.method ?? 'get']({
      url: finalEndpointIdentifier.path,
      ...callArgs,
    })
  }

  // TODON better separation between def and change, do these only once
  const requestAllForChange: DeployRequester<ClientOptions>['requestAllForChange'] = async ({
    change,
    changeGroup,
  }) => {
    const { elemID } = getChangeData(change)
    const deployDef = deployDefQuery.query(elemID.typeName)
    if (deployDef === undefined) {
      throw new Error(`could not find requests for change ${elemID.getFullName()}`)
    }

    // TODON also support batching
    // TODON use referenceResolution, deployEqualValues in caller
    const { requestsByAction, toActionName } = deployDef
    const action = (toActionName ?? getActionFromChange)(change)

    // TODON finish implementing if needed (there's a condition for each request so can move it there, since a change existing means there is _something_)
    // TODON instead add a default util check function that will check this after resolving both before and after?
    // if (isModificationChange(change) && !deployDef.deployEqualValues) {
    //   // TODON do this for each request instead?
    //   // TODON replace fieldsToIgnore with a transformation of the change (separate from the one for each request)?
    //   const valuesBefore = (await filterIgnoredValues(change.data.before.clone(), fieldsToIgnore ?? [], [])).value
    //   const valuesAfter = (await filterIgnoredValues(change.data.after.clone(), fieldsToIgnore ?? [], [])).value
    //   // TODON check what happens with references

    //   if (isEqualValues(valuesBefore, valuesAfter)) {
    //     return undefined
    //   }
    // }

    const requests = queryWithDefault(requestsByAction).query(action)
    if (requests === undefined) {
      throw new Error(`could not find requests for change ${elemID.getFullName()}`)
    }

    await awu(requests).some(async def => {
      const { request, condition, earlyReturn, fromResponse } = def
      // TODON should everything be inside the .request() call?
      if (condition !== undefined && !condition({ change, changeGroup })) {
        if (request.succeedWithoutRequest === undefined) {
          const { client, path, method } = request.endpoint
          log.trace(
            'skipping call :s.%s(%s) for change %s because the condition was not met',
            client,
            path,
            method,
            elemID.getFullName(),
          )
        }
        if (request.succeedWithoutRequest) {
          log.trace(
            'skipping succeedWithoutRequest for change %s because the condition was not met',
            elemID.getFullName(),
          )
        }
        return false
      }
      if (!request.succeedWithoutRequest) {
        // TODON better error handling
        const res = await singleRequest({ change, changeGroup, requestDef: request })
        // apply relevant parts of the result back to change
        // TODON see if there's a better way, make sure gets to element source, extract to function
        const extractionDef = _.omit(fromResponse, 'updateServiceIDs')
        if (fromResponse?.updateServiceIDs !== false) {
          // TODON check if guaranteed to exist sync (will be much better...)
          // TODON optimize for many changes of the same type
          const type = await getChangeData(change).getType()
          const serviceIDFieldNames = Object.keys(_.pickBy(type.fields, async f => isServiceId(await f.getType())))
          if (serviceIDFieldNames.length > 0) {
            extractionDef.pick = _.concat(extractionDef.pick ?? [], serviceIDFieldNames)
          }
        }
        const extractor = createValueTransformer(extractionDef)
        const dataToApply = extractor({
          value: res.data,
          typeName: elemID.typeName,
          context: { change, changeGroup },
        })
        if (Array.isArray(dataToApply)) {
          // TODON log step name (add step name to def)
          log.warn('extracted response for change %s is not a single value, cannot apply', elemID.getFullName())
        }
        if (dataToApply !== undefined) {
          _.assign(getChangeData(change).value, dataToApply)
        }
      }
      // if earlyReturn is defined, we will not continue to the next request
      return earlyReturn
    })
  }

  return { request: singleRequest, requestAllForChange }
}
