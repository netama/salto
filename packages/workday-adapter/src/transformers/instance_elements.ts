/*
*                      Copyright 2020 Salto Labs Ltd.
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
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import { InstanceElement, ObjectType, Values } from '@salto-io/adapter-api'
import { naclCase, pathNaclCase, transformElement } from '@salto-io/adapter-utils'
import { findFields, fromIDRefDef } from './transformer'
import { WORKDAY_ID_FIELDNAME, WORKDAY, RECORDS_PATH, ALL_IDS_FIELDNAME } from '../constants'
import { APIReferenceIDType } from '../client/types'

const log = logger(module)
const { makeArray } = collections.array

const DATA_TYPE_SUFFIX = '_DataType'
// TODON move to config
const PREFIXES_TO_IGNORE = ['Mapped_', 'Custom_', 'Web_Service_']
// TODON find better solution
const FIELDS_TO_OMIT = ['Effective_Date']

const isWID = (refID: APIReferenceIDType): boolean => (
  refID.attributes['wd:type'] === 'WID'
)

export const getWID = (referenceFieldValue?: { ID: APIReferenceIDType[] }): string | undefined => (
  referenceFieldValue?.ID.find(isWID)?.$value
)

const getIDFromData = (
  entryData: Values,
  instType: ObjectType,
  naclPathTypeName: string,
): string | undefined => {
  // TODON WIP - will be improved
  const prefix = PREFIXES_TO_IGNORE.find(p => naclPathTypeName.startsWith(p))
  const truncatedTypeName = prefix ? naclPathTypeName.slice(prefix.length) : naclPathTypeName

  const typeIdField = [ // TODON use saltoIDSettings on top of this, if can't find?
    'ID',
    `${naclPathTypeName}_ID`,
    'Reference_ID',
    `${naclPathTypeName}_Reference_ID`,
    `${truncatedTypeName}_Reference_ID`,
  ].find(k => Object.keys(instType.fields).includes(k))
  return typeIdField ? entryData[typeIdField] : undefined
}

const getIDFromReference = (refIDs: APIReferenceIDType[]): string | undefined => {
  // parent type will usually be undefined - that's ok
  const sortedIDs = _.sortBy(refIDs, id =>
    `${id.attributes['wd:type']}:${id.attributes['wd:parent_type']}`)
  const idDef = sortedIDs[0]
  if (idDef === undefined) {
    return undefined
  }
  // TODON check assumption about type ambiguity (omitting the type if there's only one non-WID id)
  const baseID = sortedIDs.length === 1 ? idDef.$value : `${idDef.attributes['wd:type']}:${idDef.$value}`
  if (idDef.attributes['wd:parent_id'] !== undefined) {
    // TODON see if can improve by removing the parent type
    return `${baseID}_${idDef.attributes['wd:parent_type']}:${idDef.attributes['wd:parent_id']}`
  }
  return baseID
}

const getInstanceFilename = (
  entryData: Values,
  instType: ObjectType,
  naclPathTypeName: string,
  instanceID?: string,
): string | undefined => {
  // TOODN move these to config (it's just for the filename)
  const typeNameField = [
    'Reference_ID',
    `${naclPathTypeName}_Reference_ID`,
    'Name',
    `${naclPathTypeName}_Name`,
    `${naclPathTypeName}_Reference_Name`,
    `${naclPathTypeName}_ID`,
    `${naclPathTypeName}_Description`,
  ].find(k => Object.keys(instType.fields).includes(k)
    && entryData[k] !== undefined) // TODON can remove this check?
  return (typeNameField
    // avoid too-long filenames (can happen if we use the description)
    ? entryData[typeNameField]?.slice(0, 100)
    : instanceID)
}

export const generateInstancesForType = (
  entries: Values[],
  objType: ObjectType,
): InstanceElement[] => {
  const { dataFieldName, dataFieldType: instType, referenceFieldName } = findFields(objType)
  if (referenceFieldName === undefined) {
    throw new Error(`Could not find reference field in type ${objType.elemID.getFullName()}`)
  }
  const typeName = objType.elemID.name
  const naclTypeName = naclCase(instType.elemID.name).replace(DATA_TYPE_SUFFIX, '')

  return entries.map(entry => {
    const data = makeArray(entry[dataFieldName])[0] // TODON can there be more?
    // TODON avoid fallback to WID if possible
    const allIDs = entry[referenceFieldName] as { ID: APIReferenceIDType[] } // TODON check type
    const wid = getWID(allIDs)
    // TODON avoid fallback to WID if possible, check if can get rid of getting id from data
    const potentialIDs = allIDs?.ID.filter(id => !isWID(id))
    const instanceID = (
      getIDFromReference(potentialIDs)
      ?? getIDFromData(data, instType, naclTypeName)
    )
    if (potentialIDs.length > 1) {
      log.error('found too many potential ids for wid %s type %s, using first: %s', wid, typeName, potentialIDs[0])
    }
    if (potentialIDs.length === 0) {
      log.error('found no potential ids for wid %s type %s, using the wid', wid, typeName)
    }
    // avoid falling back to the WID as the filename for now (everything will be in a shared file)
    const instanceFilename = pathNaclCase(naclCase(
      getInstanceFilename(data, instType, naclTypeName, instanceID)
    ))
    if (wid === undefined) {
      // TODON is this fatal? + add better handling
      log.error(`Could not find WID for ${typeName} ${instanceID} ${instanceFilename}`)
      if (instanceID === undefined) {
        // can't continue if neither is defined
        throw new Error(`Could not find ID for ${typeName} ${instanceFilename}`)
      }
    }

    const instance = new InstanceElement(
      naclCase(instanceID ?? wid), // TODON change default naclcase here to avoid the @ suffix?
      instType,
      // TODON config?
      {
        ..._.omit(data, FIELDS_TO_OMIT),
        [WORKDAY_ID_FIELDNAME]: wid,
        [ALL_IDS_FIELDNAME]: fromIDRefDef(allIDs),
      },
      [WORKDAY, RECORDS_PATH,
        pathNaclCase(naclTypeName), instanceFilename],
    )
    return transformElement({
      element: instance,
      transformFunc: ({ value }) => {
        if ( // TODON move to function, improve checks
          _.isObjectLike(value)
          && _.isEqual(Object.keys(value), ['ID'])
          && Array.isArray(value.ID)
        ) {
          return {
            ID: fromIDRefDef(value),
          }
        }
        if (value instanceof Date) {
          // avoid validation warning for xsd:date caused by node-soap conversion
          return value.toString()
        }
        return value
      },
    })
  })
}
