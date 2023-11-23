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
import Bottleneck from 'bottleneck'
import {
  ActionName,
  Change,
  ElemID,
  getChangeData,
  InstanceElement,
  SaltoElementError,
  DeployResult,
  ChangeGroup,
  isRemovalChange,
  isSaltoError,
} from '@salto-io/adapter-api'
import { ChangeElementResolver } from '@salto-io/adapter-utils'
import { DAG } from '@salto-io/dag'
import { logger } from '@salto-io/logging'
import { types, values } from '@salto-io/lowerdash'
import { ApiDefinitions, DefQuery, queryWithDefault } from '../../definitions'
import { InstanceChangeAndGroup, InstanceDeployApiDefinitions } from '../../definitions/system/deploy'
import { getRequester } from './requester'
import { RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS } from '../../client'

const log = logger(module)

/**
 * Deploy change with the standard "add", "modify", "remove" endpoints based on the provided deploy definitions
 */
export const createSingleChangeDeployer = <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string,
>({
  definitions,
  convertError, // TODON add default convertError implementation, move to infra?
  changeResolver,
}: {
  definitions: types.PickyRequired<ApiDefinitions<ClientOptions, PaginationOptions, Action>, 'clients' | 'deploy'>
  convertError: (elemID: ElemID, error: Error) => Error | SaltoElementError
  changeResolver: ChangeElementResolver<Change<InstanceElement>>
}): ((args: InstanceChangeAndGroup) => Promise<void>) => {
  const { clients, deploy } = definitions
  const deployDefQuery = queryWithDefault(deploy.instances)

  const requester = getRequester({ clients, deployDefQuery, changeResolver })

  return async ({ change, changeGroup }) => {
    try {
      return await requester.requestAllForChange({ change, changeGroup })
    } catch (err) {
      throw convertError(getChangeData(change).elemID, err)
    }
  }
}

const createDependencyGraph = <ClientOptions extends string, Action extends string>(
  defQuery: DefQuery<InstanceDeployApiDefinitions<Action, ClientOptions>>,
): DAG<undefined> => {
  const graph = new DAG<undefined>()
  Object.entries(defQuery.getAll()).forEach(([typeName, { dependsOnTypes }]) => {
    if (dependsOnTypes === undefined) {
      graph.addNode(typeName, [], undefined)
      return
    }
    graph.addNode(typeName, dependsOnTypes, undefined)
  })

  return graph
}

/**
 * Runs a deploy function of a single change on many changes and returns the deploy results
 */
export const deployChanges = async <
  ClientOptions extends string,
  PaginationOptions extends string | 'none',
  Action extends string,
>({
  definitions,
  changes,
  changeGroup,
  deployChangeFunc,
  convertError,
  changeResolver,
}: {
  definitions: types.PickyRequired<ApiDefinitions<ClientOptions, PaginationOptions, Action>, 'clients' | 'deploy'>
  changes: Change<InstanceElement>[]
  changeGroup: Readonly<ChangeGroup>
  convertError: (elemID: ElemID, error: Error) => Error | SaltoElementError
  deployChangeFunc?: (args: InstanceChangeAndGroup) => Promise<void>
  changeResolver: ChangeElementResolver<Change<InstanceElement>>
}): Promise<Omit<DeployResult, 'extraProperties'>> => {
  const changesByType = _.groupBy(changes, change => getChangeData(change).elemID.typeName)
  const defQuery = queryWithDefault(definitions.deploy.instances)
  const graph = createDependencyGraph(defQuery)

  const errors: SaltoElementError[] = []
  const appliedChanges: Change<InstanceElement>[] = []

  const deploySingleChange =
    deployChangeFunc ?? createSingleChangeDeployer({ convertError, definitions, changeResolver })

  await graph.walkAsync(async typeName => {
    const typeChanges = changesByType[typeName]
    if (typeChanges === undefined) {
      return
    }
    log.debug('deploying changes of type %s in group %s', typeName, changeGroup.groupID)
    const { concurrency } = defQuery.query(String(typeName)) ?? {}
    const limiter = new Bottleneck({
      maxConcurrent: (concurrency ?? RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS) > 0 ? concurrency : null,
    })
    const limitedDeployChange = limiter.wrap(deploySingleChange)

    const deployChunk = async (chunk: Change<InstanceElement>[]): Promise<void> => {
      const applied = (
        await Promise.all(
          chunk.map(async change => {
            try {
              await limitedDeployChange({ change, changeGroup })
              return change
            } catch (err) {
              log.error('Deployment of %s failed: %o', getChangeData(change).elemID.getFullName(), err)
              if (isSaltoError(err)) {
                errors.push({
                  ...err,
                  elemID: getChangeData(change).elemID,
                })
              } else {
                errors.push({
                  message: `${err}`,
                  severity: 'Error',
                  elemID: getChangeData(change).elemID,
                })
              }
              return undefined
            }
          }),
        )
      ).filter(values.isDefined)
      applied.forEach(change => appliedChanges.push(change))
    }

    // TODON generalize and allow overriding (without re-implementing plan logic...)
    const [removalChanges, otherChanges] = _.partition(typeChanges, isRemovalChange)
    await deployChunk(removalChanges)
    await deployChunk(otherChanges)
  })

  return {
    errors,
    appliedChanges,
  }
}

export type SingleChangeDeployCreator<ClientOptions extends string = 'main', Action extends string = ActionName> = ({
  definitions,
  convertError,
}: {
  definitions: types.PickyRequired<ApiDefinitions<ClientOptions, 'none', Action>, 'clients' | 'deploy'>
  convertError: (elemID: ElemID, error: Error) => Error | SaltoElementError
}) => (args: InstanceChangeAndGroup) => Promise<void>
