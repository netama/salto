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

export const ZENDESK = 'zendesk'

export const baseUrl = (subdomain: string): string => `https://${subdomain}.zendesk.com/api/v2`

export const DEFAULT_NAME_FIELD = 'id'
export const DEFAULT_PATH_FIELD = 'name'
export const FIELDS_TO_OMIT = ['created_at', 'updated_at']
export const PAGINATION_FIELDS = ['count', 'next_page', 'previous_page']
