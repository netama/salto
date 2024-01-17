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
import { types } from '@salto-io/lowerdash'
import { ActionName } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { transformForOrder } from '../../support/deploy/transforms'
import { ClientOptions } from '../../../requests'

// TODON move to adapter-components if recurs outside zendesk

type InstanceDeployApiDefinitions = definitions.deploy.InstanceDeployApiDefinitions<ActionName, ClientOptions>
type DeployableRequestDefinitions = definitions.deploy.DeployableRequestDefinitions<ClientOptions>

export const createStandardItemDeployConfigs = (typeArgs: Record<string, {
  bulkPath: string
  idField?: string
  overrides?: types.RecursivePartial<InstanceDeployApiDefinitions['requestsByAction']>
  withoutActions?: ActionName[]
  appendRequests?: Partial<Record<ActionName, DeployableRequestDefinitions[]>>
}>): Record<string, InstanceDeployApiDefinitions> => (
  _.mapValues(typeArgs, (({ bulkPath, overrides, withoutActions, appendRequests, idField = 'id' }, typeName) => {
    const standardCustomizationsByAction: Record<ActionName, DeployableRequestDefinitions[]> = {
      add: [
        {
          request: {
            path: bulkPath,
            method: 'post',
          },
        },
        ...appendRequests?.add ?? [],
      ],
      modify: [
        {
          request: {
            path: `${bulkPath}/{${idField}}`,
            method: 'put',
          },
        },
        ...appendRequests?.modify ?? [],
      ],
      remove: [
        {
          request: {
            path: `${bulkPath}/{${idField}}`,
            method: 'delete',
          },
        },
        ...appendRequests?.remove ?? [],
      ],
    }

    const standardConfig: InstanceDeployApiDefinitions = {
      requestsByAction: {
        default: {
          request: {
            nestUnderField: typeName,
          },
        },
        customizations: _.omit(standardCustomizationsByAction, withoutActions ?? []),
      },
    }
    return _.merge(standardConfig, { requestsByAction: overrides ?? {} })
  }))
)

export const createStandardModifyOnlyDeployConfigs = (typeArgs: Record<string, {
  path: string
  nestUnderField?: string
  method?: definitions.HTTPMethod
  transformForOrderFieldName?: string
  addPositions?: boolean
  overrides?: types.RecursivePartial<InstanceDeployApiDefinitions['requestsByAction']> // TODON customize all types once here and use
}>): Record<string, InstanceDeployApiDefinitions> => (
  _.mapValues(typeArgs, (({ path, nestUnderField, method, transformForOrderFieldName, addPositions, overrides }) => {
    const standardCustomizationsByAction: DeployableRequestDefinitions = {
      request: {
        path,
        nestUnderField,
        method: method ?? 'put',
        transform: transformForOrderFieldName !== undefined
          ? transformForOrder(transformForOrderFieldName, addPositions)
          : undefined,
      },
    }

    const standardConfig: InstanceDeployApiDefinitions = {
      requestsByAction: {
        customizations: {
          modify: standardCustomizationsByAction,
        },
      },
    }
    return _.merge(standardConfig, { requestsByAction: overrides ?? {} })
  }))
)

// TODON move to guide utils?
export const createStandardTranslationDeployConfigs = (typeArgs: Record<string, {
  parentPlural: string
  additionalResolvers?: definitions.deploy.ValueReferenceResolver[]
}>): Record<string, InstanceDeployApiDefinitions> => (
  _.mapValues(typeArgs, (({ parentPlural, additionalResolvers }) => ({
    requestsByAction: {
      default: {
        request: {
          nestUnderField: 'translation',
          context: {
            parent_id: '_parent.0.id',
            locale: 'locale',
          },
          omit: ['brand'],
        },
        additionalResolvers,
      },
      customizations: {
        add: {
          request: {
            path: `/api/v2/help_center/${parentPlural}/{parent_id}/translations`,
            method: 'post' as definitions.HTTPMethod,
          },
        },
        modify: {
          request: {
            path: `/api/v2/help_center/${parentPlural}/{parent_id}/translations/{locale}`,
            method: 'put' as definitions.HTTPMethod,
          },
        },
        remove: {
          request: {
            path: '/api/v2/help_center/translations/{id}',
            method: 'delete' as definitions.HTTPMethod,
          },
        },
      },
    },
  })))
)


// TODON move helper functions somewhere else? filter-like? with fetch and deploy
