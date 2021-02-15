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
export const ZUORA = 'zuora'
export const ZUORA_BILLING = `${ZUORA}_billing`
export const CUSTOM_OBJECT = 'CustomObject'
export const CUSTOM_FIELD = 'CustomField'
export const ZUORA_CUSTOM_SUFFIX = '__c'

export const OBJECTS_PATH = 'Objects'

// type annotations
// all the GET endpoints that use this as their response schema
export const GET_ENDPOINT_SCHEMA_ANNOTATION = 'getEndpoint'
// the field containing the relevant instance data, when not the entire response
// schema is relevant (such as in list endpoints)
export const GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION = 'dataField'

export const ADDITIONAL_PROPERTIES_FIELD = 'additionalProperties'

// TODON / Note: "success" cannot be included, because it exists in some real response schemas too
// (though it should probably be removed in most cases)
export const PAGINATION_FIELDS = new Set([
  'nextPage',
  'next',
  'pagination',
])

export const TOP_LEVEL_FIELDS = new Set([
  'Id',
  'id',
  'additionalProperties',
])

// Salto annotations
export const API_NAME = 'apiName'
export const METADATA_TYPE = 'metadataType'
export const INSTANCE_ID = 'instanceId'

export const CUSTOM_OBJECT_DEFINITION_TYPE = 'billing__CustomObjectDefinition'
export const BILLING_SETTINGS_OPERATION_INFO_TYPE = 'billing__SettingItemWithOperationsInformation'
