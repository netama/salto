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
import { elements as elementUtils } from '@salto-io/adapter-components'
import { Config } from '@salto-io/generic-adapter'

export const DEFAULT_CONFIG: Config = {
  fetch: {
    ...elementUtils.query.INCLUDE_ALL_CONFIG,
    hideTypes: false,
  },
  apiComponents: {
    sources: {},
    definitions: {
      supportedTypes: {},
      typeDefaults: {
        transformation: {
          idFields: ['id'],
        },
      },
      types: {},
    },
  },
  client: { // TODON switch to multiple clients
    auth: {
      type: 'custom',
      baseURL: 'https://{subdomain}.salto.io',
      headers: {
        Authorization: 'ZZZ {token}',
      },
    },
  },
  references: {
    rules: [],
  },
  credentials: {
    args: [
      {
        name: 'subdomain',
        type: 'string',
        message: 'The subdomin to use when making HTTP requests to the service, e.g.: \'https://<subdomain>.my-domain.com\'',
      },
      {
        name: 'token',
        type: 'string',
      },
    ],
  },
}
