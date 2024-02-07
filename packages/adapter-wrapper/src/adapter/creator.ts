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
import { ActionName, AdapterOperations } from '@salto-io/adapter-api'
import { definitions } from '@salto-io/adapter-components'
import { AdapterImplConstructor, AdapterParams } from './types'
import { AdapterImpl } from './adapter'

export const createAdapterImpl = <
  Credentials,
  Co extends definitions.UserConfig = definitions.UserConfig,
  ClientOptions extends string = 'main',
  PaginationOptions extends string | 'none' = 'none',
  Action extends string = ActionName,
  P extends AdapterParams<Credentials, Co, ClientOptions, PaginationOptions, Action> = AdapterParams<
    Credentials,
    Co,
    ClientOptions,
    PaginationOptions,
    Action
  >,
>(
  args: P,
  ctor: AdapterImplConstructor<Credentials, Co, ClientOptions, PaginationOptions, Action> = AdapterImpl,
): AdapterOperations =>
  // eslint-disable-next-line new-cap
  new ctor(args)
