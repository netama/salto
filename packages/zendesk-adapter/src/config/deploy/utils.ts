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
import { ActionName, getChangeData, isInstanceElement, isReferenceExpression } from '@salto-io/adapter-api'
import { config as configUtils } from '@salto-io/adapter-components'
import { HTTPMethod } from '@salto-io/adapter-components/src/config/system/client/http_endpoint'
import { getParents } from '@salto-io/adapter-utils'
import { DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME } from '../../constants'

// TODON move to adapter-components if recurs outside zendesk

export const createStandardItemDeployConfigs = (typeArgs: Record<string, {
  bulkPath: string
  idField?: string
  overrides?: types.RecursivePartial<configUtils.InstanceDeployApiConfig['requestsByAction']>
  withoutActions?: ActionName[]
}>): Record<string, configUtils.InstanceDeployApiConfig> => (
  _.mapValues(typeArgs, (({ bulkPath, overrides, withoutActions, idField = 'id' }, typeName) => {
    const standardCustomizationsByAction = {
      add: {
        request: {
          path: bulkPath,
          method: 'post',
        },
      },
      modify: {
        request: {
          path: `${bulkPath}/{${idField}}`,
          method: 'put',
        },
      },
      remove: {
        request: {
          path: `${bulkPath}/{${idField}}`,
          method: 'delete',
        },
      },
    }

    const standardConfig: configUtils.InstanceDeployApiConfig = {
      requestsByAction: {
        default: {
          request: {
            nestUnderField: typeName,
          },
        },
        customizations: _.omit(standardCustomizationsByAction, withoutActions ?? []),
      }
    }
    return _.merge(standardConfig, { requestsByAction: overrides ?? {} })
  })
))

export const createStandardOrderDeployConfigs = (typeArgs: Record<string, {
  path: string
  nestUnderField?: string
  overrides?: types.RecursivePartial<configUtils.InstanceDeployApiConfig['requestsByAction']>
}>): Record<string, configUtils.InstanceDeployApiConfig> => (
  _.mapValues(typeArgs, (({ path, nestUnderField, overrides }) => {
    const standardCustomizationsByAction = {
      modify: {
        request: {
          path,
          nestUnderField,
          method: 'put' as HTTPMethod,
        },
      },
    }

    const standardConfig: configUtils.InstanceDeployApiConfig = {
      requestsByAction: {
        customizations: standardCustomizationsByAction,
      }
    }
    return _.merge(standardConfig, { requestsByAction: overrides ?? {} })
  })
))

export const createStandardTranslationDeployConfigs = (typeArgs: Record<string, {
  parentPlural: string
  additionalResolvers?: configUtils.ValueReferenceResolver[]
}>): Record<string, configUtils.InstanceDeployApiConfig> => (
  _.mapValues(typeArgs, (({ parentPlural, additionalResolvers  }) => ({
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
            method: 'post' as HTTPMethod,
          },
        },
        modify: {
          request: {
            path: `/api/v2/help_center/${parentPlural}/{parent_id}/translations/{locale}`,
            method: 'put' as HTTPMethod,
          },
        },
        remove: {
          request: {
            path: '/api/v2/help_center/translations/{id}',
            method: 'delete' as HTTPMethod,
          },
        },
      },
    },
  }))
))


// TODON move helper functions somewhere else? filter-like? with fetch and deploy

// TODON continue after others are done
// assuming not yet resolved?
export const setDefaultFlag: configUtils.HTTPTransformRequest = item => {
  const { value, context } = item
  const firstParent = getParents(getChangeData(context.change))?.[0]
  const newValue = {
    ...value,
    default: value.default = (
      isReferenceExpression(firstParent) && isInstanceElement(firstParent.value)
      && firstParent.value.value[DEFAULT_CUSTOM_FIELD_OPTION_FIELD_NAME] === item.value
    ),
  }
  return {
    ...item,
    value: newValue,
  }
}
