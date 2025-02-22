/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { createConnection, instanceUrl } from '../../src/client/connection'

describe('client connection', () => {
  describe('createConnection', () => {
    let mockAxiosAdapter: MockAdapter
    beforeEach(() => {
      mockAxiosAdapter = new MockAdapter(axios, { delayResponse: 1, onNoMatch: 'throwException' })
    })

    afterEach(() => {
      mockAxiosAdapter.restore()
    })

    it('should make get requests with correct parameters', async () => {
      const conn = createConnection({ retries: 3 })
      mockAxiosAdapter
        .onGet('/api/v2/account')
        .reply(200, { settings: {} })
        .onGet('/api/v2/a/b')
        .reply(200, { something: 'bla' })
      const apiConn = await conn.login({ username: 'user123', password: 'pwd456', subdomain: 'abc' })
      expect(apiConn.accountInfo).toEqual({ accountId: 'https://abc.zendesk.com' })
      expect(mockAxiosAdapter.history.get.length).toBe(1)

      const getRes = apiConn.get('/api/v2/a/b')
      const res = await getRes
      expect(res.data).toEqual({ something: 'bla' })
      expect(res.status).toEqual(200)
      expect(mockAxiosAdapter.history.get.length).toBe(2)
      expect(mockAxiosAdapter.history.get[0].headers).toMatchObject({
        'X-Zendesk-Marketplace-Name': 'Salto',
        'X-Zendesk-Marketplace-Organization-Id': '5110',
        'X-Zendesk-Marketplace-App-Id': '608042',
      })
    })

    it('should throw when authentication fails', async () => {
      const conn = createConnection({ retries: 3 })
      mockAxiosAdapter.onGet('/api/v2/account').reply(403)
      await expect(() => conn.login({ username: 'user123', password: 'pwd456', subdomain: 'abc' })).rejects.toThrow(
        'Unauthorized - update credentials and try again',
      )
    })
    describe('authParamsFunc', () => {
      let conn: ReturnType<typeof createConnection>
      beforeEach(() => {
        conn = createConnection({ retries: 3 })
      })
      it('should return the correct auth params for username password', async () => {
        mockAxiosAdapter.onGet('/api/v2/account').reply(config => {
          expect(config?.auth).toEqual({ username: 'user123', password: 'pwd456' })
          return [200, { settings: {} }]
        })
        const apiConn = await conn.login({ username: 'user123', password: 'pwd456', subdomain: 'abc' })
        expect(apiConn.accountInfo).toEqual({ accountId: 'https://abc.zendesk.com' })
      })

      it('should return the correct auth params for token', async () => {
        mockAxiosAdapter.onGet('/api/v2/account').reply(config => {
          expect(config?.auth).toEqual({ username: 'user123/token', password: 'token456' })
          return [200, { settings: {} }]
        })
        const apiConn = await conn.login({ username: 'user123', token: 'token456', subdomain: 'abc' })
        expect(apiConn.accountInfo).toEqual({ accountId: 'https://abc.zendesk.com' })
      })

      it('should return the correct auth params for oauth', async () => {
        mockAxiosAdapter.onGet('/api/v2/account').reply(config => {
          expect(config?.headers?.Authorization).toEqual('Bearer token 123')
          return [200, { settings: {} }]
        })
        const apiConn = await conn.login({ accessToken: 'token 123', subdomain: 'abc' })
        expect(apiConn.accountInfo).toEqual({ accountId: 'https://abc.zendesk.com' })
      })
    })
  })

  describe('instanceUrl', () => {
    it('should return the correct url', () => {
      const domain = 'zenzen.org'
      const subdomain = 'zendesk'
      expect(instanceUrl(subdomain, domain)).toEqual('https://zendesk.zenzen.org')
      expect(instanceUrl(subdomain)).toEqual('https://zendesk.zendesk.com')
    })
  })
})
