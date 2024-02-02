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
import { ElemID, OBJECT_NAME, OBJECT_SERVICE_ID, ServiceIds, Values, toServiceIdsString } from '@salto-io/adapter-api'
import { invertNaclCase, naclCase, pathNaclCase } from '@salto-io/adapter-utils'
import { values as lowerdashValues } from '@salto-io/lowerdash'
import { NameMappingOptions } from '../../definitions'
import { ElemIDCreatorArgs, ElemIDOrSingleton, PathDefinition } from '../../definitions/system/fetch/element'
import { RECORDS_PATH, SETTINGS_NESTED_PATH } from '../../elements/constants'

// TODON share
type ElemIDCreator = (args: {
  entry: Values
  parentName?: string
}) => string

type ElemIDPartsCreator = (args: {
  entry: Values
  parentName?: string
}) => string[]

const ID_SEPARATOR = '__'

export const getNameMapping = (
  name: string,
  nameMapping?: NameMappingOptions,
): string => {
  switch (nameMapping) {
    case 'lowercase': return name.toLowerCase()
    case 'uppercase': return name.toUpperCase()
    default: return name
  }
}

// TODON use mapping
// TODON implement here also the usage of the parent (by un-nacl-case-ing first, merging, then nacl-case-ing together)
const computElemIDPartsFunc = (elemIDDef: ElemIDOrSingleton): ElemIDPartsCreator => ({ entry, parentName }) => {
  const parts = (elemIDDef.parts ?? [])
    .filter(part => part.condition === undefined || part.condition(entry))
    .map(part => {
      if (part.custom !== undefined) {
        return part.custom(part)(entry)
      }
      return getNameMapping(String(_.get(entry, part.fieldName) ?? ''), part.mapping)
    })
    .filter(lowerdashValues.isDefined)
    .filter(part => part.length > 0) // TODON decide

  return elemIDDef.extendsParent && parentName !== undefined
    ? [invertNaclCase(parentName), ...parts]
    : parts
}

export const createServiceIDs = ({ entry, serviceIdFields, typeID }: {
  entry: Values
  serviceIdFields: string[]
  typeID: ElemID // TODON adjust to multiple
}): ServiceIds => ({
  ..._.pick(entry, serviceIdFields),
  [OBJECT_SERVICE_ID]: toServiceIdsString({
    [OBJECT_NAME]: typeID.getFullName(),
  }),
})


export const createElemIDFunc = ({
  elemIDDef, getElemIdFunc, serviceIDDef, typeID, defaultName,
}: ElemIDCreatorArgs): ElemIDCreator => args => {
  // if the calculated name is empty ,fallback to the provided default name
  const computedName = naclCase(
    computElemIDPartsFunc(elemIDDef)(args).join(elemIDDef.delimiter ?? ID_SEPARATOR)
    || defaultName
  )
  if (getElemIdFunc && serviceIDDef !== undefined) {
    const { entry } = args
    const { adapter: adapterName } = typeID
    return getElemIdFunc(
      adapterName,
      createServiceIDs({ entry, serviceIdFields: serviceIDDef, typeID }),
      computedName,
    ).name
  }
  return computedName
}

export const getElemPath = ({ def, elemIDCreator, typeID, singleton, nestUnderPath }: {
  def: PathDefinition | undefined
  elemIDCreator: ElemIDCreator
  typeID: ElemID
  singleton?: boolean
  nestUnderPath?: string[]
}): ((entry: Values) => string[]) => entry => {
  const basicPathParts = def?.pathParts
    ?.map(part => computElemIDPartsFunc(part)({ entry }).join(part.delimiter ?? ID_SEPARATOR))
    ?? [elemIDCreator({ entry })]
  const pathParts = basicPathParts.map(naclCase).map(pathNaclCase)

  const { adapter: adapterName, typeName } = typeID
  return (singleton
    ? [
      adapterName,
      RECORDS_PATH,
      SETTINGS_NESTED_PATH,
      ...pathParts,
    ]
    : [
      adapterName,
      RECORDS_PATH,
      // TODON improve
      ...(nestUnderPath?.map(pathNaclCase) ?? [pathNaclCase(typeName)]),
      ...pathParts,
    ])
}
