/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import {
  ObjectType,
  ElemID,
  InstanceElement,
  CORE_ANNOTATIONS,
  ReferenceExpression,
  isInstanceElement,
} from '@salto-io/adapter-api'
import { filterUtils } from '@salto-io/adapter-components'
import { AUTHORIZATION_POLICY_RULE, OKTA } from '../../src/constants'
import authorizationServerPolicyRuleFilter from '../../src/filters/authorization_server_rule'
import { getFilterParams } from '../utils'

describe('authorizationServerPolicyRuleFilter', () => {
  let filter: filterUtils.FilterWith<'onFetch'>
  const authServerType = new ObjectType({ elemID: new ElemID(OKTA, 'AuthorizationServer') })
  const authPolicyType = new ObjectType({ elemID: new ElemID(OKTA, 'AuthorizationServerPolicy') })
  const authRuleType = new ObjectType({ elemID: new ElemID(OKTA, AUTHORIZATION_POLICY_RULE) })

  const authServerInstance = new InstanceElement('server', authServerType, { id: '1', name: 'server' })

  const authPolicyInstance = new InstanceElement('policy', authPolicyType, { id: '2', name: 'policy' }, undefined, {
    [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(authServerInstance.elemID, authServerInstance)],
  })

  const authRuleInstance = new InstanceElement('rule', authRuleType, { id: '3', name: 'rule' }, undefined, {
    [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(authPolicyInstance.elemID, authPolicyInstance)],
  })

  beforeEach(() => {
    filter = authorizationServerPolicyRuleFilter(getFilterParams()) as typeof filter
  })

  describe('OnFetch', () => {
    it('should add authorization server as another parent to auhorization server policy rule instance', async () => {
      const elements = [
        authServerType,
        authPolicyType,
        authRuleType,
        authServerInstance,
        authPolicyInstance,
        authRuleInstance.clone(),
      ]
      await filter.onFetch(elements)
      const rule = elements.filter(isInstanceElement).find(i => i.elemID.typeName === AUTHORIZATION_POLICY_RULE)
      expect(rule?.annotations[CORE_ANNOTATIONS.PARENT]).toHaveLength(2)
      expect((rule?.annotations[CORE_ANNOTATIONS.PARENT][1] as ReferenceExpression).elemID.getFullName()).toEqual(
        'okta.AuthorizationServer.instance.server',
      )
    })
    it('should not add another parent if there was a problem with getting parent', async () => {
      const authPolicyNoParent = new InstanceElement('test', authPolicyType, { id: '4', name: 'policy' })
      const authRuleInstance2 = new InstanceElement('rule', authRuleType, { id: '3', name: 'rule' }, undefined, {
        [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(authPolicyNoParent.elemID, authPolicyNoParent)],
      })
      const elements = [
        authServerType,
        authPolicyType,
        authRuleType,
        authServerInstance,
        authPolicyNoParent,
        authRuleInstance2,
      ]
      await filter.onFetch(elements)
      const rule = elements.filter(isInstanceElement).find(i => i.elemID.typeName === AUTHORIZATION_POLICY_RULE)
      expect(rule?.annotations[CORE_ANNOTATIONS.PARENT]).toHaveLength(1)
      expect((rule?.annotations[CORE_ANNOTATIONS.PARENT][0] as ReferenceExpression).elemID.getFullName()).toEqual(
        'okta.AuthorizationServerPolicy.instance.test',
      )
    })
  })
})
