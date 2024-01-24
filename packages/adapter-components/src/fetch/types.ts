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
import { Values } from '@salto-io/adapter-api'
import { ContextParams, GeneratedItem } from '../definitions/system/shared'

export type ResourceIdentifier = {
  typeName: string
  identifier?: Record<string, string>
}

export type ValueGeneratedItem = GeneratedItem<ContextParams, Values>

export type IdentifiedItem = ValueGeneratedItem & {
  // caller stack - the most recent call is first, and the earliest one is last
  // TODON maybe switch from resource terms to endpoint terms so we can use the args? but need resource info as well
  // callStack: ResourceIdentifier[] // TODON switch to this later
  callerIdentifier: ResourceIdentifier
}

type ResourceFetchResult = {
  success: boolean
  errors?: Error[] // TODON
}

export type TypeResourceFetcher = {
  fetch: (args: {
    availableResources: Record<string, ValueGeneratedItem[] | undefined>
    // eslint-disable-next-line no-use-before-define
    typeFetcherCreator: TypeFetcherCreator
  }) => Promise<ResourceFetchResult>
  done: () => boolean
  getItems: () => ValueGeneratedItem[] | undefined
}

export type TypeFetcherCreator = ({ typeName, context }: {
  typeName: string
  context?: Record<string, unknown>
}) => TypeResourceFetcher

// export type FetchItemGenerator = Generator<IdentifiedItem, { errors?: Record<string, string[]> }>
