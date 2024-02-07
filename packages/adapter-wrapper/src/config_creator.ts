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
import axios from 'axios'
import _ from 'lodash'
import { BuiltinTypes, ConfigCreator, ElemID, InstanceElement, ListType, ObjectType } from '@salto-io/adapter-api'
import { elements as elementUtils } from '@salto-io/adapter-components'
import { createDefaultInstanceFromType, createMatchingObjectType, safeJsonStringify } from '@salto-io/adapter-utils'
import { readTextFile } from '@salto-io/file'
import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'

const { generateTypes } = elementUtils.swagger
const log = logger(module)

type ConfigOptionsType = {
  // TODON add flag to control whether to write apiComponents or not
  // (default false - and then the rest of the flags do nothing)

  // TODON check if need single one to help with config initialization from CLI?
  swaggerURLs?: string[] // TODON convert into objects, allow adding prefixes and filtering
  excludeEndpointsWithParams?: boolean // TODON implement usage - decide if only supportedTypes or also endpoints
  // import ***json*** config from external source
  // !!! TODON can be used in all adapters! to initialize from templates with customizations e.g. single-env
  configURL?: string
  // populateDefaultIdFields?: boolean
  // TODON potentially the entire apiComponents config? if so might need a way to "refresh" as well
}

export const getConfigCreator = (adapterName: string, configType: ObjectType): ConfigCreator => {
  const optionsElemId = new ElemID(adapterName, 'configOptionsType')
  const optionsType = createMatchingObjectType<ConfigOptionsType>({
    elemID: optionsElemId,
    fields: {
      swaggerURLs: { refType: new ListType(BuiltinTypes.STRING) },
      configURL: { refType: BuiltinTypes.STRING },
      excludeEndpointsWithParams: { refType: BuiltinTypes.BOOLEAN },
      // populateDefaultIdFields: { refType: BuiltinTypes.BOOLEAN },
    },
  })
  const isOptionsTypeInstance = (
    instance: InstanceElement,
  ): instance is InstanceElement & { value: ConfigOptionsType } => {
    // TODON real validations
    if (instance.refType.elemID.isEqual(optionsElemId)) {
      return true
    }
    log.error(
      `Received an invalid instance for config options. Received instance with refType ElemId full name: ${instance.refType.elemID.getFullName()}`,
    )
    return false
  }

  // TODON example - if we can also _read_ the swagger at this point this can be really good
  const getConfig = async (options?: InstanceElement): Promise<InstanceElement> => {
    // TODON use the correct config creator
    const conf = await createDefaultInstanceFromType(ElemID.CONFIG_NAME, configType)
    if (options === undefined || !isOptionsTypeInstance(options)) {
      return conf
    }
    if (options.value.configURL !== undefined) {
      try {
        const updatedConfig = options.value.configURL.startsWith('/')
          ? JSON.parse(await readTextFile(options.value.configURL))
          : (await axios.get(options.value.configURL)).data
        conf.value = _.defaults({}, updatedConfig, conf.value) // TODON decide if should override instead
      } catch (e) {
        log.error('could not parse config URL %s due to error %s. stack: %s', options.value.configURL, e, e.stack)
      }
    }
    if (!_.isEmpty(options.value.swaggerURLs)) {
      log.info(
        'calculated swagger config: %s',
        safeJsonStringify(
          _.merge(conf.value, {
            sources: {
              swagger: collections.array.makeArray(options.value.swaggerURLs).map(url => ({ url })),
            },
            definitions: {
              ...{
                types: {},
                typeDefaults: {
                  transformation: {
                    idFields: [],
                  },
                },
                supportedTypes: [],
              },
            },
          }),
        ),
      )
      const { parsedConfigs }: elementUtils.swagger.ParsedTypes = _.defaults(
        {},
        ...(await Promise.all(
          collections.array.makeArray(options.value.swaggerURLs).map(url =>
            generateTypes(options.elemID.adapter, {
              swagger: { url },
              ...conf.value.apiComponents.definitions,
            }),
          ),
        )),
      )
      log.info('can calculate types for: %s', safeJsonStringify(parsedConfigs))
      // const updatedApiDefinitions = extendApiDefinitionsFromSwagger(
      //   conf.value as Config, // TODON
      //   parsedConfigs,
      // )
      // if (_.isEmpty(updatedApiDefinitions.supportedTypes)) {
      //   const relevantParsedConfigs = options.value.excludeEndpointsWithParams
      //     ? _.pickBy(parsedConfigs, ({ request }) => !(request.url.includes('{') || request.url.includes(':')))
      //     : parsedConfigs
      //   updatedApiDefinitions.supportedTypes = {
      //     ALL: Object.keys(relevantParsedConfigs), // TODON improve + allow updating / add validations?
      //   }
      // }
      // _.assign(conf.value.apiComponents.definitions, updatedApiDefinitions)
    }
    log.info('finalized config for %s: %s', adapterName, safeJsonStringify(conf.value))
    return conf
  }

  return {
    // TODON also allow to customize? based on what?
    optionsType,
    getConfig,
  }
}
