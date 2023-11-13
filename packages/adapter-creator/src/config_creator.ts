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

import { BuiltinTypes, ConfigCreator, ElemID, InstanceElement } from '@salto-io/adapter-api'
import { createDefaultInstanceFromType, createMatchingObjectType } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { createConfigType } from './config'

const log = logger(module)


type ConfigOptionsType = {
  populateDefaultIdFields?: boolean
  // TODON potentially the entire apiComponents config? if so might need a way to "refresh" as well
}

export const getConfigCreator = (adapterName: string): ConfigCreator => {
  const optionsElemId = new ElemID(adapterName, 'configOptionsType')
  const optionsType = createMatchingObjectType<ConfigOptionsType>({
    elemID: optionsElemId,
    fields: {
      populateDefaultIdFields: { refType: BuiltinTypes.BOOLEAN },
    },
  })
  const isOptionsTypeInstance = (instance: InstanceElement):
    instance is InstanceElement & { value: ConfigOptionsType } => {
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
    const defaultConf = await createDefaultInstanceFromType(ElemID.CONFIG_NAME, createConfigType(adapterName))
    if (options !== undefined && isOptionsTypeInstance(options) && options.value.populateDefaultIdFields) {
      // TODON populate everything from the apiComponents part that should also be persisted here?
      defaultConf.value.fetch.enableScriptRunnerAddon = true
    }
    return defaultConf
  }

  return { // TODON also allow to customize? based on what?
    optionsType,
    getConfig,
  }
}
