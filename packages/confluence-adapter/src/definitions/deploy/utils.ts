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
import { types } from '@salto-io/lowerdash'
import { ActionName } from '@salto-io/adapter-api'
import { InstanceDeployApiDefinitions, DeployableRequestDefinitions, ClientOptions } from '../types'

export const DEFAULT_CONTEXT = {
  id: 'id',
  parent_id: '_parent.0.id',
}

export const createStandardItemDeployConfigs = (typeArgs: Record<string, {
  bulkPath: string
  idField?: string
  overrides?: types.RecursivePartial<InstanceDeployApiDefinitions['requestsByAction']>
  withoutActions?: ActionName[]
  appendRequests?: Partial<Record<ActionName, DeployableRequestDefinitions[]>>
  client?: ClientOptions
}>): Record<string, InstanceDeployApiDefinitions> => (
  _.mapValues(typeArgs, (({ client, bulkPath, overrides, withoutActions, appendRequests, idField = 'id' }, typeName) => {
    const standardCustomizationsByAction: Record<ActionName, DeployableRequestDefinitions[]> = {
      add: [
        {
          request: {
            endpoint: {
              path: bulkPath,
              method: 'post',
              client,
            },
          },
        },
        ...appendRequests?.add ?? [],
      ],
      modify: [
        {
          request: {
            endpoint: {
              path: `${bulkPath}/{${idField}}`,
              method: 'put',
              client,
            },
          },
        },
        ...appendRequests?.modify ?? [],
      ],
      remove: [
        {
          request: {
            endpoint: {
              path: `${bulkPath}/{${idField}}`,
              method: 'delete',
              client,
            },
          },
        },
        ...appendRequests?.remove ?? [],
      ],
    }

    const standardConfig: InstanceDeployApiDefinitions = {
      requestsByAction: {
        default: {
          request: {
            transformation: {
              nestUnderField: typeName,
            },
          },
        },
        customizations: _.omit(standardCustomizationsByAction, withoutActions ?? []),
      },
    }
    return _.merge(standardConfig, { requestsByAction: overrides ?? {} })
  }))
)
