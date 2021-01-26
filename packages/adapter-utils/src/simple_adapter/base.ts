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
import {
  FetchResult, AdapterOperations, DeployResult, Element,
} from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { logDuration } from '../decorators'
import { Filter } from '../filter_runner'

const log = logger(module)

export abstract class SimpleFetchBaseAdapter implements AdapterOperations {
  protected abstract get clientName(): string
  protected abstract get filterRunner(): Required<Filter>

  protected abstract async getElements(): Promise<Element[]>

  /**
   * Fetch configuration elements in the given account.
   * Account credentials were given in the constructor.
   */
  @logDuration('fetching account configuration')
  async fetch(): Promise<FetchResult> {
    // TODON also move to shared code and make getElements customizable
    log.debug('going to fetch %s account configuration...', this.clientName)
    const elements = await this.getElements()

    log.debug('going to run filters on %d fetched elements for %s', elements.length, this.clientName)
    await this.filterRunner.onFetch(elements)
    return { elements }
  }

  /**
   * Deploy configuration elements to the given account.
   */
  @logDuration('deploying account configuration')
  async deploy(): Promise<DeployResult> {
    throw new Error(`Deploy is not supported for ${this.clientName}.`)
  }
}
