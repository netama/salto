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
import {
  Element, Values,
} from '@salto-io/adapter-api'
import {
  naclCase, config as configUtils, elements as elementUtils,
  simpleAdapter,
} from '@salto-io/adapter-utils'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { API_CONFIG, WorkatoClient, WorkatoConfig } from './types'
import extractFieldsFilter from './filters/extract_fields'
import fieldReferencesFilter from './filters/field_references'
import { endpointToTypeName } from './transformers/transformer'
import { WORKATO } from './constants'

const { isDefined } = lowerdashValues
const { generateType, toInstance } = elementUtils.bootstrap
const { computeGetArgs } = simpleAdapter

export const DEFAULT_FILTERS = [
  extractFieldsFilter,
  fieldReferencesFilter,
]

type WorkatoAdapterParams = simpleAdapter.AdapterBaseParams<WorkatoClient, WorkatoConfig>

export default class WorkatoAdapter extends simpleAdapter.BootstrapBaseAdapter<
  WorkatoClient, WorkatoConfig
> {
  public constructor({
    filterCreators = DEFAULT_FILTERS,
    client,
    config,
  }: WorkatoAdapterParams) {
    super({ filterCreators, client, config })
  }

  // eslint-disable-next-line class-methods-use-this
  protected get clientName(): string {
    return WORKATO
  }

  // TODON make this match zendesk!!!
  protected async getTypeAndInstances(
    endpointConf: configUtils.EndpointConfig,
    contextElements?: Record<string, Element[]>,
  ): Promise<Element[]> {
    const { endpoint, fieldsToOmit, hasDynamicFields } = endpointConf

    const getEntries = async (): Promise<Values[]> => {
      const getArgs = computeGetArgs(endpointConf, contextElements)
      return (await Promise.all(
        getArgs.map(args => this.client.get(args))
      )).flatMap(r => r.result.map(entry =>
        (fieldsToOmit !== undefined
          ? _.omit(entry, fieldsToOmit)
          : entry
        )))
    }

    const entries = await getEntries()

    // escape "field" names with '.'
    // TODON instead handle in filter? (not sure if "." is consistent enough for actual nesting)
    const naclEntries = entries.map(e => _.mapKeys(e, (_val, key) => naclCase(key)))

    // endpoints with dynamic fields will be associated with the dynamic_keys type

    const { type, nestedTypes } = generateType({
      adapterName: WORKATO,
      name: endpointToTypeName(endpoint),
      entries: naclEntries,
      hasDynamicFields: hasDynamicFields === true,
    })

    const instances = naclEntries.map((entry, index) => toInstance({
      adapterName: WORKATO,
      entry,
      type,
      nameField: this.userConfig[API_CONFIG].defaultNameField,
      defaultName: `inst_${index}`,
      fieldsToOmit,
      hasDynamicFields,
    })).filter(isDefined)
    return [type, ...nestedTypes, ...instances]
  }
}
