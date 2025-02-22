/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { client as clientUtils } from '@salto-io/adapter-components'
import { AccountInfo } from '@salto-io/adapter-api'
import { createConnection, validateCredentials } from '../../src/client/connection'

const mockRefreshToken = jest.fn()
jest.mock('@salto-io/adapter-components', () => {
  const actual = jest.requireActual('@salto-io/adapter-components')
  return {
    ...actual,
    auth: {
      ...actual.auth,
      oauthAccessTokenRefresh: jest.fn((...args) => mockRefreshToken(...args)),
    },
  }
})

describe('validateCredentials', () => {
  let mockAxios: MockAdapter
  let connection: clientUtils.APIConnection

  beforeEach(async () => {
    mockAxios = new MockAdapter(axios)
    mockAxios.onGet('/api/v1/org').reply(200, { id: 'abc123', subdomain: 'my' })
  })
  afterEach(() => {
    mockAxios.restore()
  })

  describe('when autheticating with API token', () => {
    beforeEach(async () => {
      connection = await createConnection({ retries: 1 }).login({ baseUrl: 'http://my.okta.net', token: 'token' })
      mockRefreshToken.mockResolvedValue({
        headers: {
          Authorization: 'Bearer newAccessToken',
        },
      })
    })
    describe('when authorized', () => {
      let result: AccountInfo

      beforeEach(async () => {
        result = await validateCredentials({
          credentials: { baseUrl: 'http://my.okta.net', token: 'token' },
          connection,
        })
      })

      it('should get auth header', () => {
        expect(mockAxios.history.get).toContainEqual(
          expect.objectContaining({
            url: '/api/v1/org',
            baseURL: 'http://my.okta.net',
          }),
        )
        expect(mockAxios.history.get[0].headers).toEqual(
          expect.objectContaining({
            Authorization: 'SSWS token',
          }),
        )
      })

      it('should return the org id from the response as account id', () => {
        expect(result.accountId).toEqual('abc123')
      })
    })

    describe('when unauthorized', () => {
      it('should throw Invalid Credentials Error', async () => {
        mockAxios.onGet('/api/v1/org').reply(401)
        await expect(
          validateCredentials({ credentials: { baseUrl: 'http://my.okta.net', token: 'token' }, connection }),
        ).rejects.toThrow(new Error('Invalid Credentials'))
      })
    })
  })

  describe('when autheticating with oauth', () => {
    beforeEach(async () => {
      connection = await createConnection({ retries: 1 }).login({
        baseUrl: 'http://my.okta.net',
        refreshToken: 'refresh_token',
        clientId: 'client',
        clientSecret: 'secret',
      })
    })

    describe('when authorized', () => {
      let result: AccountInfo

      beforeEach(async () => {
        result = await validateCredentials({
          credentials: {
            baseUrl: 'http://my.okta.net',
            refreshToken: 'refresh_token',
            clientId: 'client',
            clientSecret: 'secret',
          },
          connection,
        })
      })

      it('should get auth header', () => {
        expect(mockAxios.history.get).toContainEqual(
          expect.objectContaining({
            url: '/api/v1/org',
            baseURL: 'http://my.okta.net',
          }),
        )
        expect(mockAxios.history.get[0].headers).toEqual(
          expect.objectContaining({
            Authorization: 'Bearer newAccessToken',
          }),
        )
      })

      it('should return the org id from the response as account id', () => {
        expect(result.accountId).toEqual('abc123')
      })
    })

    describe('when unauthorized', () => {
      it('should throw Invalid Credentials Error', async () => {
        mockAxios.onGet('/api/v1/org').reply(401)
        await expect(
          validateCredentials({ credentials: { baseUrl: 'http://my.okta.net', token: 'token' }, connection }),
        ).rejects.toThrow(new Error('Invalid Credentials'))
      })
    })
  })
})
