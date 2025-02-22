/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { Element, InstanceElement, isInstanceElement, isObjectType } from '@salto-io/adapter-api'
import { elements as elementUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { FilterCreator } from '../filter'
import { FOLDER_TYPE, WORKATO } from '../constants'

const log = logger(module)
const { RECORDS_PATH } = elementUtils

// using a single-word folder name guarantees the id will be unique,
// because all other folder ids include their parent as well as their own name
const ROOT_FOLDER_NAME = 'Root'
const ROOT_FOLDER_PATH = 'Root'

/**
 * Add root folder instance, since it is not returned from the service but can contain resources.
 */
const filterCreator: FilterCreator = () => ({
  name: 'addRootFolderFilter',
  onFetch: async (elements: Element[]): Promise<void> => {
    const folderType = elements.filter(isObjectType).find(e => e.elemID.typeName === FOLDER_TYPE)
    if (folderType === undefined) {
      log.warn('Could not find object type for folder - not adding a root folder instance')
      return
    }
    const folders = elements.filter(isInstanceElement).filter(e => e.elemID.typeName === FOLDER_TYPE)
    const existingIDs = new Set(folders.map(f => f.value.id).filter(val => val !== undefined))
    const parentIDs = new Set(folders.map(f => f.value.parent_id).filter(val => val !== undefined))
    const missingParents = [...parentIDs].filter(id => !existingIDs.has(id))
    if (missingParents.length !== 1) {
      log.warn('Expected one missing parent folder, found %d: %s', missingParents.length, missingParents)
      return
    }
    const rootFolderId = missingParents[0]
    const rootFolderInstance = new InstanceElement(
      ROOT_FOLDER_NAME,
      folderType,
      { id: rootFolderId, name: ROOT_FOLDER_PATH },
      [WORKATO, RECORDS_PATH, FOLDER_TYPE, ROOT_FOLDER_NAME],
    )
    elements.push(rootFolderInstance)
  },
})

export default filterCreator
