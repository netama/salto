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
import axios from 'axios'
import _ from 'lodash'
import { BuiltinTypes, ConfigCreator, ElemID, InstanceElement, ListType } from '@salto-io/adapter-api'
import { elements as elementUtils } from '@salto-io/adapter-components'
import { createDefaultInstanceFromType, createMatchingObjectType } from '@salto-io/adapter-utils'
import { readFile } from '@salto-io/file'
import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { API_COMPONENTS_CONFIG, Config, createConfigType, extendApiDefinitionsFromSwagger } from './config'

const { generateTypes } = elementUtils.swagger
const log = logger(module)


type ConfigOptionsType = {
  // TODON check if need single one to help with config initialization from CLI?
  swaggerURLs?: string[] // TODON convert into objects, allow adding prefixes and filtering
  // import config from external source
  configURL?: string
  // populateDefaultIdFields?: boolean
  // TODON potentially the entire apiComponents config? if so might need a way to "refresh" as well
}

export const getConfigCreator = (adapterName: string): ConfigCreator => {
  const optionsElemId = new ElemID(adapterName, 'configOptionsType')
  const optionsType = createMatchingObjectType<ConfigOptionsType>({
    elemID: optionsElemId,
    fields: {
      swaggerURLs: { refType: new ListType(BuiltinTypes.STRING) },
      configURL: { refType: BuiltinTypes.STRING },
      // populateDefaultIdFields: { refType: BuiltinTypes.BOOLEAN },
    },
  })
  const isOptionsTypeInstance = (instance: InstanceElement):
    instance is InstanceElement & { value: ConfigOptionsType } => { // TODON real validations
    if (instance.refType.elemID.isEqual(optionsElemId)) {
      return true
    }
    log.error(`Received an invalid instance for config options. Received instance with refType ElemId full name: ${instance.refType.elemID.getFullName()}`)
    return false
  }

  // TODON example - if we can also _read_ the swagger at this point this can be really good
  const getConfig = async (
    options?: InstanceElement
  ): Promise<InstanceElement> => {
    const conf = await createDefaultInstanceFromType(ElemID.CONFIG_NAME, createConfigType(adapterName))
    if (options === undefined || !isOptionsTypeInstance(options)) {
      return conf
    }
    if (options.value.configURL !== undefined) {
      const updatedConfig = options.value.configURL.startsWith('file://')
        ? await readFile(options.value.configURL)
        : await axios.get(options.value.configURL)
      conf.value = _.defaults({}, updatedConfig, conf.value) // TODON decide if should override instead
    }
    if (!_.isEmpty(options.value.swaggerURLs)) {
      _.defaults(conf.value, {
        apiComponents: {
          sources: {
            swagger: options.value.swaggerURLs,
          },
          definitions: {
            ...conf.value[API_COMPONENTS_CONFIG]?.definitions ?? {
              types: {},
              typeDefaults: {
                transformation: {
                  idFields: [],
                },
              },
              supportedTypes: [],
            },
          },
        },
      })
      const { parsedConfigs }: elementUtils.swagger.ParsedTypes = _.defaults({}, ...await Promise.all(
        collections.array.makeArray(options.value.swaggerURLs).map(url => (generateTypes(
          options.elemID.adapter,
          {
            swagger: { url },
            ...conf.value.apiComponents.definitions,
          },
          undefined,
          undefined,
          true,
        )))
      ))
      const updatedApiDefinitions = extendApiDefinitionsFromSwagger(
        conf.value as Config, // TODON
        parsedConfigs,
      )
      if (_.isEmpty(updatedApiDefinitions.supportedTypes)) {
        updatedApiDefinitions.supportedTypes = {
          ALL: Object.keys(parsedConfigs), // TODON improve + allow updating / add validations?
        }
      }
      _.assign(conf.value.apiComponents.definitions, updatedApiDefinitions)
    }
    return conf
  }

  return { // TODON also allow to customize? based on what?
    optionsType,
    getConfig,
  }
}
