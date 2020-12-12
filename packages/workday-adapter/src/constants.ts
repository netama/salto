/*
*                      Copyright 2020 Salto Labs Ltd.
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

export const WORKDAY = 'workday'
export const GET_API_PREFIX = 'Get_'
export const PUT_API_PREFIX = 'Put_'

// type annotations
export const REQUEST_FOR_PUT_ENDPOINT_ANNOTATION = 'RequestForPutEndpoint'
export const PUT_REQUEST_SCHEMA_ANNOTATION = 'PutRequest'

export const WORKDAY_ID_FIELDNAME = 'WID'

// NACL files path
export const RECORDS_PATH = 'Records'
export const OBJECTS_PATH = 'Objects'
export const TYPES_PATH = 'Types'
export const ENDPOINTS_PATH = 'Endpoints'
export const SUBTYPES_PATH = 'Subtypes'

// Limits
export const RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS = -1
export const DEFAULT_MAX_CONCURRENT_API_REQUESTS = {
  total: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
  get: 10,
  put: 3,
}
