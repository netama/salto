/*
*                      Copyright 2022 Salto Labs Ltd.
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
import fs from 'fs'
import { Readable, Writable, pipeline } from 'stream'
import { chain } from 'stream-chain'
import { promisify } from 'util'
import { createGunzip, createGzip } from 'zlib'
import { strings } from '@salto-io/lowerdash'
import { rename } from './file'

const pipe = promisify(pipeline)

export const createReadStream = (
  fileName: string,
  encoding?: BufferEncoding,
): Readable => fs.createReadStream(fileName, encoding ?? 'utf8')

// createReadStream.notFoundAsUndefined = notFoundAsUndefined(createReadStream) // TODON check if needed

// TODON choose one, clean

export const createGZipReadStream = (
  zipFilename: string,
  encoding?: BufferEncoding,
): Readable => chain([
  createReadStream(zipFilename, encoding),
  createGunzip(),
])

export const createWriteStream = (
  fileName: string,
  encoding?: BufferEncoding,
): Writable => fs.createWriteStream(fileName, { encoding: encoding ?? 'utf8' })

export const createGZipWriteStream = (
  zipFilename: string,
): Writable => chain([
  createGzip(),
  createWriteStream(zipFilename),
])

export const gzipStream = (
  readStream: Readable,
  writeStream: Writable,
): Readable => chain([
  readStream,
  createGzip(),
  writeStream,
])

export const gunzipStream = (
  readStream: Readable,
  writeStream: Writable,
): Readable => chain([
  readStream,
  createGunzip(),
  writeStream,
])

export const streamReplaceFile = async (
  filename: string,
  contentStream: Readable,
  writeStreamCreator: (fileName: string, encoding?: BufferEncoding) => Writable,
  encoding?: BufferEncoding,
): Promise<void> => {
  const tempFilename = `${filename}.tmp.${strings.insecureRandomString()}`
  await pipe(
    contentStream,
    writeStreamCreator(tempFilename, encoding),
  )
  await rename(tempFilename, filename)
}
