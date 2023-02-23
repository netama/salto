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
import { client as clientUtils, fetch as fetchUtils } from '@salto-io/adapter-components'

// TODON remove - no longer needed, keeping for build

const { getWithCursorPagination } = clientUtils

// TODON move?
export const pathChecker: fetchUtils.request.pagination.PathCheckerFunc = (current, next) => (
  next === `${current}.json` || next === `${current}`
)
export const paginate: clientUtils.PaginationFuncCreator = () => (
  getWithCursorPagination(pathChecker, 'next_page') // TODON remove (added the extra arg)
)
