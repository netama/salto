/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import { ElemID, InstanceElement, ObjectType, toChange, getChangeData } from '@salto-io/adapter-api'
import { client as clientUtils, filterUtils } from '@salto-io/adapter-components'
import { MockInterface } from '@salto-io/test-utils'
import { createDefinitions, getFilterParams, mockClient } from '../utils'
import profileMappingRemovalFilter from '../../src/filters/profile_mapping_removal'
import { OKTA, PROFILE_MAPPING_TYPE_NAME } from '../../src/constants'
import OktaClient from '../../src/client/client'

describe('profileMappingRemovalFilter', () => {
  let mockConnection: MockInterface<clientUtils.APIConnection>
  let client: OktaClient
  type FilterType = filterUtils.FilterWith<'deploy'>
  let filter: FilterType
  const mappingType = new ObjectType({ elemID: new ElemID(OKTA, PROFILE_MAPPING_TYPE_NAME) })
  const mappingInstance = new InstanceElement('mapping', mappingType, {})
  const notFoundError = new clientUtils.HTTPError('message', {
    status: 404,
    data: {},
  })
  const successResponse = { status: 200, data: '' }

  beforeEach(() => {
    jest.clearAllMocks()
    const { client: cli, connection } = mockClient()
    mockConnection = connection
    client = cli
    const definitions = createDefinitions({ client })
    filter = profileMappingRemovalFilter(getFilterParams({ definitions })) as typeof filter
  })

  describe('deploy', () => {
    it('should successfully deploy removal of profile mapping as a verification', async () => {
      mockConnection.get.mockRejectedValue(notFoundError)
      const changes = [toChange({ before: mappingInstance })]
      const result = await filter.deploy(changes)
      const { appliedChanges, errors } = result.deployResult
      expect(errors).toHaveLength(0)
      expect(appliedChanges).toHaveLength(1)
      expect(appliedChanges.map(change => getChangeData(change))[0]).toEqual(mappingInstance)
    })

    it('should fail when the mapping exists', async () => {
      mockConnection.get.mockResolvedValue(successResponse)
      const changes = [toChange({ before: mappingInstance })]
      const result = await filter.deploy(changes)
      const { appliedChanges, errors } = result.deployResult
      expect(errors).toHaveLength(1)
      expect(appliedChanges).toHaveLength(0)
    })

    it('should handle multiple changes', async () => {
      mockConnection.get.mockRejectedValueOnce(notFoundError)
      mockConnection.get.mockResolvedValueOnce(successResponse)
      const changes = [toChange({ before: mappingInstance }), toChange({ before: mappingInstance })]
      const result = await filter.deploy(changes)
      const { appliedChanges, errors } = result.deployResult
      expect(errors).toHaveLength(1)
      expect(appliedChanges).toHaveLength(1)
    })
  })
})
