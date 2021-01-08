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

/* eslint-disable @typescript-eslint/camelcase */

type FieldToExtractConfig = { fieldName: string; nestName?: boolean }

type SchemaOverrideProperties = {
  // addiitonal endpoints that are supported with the same schema
  // TODON check if also need paramters to avoid overlaps!
  getEndpointAdditions: Record<string, string[]>
}

// TODON switch config back to simple include/exclude regexes

// TODON add one variant of this per version (at least on breaking change),
// and verify using the correct one
type VersionCustomizations = {
  // field whose value will be used for the elem id
  defaultNameField: string
  // overrides to the default name field, by type
  nameFieldOverrides: Record<string, string>
  // value to use for the path filename instead of the name field
  pathFieldOverrides: Record<string, string>
  // fields that should be extracted to their own instances, by type
  fieldsToExtract: Record<string, FieldToExtractConfig[]>
  // fields to omit from all types (values only, the fields will still appear on the type)
  primitiveFieldsToOmit: string[]
  // undocumented overrides / additions to the swagger (TODO figure out correct format)
  schemaOverrides: SchemaOverrideProperties
}

export const CUSTOMIZATIONS: VersionCustomizations = {
  defaultNameField: 'name',

  nameFieldOverrides: {
    billing__CustomObjectDefinition: 'type',
    billing__GetHostedPageType: 'pageName',
    billing__SettingItemWithOperationsInformation: 'key',
    // TODO - should be .id for uniqueness, but ugly and not multienv-friendly.
    // ignoring for now and will need to handle grafully
    'billing__workflows___workflow_id___export@uuuu_00123u_00125uu': 'workflow.name',
    billing__GETProductType: 'sku',
  },
  pathFieldOverrides: {
    billing__GETProductType: 'name',
  },

  // TODON do in a filter instead?
  fieldsToExtract: {
    'billing__workflows___workflow_id___export@uuuu_00123u_00125uu': [
      { fieldName: 'workflow' },
      { fieldName: 'tasks', nestName: true },
    ],
  },

  // TODON do in a filter?
  primitiveFieldsToOmit: [
    'createdBy',
    'createdOn',
    'updatedBy',
    'updatedOn',
    'updatedById',
    'UpdatedById',
    'CreatedDate',
    'UpdatedDate',
  ],

  // TODON continue
  schemaOverrides: {
    getEndpointAdditions: {
      billing__GETAllCustomObjectDefinitionsInNamespaceResponse: ['/objects/definitions/com_zuora'],
    },
  },
}
