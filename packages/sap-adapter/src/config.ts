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
import { config as configUtils, elements } from '@salto-io/adapter-components'
import { Config } from '@salto-io/adapter-creator'

const DEFAULT_ID_FIELDS = ['name']
export const FIELDS_TO_OMIT: configUtils.FieldToOmitType[] = []

export const SUPPORTED_TYPES = {
  MCMService_EnergySourceTypes: ['EnergySourceTypes'],
  MCMService_MeasuringTypes: ['MeasuringTypes'],
  MCMService_MCIRateTypes: ['MCIRateTypes'],
  MCMService_PowerRangeTypes: ['PowerRangeTypes'],
  MCMService_MCMFormulas: ['MCMFormulas'],
  MCMService_GridTypes: ['GridTypes'],
  MCMService_OrdererTypes: ['OrdererTypes'],
}

export const DEFAULT_CONFIG: Config = {
  client: {}, // TODON avoid these as well?
  fetch: {
    ...elements.query.INCLUDE_ALL_CONFIG,
  },
  apiComponents: {
    sources: {
      swagger: [
        {
          url: 'https://raw.githubusercontent.com/salto-io/adapter-swaggers/main/sap/swagger.json',
        },
      ],
    },
    definitions: {
      typeDefaults: {
        transformation: {
          idFields: DEFAULT_ID_FIELDS,
          fieldsToOmit: FIELDS_TO_OMIT,
          nestStandaloneInstances: true,
        },
      },
      types: {
        MCMService_MCMFormulas: {
          transformation: {
            idFields: ['idText'], // TODON maybe reverse - so that we can have idFields: { type1: [], type2: [] } + some way to define the default?
          },
        },
        EnergySourceTypes: {
          request: {
            url: '/EnergySourceTypes?$expand=texts,localized',
          },
        },
        GridTypes: {
          request: {
            url: '/GridTypes?$expand=texts,localized',
          },
        },
        OrdererTypes: {
          request: {
            url: '/OrdererTypes?$expand=texts,localized',
          },
        },
        MCMService_EnergySourceTypes: {
          transformation: {
            standaloneFields: [{ fieldName: 'texts' }],
          },
        },
        MCMService_GridTypes: {
          transformation: {
            standaloneFields: [{ fieldName: 'texts' }],
          },
        },
        MCMService_OrdererTypes: {
          transformation: {
            standaloneFields: [{ fieldName: 'texts' }],
          },
        },
        MCMService_EnergySourceTypes_texts: {
          transformation: {
            idFields: ['locale'],
          },
        },
        MCMService_GridTypes_texts: {
          transformation: {
            idFields: ['locale'],
          },
        },
        MCMService_OrdererTypes_texts: {
          transformation: {
            idFields: ['locale'],
          },
        },
      },
      supportedTypes: SUPPORTED_TYPES,
    },
  },
}
