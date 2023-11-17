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
import { elements as elementUtils } from '@salto-io/adapter-components'
import { Config } from '@salto-io/generic-adapter'

export const DEFAULT_CONFIG: Config = {
  fetch: {
    ...elementUtils.query.INCLUDE_ALL_CONFIG,
    hideTypes: false,
  },
  apiComponents: {
    sources: {
      swagger: [
        {
          url: 'https://app.launchdarkly.com/api/v2/openapi.json',
        },
      ],
    },
    definitions: {
      supportedTypes: {
        ALL: [
          'RelayAutoConfigCollectionRep',
          'ApplicationCollectionRep',
          'ExtinctionCollectionRep',
          'RepositoryCollectionRep',
          'StatisticsRoot',
          'Destinations',
          'IntegrationDeliveryConfigurationCollection',
          'Members',
          'ClientCollection',
          'Projects',
          'ipList',
          'CustomRoles',
          'TagCollection',
          'Teams',
          'WorkflowTemplatesListingOutputRep',
          'Tokens',
          'SeriesIntervalsRep',
          'SdkListRep',
          'VersionsRep',
          'Webhooks',
        ],
      },
      typeDefaults: {
        request: {
          paginationField: '_links.next.href',
        },
        transformation: {
          idFields: [
            '_id',
          ],
          dataField: 'items',
          serviceIdField: '_id',
          fieldsToOmit: [
            {
              fieldName: '_links',
            },
          ],
          fieldsToHide: [],
        },
      },
      types: {
        RelayAutoConfigCollectionRep: {
          request: {
            url: '/api/v2/account/relay-auto-configs',
          },
        },
        ApplicationCollectionRep: {
          request: {
            url: '/api/v2/applications',
          },
        },
        ApplicationVersionsCollectionRep: {
          request: {
            url: '/api/v2/applications/{applicationKey}/versions',
          },
        },
        Environments: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments',
            recurseInto: [
              {
                type: 'UserSegments',
                toField: 'userSegments',
                context: [
                  {
                    name: 'environmentKey',
                    fromField: 'key',
                  },
                ],
              },
              {
                type: 'UserAttributeNamesRep',
                toField: 'userAttributeNamesRep',
                context: [
                  {
                    name: 'environmentKey',
                    fromField: 'key',
                  },
                ],
              },
              {
                type: 'FeatureFlagStatuses',
                toField: 'featureFlagStatuses',
                context: [
                  {
                    name: 'environmentKey',
                    fromField: 'key',
                  },
                ],
              },
            ],
          },
        },
        Environment: {
          transformation: {
            idFields: [
              'key',
            ],
            fieldTypeOverrides: [
              {
                fieldName: 'userSegments',
                fieldType: 'list<UserSegment>',
              },
              {
                fieldName: 'userAttributeNamesRep',
                fieldType: 'list<UserAttributeNamesRep>',
              },
              {
                fieldName: 'featureFlagStatuses',
                fieldType: 'list<FeatureFlagStatus>',
              },
            ],
            standaloneFields: [
              {
                fieldName: 'userSegments',
              },
              {
                fieldName: 'userAttributeNamesRep',
              },
              {
                fieldName: 'featureFlagStatuses',
              },
            ],
          },
        },
        ExtinctionCollectionRep: {
          request: {
            url: '/api/v2/code-refs/extinctions',
          },
        },
        BranchRep: {
          request: {
            url: '/api/v2/code-refs/repositories/{repo}/branches/{branch}',
          },
        },
        RepositoryRep: {
          request: {
            url: '/api/v2/code-refs/repositories/{repo}',
          },
        },
        RepositoryCollectionRep: {
          request: {
            url: '/api/v2/code-refs/repositories',
          },
        },
        BranchCollectionRep: {
          request: {
            url: '/api/v2/code-refs/repositories/{repo}/branches',
          },
        },
        StatisticsRoot: {
          request: {
            url: '/api/v2/code-refs/statistics',
          },
        },
        StatisticCollectionRep: {
          request: {
            url: '/api/v2/code-refs/statistics/{projectKey}',
          },
        },
        Destination: {
          request: {
            url: '/api/v2/destinations/{projectKey}/{environmentKey}/{id}',
          },
        },
        Destinations: {
          request: {
            url: '/api/v2/destinations',
          },
        },
        FlagLinkCollectionRep: {
          request: {
            url: '/api/v2/flag-links/projects/{projectKey}/flags/{featureFlagKey}',
          },
        },
        FeatureFlagStatusAcrossEnvironments: {
          request: {
            url: '/api/v2/flag-status/{projectKey}/{featureFlagKey}',
          },
        },
        FlagStatusRep: {
          request: {
            url: '/api/v2/flag-statuses/{projectKey}/{environmentKey}/{featureFlagKey}',
          },
        },
        FeatureFlagStatuses: {
          request: {
            url: '/api/v2/flag-statuses/{projectKey}/{environmentKey}',
          },
        },
        FeatureFlag: {
          transformation: {
            idFields: [
              'key',
            ],
            fieldTypeOverrides: [
              {
                fieldName: 'multiEnvironmentDependentFlags',
                fieldType: 'list<MultiEnvironmentDependentFlag>',
              },
            ],
            standaloneFields: [
              {
                fieldName: 'multiEnvironmentDependentFlags',
              },
              {
                fieldName: 'variations',
              },
            ],
          },
        },
        FeatureFlags: {
          request: {
            url: '/api/v2/flags/{projectKey}',
            recurseInto: [
              {
                type: 'MultiEnvironmentDependentFlags',
                toField: 'multiEnvironmentDependentFlags',
                context: [
                  {
                    name: 'featureFlagKey',
                    fromField: 'key',
                  },
                ],
              },
            ],
          },
        },
        MultiEnvironmentDependentFlags: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/dependent-flags',
          },
        },
        ExperimentResults: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/experiments/{environmentKey}/{metricKey}',
          },
        },
        ExpiringTargetGetResponse: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/expiring-targets/{environmentKey}',
          },
        },
        ExpiringUserTargetGetResponse: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/expiring-user-targets/{environmentKey}',
          },
        },
        TriggerWorkflowRep: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/triggers/{environmentKey}/{id}',
          },
        },
        TriggerWorkflowCollectionRep: {
          request: {
            url: '/api/v2/flags/{projectKey}/{featureFlagKey}/triggers/{environmentKey}',
          },
        },
        Release: {
          request: {
            url: '/api/v2/flags/{projectKey}/{flagKey}/release',
          },
        },
        IntegrationDeliveryConfiguration: {
          request: {
            url: '/api/v2/integration-capabilities/featureStore/{projectKey}/{environmentKey}/{integrationKey}/{id}',
          },
        },
        IntegrationDeliveryConfigurationCollection: {
          request: {
            url: '/api/v2/integration-capabilities/featureStore',
          },
        },
        Integration: {
          request: {
            url: '/api/v2/integrations/{integrationKey}/{id}',
          },
        },
        Integrations: {
          request: {
            url: '/api/v2/integrations/{integrationKey}',
          },
        },
        Member: {
          request: {
            url: '/api/v2/members/{id}',
          },
          transformation: {
            idFields: [
              'email',
            ],
          },
        },
        Members: {
          request: {
            url: '/api/v2/members',
          },
        },
        MetricCollectionRep: {
          request: {
            url: '/api/v2/metrics/{projectKey}',
          },
        },
        MetricRep: {
          request: {
            url: '/api/v2/metrics/{projectKey}/{metricKey}',
          },
        },
        Client: {
          request: {
            url: '/api/v2/oauth/clients/{clientId}',
          },
        },
        ClientCollection: {
          request: {
            url: '/api/v2/oauth/clients',
          },
        },
        Projects: {
          request: {
            url: '/api/v2/projects',
            recurseInto: [
              {
                type: 'Environments',
                toField: 'environments',
                context: [
                  {
                    name: 'projectKey',
                    fromField: 'key',
                  },
                ],
              },
              {
                type: 'FeatureFlags',
                toField: 'featureFlags',
                context: [
                  {
                    name: 'projectKey',
                    fromField: 'key',
                  },
                ],
              },
            ],
          },
        },
        Project: {
          request: {
            url: '/api/v2/projects/{projectKey}',
          },
          transformation: {
            idFields: [
              'key',
            ],
            fieldTypeOverrides: [
              {
                fieldName: 'environments',
                fieldType: 'list<Environment>',
              },
              {
                fieldName: 'featureFlags',
                fieldType: 'list<FeatureFlag>',
              },
            ],
            standaloneFields: [
              {
                fieldName: 'environments',
              },
              {
                fieldName: 'featureFlags',
              },
            ],
          },
        },
        ContextKindsCollectionRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/context-kinds',
          },
        },
        ContextAttributeNamesCollection: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/context-attributes',
          },
        },
        ContextAttributeValuesCollection: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/context-attributes/{attributeName}',
          },
        },
        ContextInstances: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/context-instances/{id}',
          },
        },
        Contexts: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/contexts/{kind}/{key}',
          },
        },
        Experiment: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/experiments/{experimentKey}',
          },
        },
        ExperimentCollectionRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/experiments',
          },
        },
        ExperimentBayesianResultsRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/experiments/{experimentKey}/metrics/{metricKey}/results',
          },
        },
        MetricGroupResultsRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/experiments/{experimentKey}/metric-groups/{metricGroupKey}/results',
          },
        },
        FlagFollowersByProjEnvGetRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/environments/{environmentKey}/followers',
          },
        },
        ExperimentationSettingsRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/experimentation-settings',
          },
        },
        flagDefaultsRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/flag-defaults',
          },
        },
        FlagConfigApprovalRequestResponse: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/approval-requests/{id}',
          },
        },
        FlagConfigApprovalRequestsResponse: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/approval-requests',
          },
        },
        FlagFollowersGetRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/followers',
          },
        },
        FeatureFlagScheduledChange: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/scheduled-changes/{id}',
          },
        },
        FeatureFlagScheduledChanges: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/scheduled-changes',
          },
        },
        CustomWorkflowOutput: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/workflows/{workflowId}',
          },
        },
        CustomWorkflowsListingOutput: {
          request: {
            url: '/api/v2/projects/{projectKey}/flags/{featureFlagKey}/environments/{environmentKey}/workflows',
          },
        },
        MetricGroupRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/metric-groups/{metricGroupKey}',
          },
        },
        MetricGroupCollectionRep: {
          request: {
            url: '/api/v2/projects/{projectKey}/metric-groups',
          },
        },
        ReleasePipeline: {
          request: {
            url: '/api/v2/projects/{projectKey}/release-pipelines/{pipelineKey}',
          },
        },
        ReleasePipelineCollection: {
          request: {
            url: '/api/v2/projects/{projectKey}/release-pipelines',
          },
        },
        ipList: {
          request: {
            url: '/api/v2/public-ip-list',
          },
          transformation: {
            isSingleton: true,
          },
        },
        CustomRole: {
          request: {
            url: '/api/v2/roles/{customRoleKey}',
          },
        },
        CustomRoles: {
          request: {
            url: '/api/v2/roles',
          },
        },
        UserSegment: {
          request: {
            url: '/api/v2/segments/{projectKey}/{environmentKey}/{segmentKey}',
          },
        },
        UserSegments: {
          request: {
            url: '/api/v2/segments/{projectKey}/{environmentKey}',
          },
        },
        BigSegmentTarget: {
          request: {
            url: '/api/v2/segments/{projectKey}/{environmentKey}/{segmentKey}/contexts/{contextKey}',
          },
        },
        Export: {
          request: {
            url: '/api/v2/segments/{projectKey}/{environmentKey}/{segmentKey}/exports/{exportID}',
          },
        },
        Import: {
          request: {
            url: '/api/v2/segments/{projectKey}/{environmentKey}/{segmentKey}/imports/{importID}',
          },
        },
        TagCollection: {
          request: {
            url: '/api/v2/tags',
          },
          transformation: {
            isSingleton: true,
            fieldsToOmit: [
              {
                fieldName: '_links',
              },
              {
                fieldName: 'totalCount',
              },
            ],
          },
        },
        TeamCustomRoles: {
          request: {
            url: '/api/v2/teams/{teamKey}/roles',
          },
        },
        TeamMaintainers: {
          request: {
            url: '/api/v2/teams/{teamKey}/maintainers',
          },
        },
        Team: {
          request: {
            url: '/api/v2/teams/{teamKey}',
          },
        },
        Teams: {
          request: {
            url: '/api/v2/teams',
          },
        },
        WorkflowTemplatesListingOutputRep: {
          request: {
            url: '/api/v2/templates',
          },
        },
        Token: {
          request: {
            url: '/api/v2/tokens/{id}',
          },
          transformation: {
            idFields: [
              'name',
              '&memberId',
            ],
            fieldsToOmit: [
              {
                fieldName: '_links',
              },
              {
                fieldName: '_member',
              },
            ],
          },
        },
        Tokens: {
          request: {
            url: '/api/v2/tokens',
          },
        },
        SeriesListRep: {
          request: {
            url: '/api/v2/usage/evaluations/{projectKey}/{environmentKey}/{featureFlagKey}',
          },
        },
        SeriesIntervalsRep: {
          request: {
            url: '/api/v2/usage/experimentation-keys',
          },
          transformation: {
            dataField: '.',
          },
        },
        SdkListRep: {
          request: {
            url: '/api/v2/usage/mau/sdks',
          },
        },
        SdkVersionListRep: {
          request: {
            url: '/api/v2/usage/streams/{source}/sdkversions',
          },
        },
        UserAttributeNamesRep: {
          request: {
            url: '/api/v2/user-attributes/{projectKey}/{environmentKey}',
          },
        },
        VersionsRep: {
          request: {
            url: '/api/v2/versions',
          },
          transformation: {
            isSingleton: true,
          },
        },
        Webhook: {
          transformation: {
            idFields: [
              'name',
            ],
          },
        },
        Webhooks: {
          request: {
            url: '/api/v2/webhooks',
          },
        },
      },
    },
  },
  client: {
    auth: {
      type: 'custom',
      baseURL: 'https://app.launchdarkly.com/',
      headers: {
        Authorization: '{token}',
        'LD-API-Version': 'beta',
      },
    },
  },
  references: {
    rules: [
      {
        src: {
          field: 'maintainerId',
          parentTypes: [
            'FeatureFlag',
          ],
        },
        serializationStrategy: 'id',
        target: {
          type: 'Member',
        },
      },
    ],
  },
  credentials: {
    args: [
      {
        name: 'subdomain',
        type: 'string',
        message: "The subdomin to use when making HTTP requests to the service, e.g.: 'https://<subdomain>.my-domain.com'",
      },
      {
        name: 'token',
        type: 'string',
      },
    ],
  },
}
