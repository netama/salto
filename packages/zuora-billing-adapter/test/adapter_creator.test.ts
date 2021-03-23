/*
*                      Copyright 2021 Salto Labs Ltd.
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
import MockAdapter from 'axios-mock-adapter'
import { ObjectType, InstanceElement } from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
import ZuoraAdapter from '../src/adapter'
import { adapter } from '../src/adapter_creator'
// TODON add other auth types
import { usernamePasswordRESTCredentialsType } from '../src/auth'
import { configType } from '../src/config'
import { ZUORA_BILLING } from '../src/constants'
// import * as connection from '../src/client/connection'

describe('adapter creator', () => {
  let mockAxiosAdapter: MockAdapter
  beforeEach(() => {
    mockAxiosAdapter = new MockAdapter(axios, { delayResponse: 1, onNoMatch: 'throwException' })
  })

  afterEach(() => {
    mockAxiosAdapter.restore()
  })

  it('should return a config containing the right parameters', () => {
    const config = adapter.configType as ObjectType
    expect(Object.keys(config?.fields)).toEqual(Object.keys(configType.fields))
  })
  it('should use username+token as the basic auth method', () => {
    expect(Object.keys(adapter.authenticationMethods.basic.credentialsType.fields)).toEqual(
      Object.keys(usernamePasswordRESTCredentialsType.fields)
    )
  })
  it('should return the zuora_billing adapter', () => {
    expect(adapter.operations({
      credentials: new InstanceElement(ZUORA_BILLING,
        adapter.authenticationMethods.basic.credentialsType),
      config: new InstanceElement(
        ZUORA_BILLING,
        adapter.configType as ObjectType,
        {
          fetch: {
            includeTypes: [],
          },
          apiDefinitions: {
            endpoints: {},
          },
        },
      ),
      elementsSource: buildElementsSourceFromElements([]),
    })).toBeInstanceOf(ZuoraAdapter)
  })

  it('should ignore unexpected configuration values', () => {
    expect(adapter.operations({
      credentials: new InstanceElement(ZUORA_BILLING,
        adapter.authenticationMethods.basic.credentialsType),
      config: new InstanceElement(
        ZUORA_BILLING,
        adapter.configType as ObjectType,
        {
          fetch: {
            includeTypes: [],
          },
          apiDefinitions: {
            endpoints: {},
          },
          somethingElse: {},
        },
      ),
      elementsSource: buildElementsSourceFromElements([]),
    })).toBeInstanceOf(ZuoraAdapter)
  })

  // TODON bring back
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should throw error on invalid configuration', () => {
    expect(() => adapter.operations({
      credentials: new InstanceElement(ZUORA_BILLING,
        adapter.authenticationMethods.basic.credentialsType),
      config: new InstanceElement(
        ZUORA_BILLING,
        adapter.configType as ObjectType,
        {
          fetch: {
            includeTypes: [
              'CatalogProduct',
              'CustomObject',
              'StandardObject',
              'AccountingCodes',
              'AccountingPeriods',
              'HostedPages',
              'NotificationDefinitions',
              'NotificationEmailTemplates',
              'PaymentGateways',
              'SequenceSets',
              'ListAllSettings',
              'WorkflowExport',
            ],
          },
          apiDefinitions: {
            swagger: {
              url: '/tmp/zuora/swagger.yaml',
            },
            types: {
              CustomObject: {
                transformation: {
                  dataField: 'definitions',
                  idFields: ['type'],
                },
              },
              // TODON can't completely duplicate with dictionary - add additional validations
              // CustomObject: {
              //   transformation: {
              //     dataField: 'definitions',
              //     idFields: ['type'],
              //   },
              // },
            },
          },
        },
      ),
      elementsSource: buildElementsSourceFromElements([]),
    })).toThrow(new Error('Duplicate endpoint definitions found in apiDefinitions: /workflows'))
  })

  // it('should validate credentials using createConnection', async () => {
  //   jest.spyOn(connection, 'createConnection')
  //   mockAxiosAdapter.onGet('/users/me').reply(200, {
  //     id: 'user123',
  //   })
  //   expect(await adapter.validateCredentials(new InstanceElement(
  //     'config',
  //     usernamePasswordRESTCredentialsType,
  //     { username: 'user123', token: 'token456' },
  //   ))).toEqual('user123')
  //   expect(connection.createConnection).toHaveBeenCalledTimes(1)
  // })
})
