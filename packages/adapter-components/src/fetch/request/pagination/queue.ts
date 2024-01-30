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
import objectHash from 'object-hash'
import { Response, ResponseValue } from '../../../client'
import { ClientRequestArgsNoPath, PaginationFunc } from '../../../definitions/system/requests/pagination' // TODON export correctly
import { HTTPEndpointIdentifier } from '../../../definitions'

export type ClientRequest<TAdditionalArgs extends object = {}> = (
  params: ClientRequestArgsNoPath<TAdditionalArgs>,
) => Promise<Response<ResponseValue | ResponseValue[]>>

export class RequestQueue<TAdditionalArgs extends object = {}> {
  private seenArgs: Set<string>
  private queue: ClientRequestArgsNoPath<TAdditionalArgs>[]
  private activePromises: { promise: Promise<void>; id: string }[]
  private maxConcurrentRequests: number
  private requestPage: ClientRequest<TAdditionalArgs>
  private paginationFunc: PaginationFunc<TAdditionalArgs>
  private endpointIdentifier: HTTPEndpointIdentifier

  // TODON pass in from client config? or just set to some high number?
  // TODON adjust to correct tyle
  constructor({ requestPage, paginationFunc, endpointIdentifier, maxConcurrentRequests = 1000 }: {
    requestPage: ClientRequest<TAdditionalArgs>
    paginationFunc: PaginationFunc<TAdditionalArgs>
    maxConcurrentRequests?: number
    endpointIdentifier: HTTPEndpointIdentifier
  }) {
    this.seenArgs = new Set<string>()
    this.queue = []
    this.activePromises = []
    this.paginationFunc = paginationFunc
    this.requestPage = requestPage
    this.maxConcurrentRequests = maxConcurrentRequests
    this.endpointIdentifier = endpointIdentifier
  }

  enqueue(args: ClientRequestArgsNoPath<TAdditionalArgs>): void {
    const argsKey = objectHash(args)
    if (!this.seenArgs.has(argsKey)) {
      this.seenArgs.add(argsKey)
      this.queue.push(args)
      // try to process immediately if there's capacity
      this.processNext()
    }
  }

  processNext(): void {
    // TODON decide if while is ok
    while (this.queue.length > 0 && this.activePromises.length < this.maxConcurrentRequests) {
      const args = this.queue.shift()
      if (args === undefined) {
        throw new Error('unexpected undefined args') // TODON
      }
      const promise = this.waitForPromise(args) // TODON
      this.activePromises.push({ promise, id: objectHash(args) })
    }
  }

  private async waitForPromise(args: ClientRequestArgsNoPath<TAdditionalArgs>): Promise<void> {
    let promiseID: string
    try {
      promiseID = objectHash(args)
      const pagePromise = this.requestPage(args)
      const page = await pagePromise // TODON
      // TODON
      const nextArgs = this.paginationFunc({
        responseData: page.data,
        responseHeaders: page.headers,
        currentParams: args,
        endpointIdentifier: this.endpointIdentifier,
      })
      // TODON convert to final values (resolve placeholders)? or handled?
      nextArgs.forEach(arg => this.enqueue(arg))
    } catch (e) {
      // TODON logger
      console.error('Error processing args:', args, e) // eslint-disable-line
    } finally {
      // TODON add some identifier instead? by the context hash?
      this.activePromises = this.activePromises.filter(p => p.id !== promiseID)
      this.processNext() // Process the next item in the queue
    }
  }

  // Wait until all active promises are resolved
  async awaitCompletion(): Promise<void> {
    // using a loop since new promises may be added while we wait
    while (this.activePromises.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(this.activePromises.map(({ promise }) => promise))
    }
  }
}
