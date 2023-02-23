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
import { ElemID, BuiltinTypes, MapType, ObjectType } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'

const VISIBLE_MESSAGE = 'JSON-stringified visible parameters - for example { "username": "myname" }'
const SECRET_MESSAGE = 'JSON-stringified secret parameters - for example { "password": "mypaS$w0rd" }'

export type GenericJsonCredentials = {
  // TODON validate can parse...
  // TODON add basic-auth, oauth, generic
  secret: Record<string, string>
  visible: Record<string, string>
}

export const createGenericJsonCredentialsType = (
  adapterName: string,
): ObjectType => createMatchingObjectType<GenericJsonCredentials>({
  elemID: new ElemID(adapterName),
  fields: {
    visible: {
      refType: new MapType(BuiltinTypes.STRING),
      annotations: {
        _required: true,
        message: VISIBLE_MESSAGE,
      },
    },
    secret: {
      refType: new MapType(BuiltinTypes.STRING),
      annotations: {
        _required: true,
        message: SECRET_MESSAGE,
      },
    },
  },
})

// TODON also support oauth
export type Credentials = GenericJsonCredentials
