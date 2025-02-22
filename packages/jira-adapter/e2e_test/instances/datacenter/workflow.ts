/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, Values, Element } from '@salto-io/adapter-api'
import { naclCase } from '@salto-io/adapter-utils'
import { createReference } from '../../utils'
import { JIRA, STATUS_TYPE_NAME } from '../../../src/constants'

export const createWorkflowValues = (name: string, allElements: Element[]): Values => ({
  name,
  description: name,
  transitions: {
    [naclCase('Build Broken::From: any status::Global')]: {
      name: 'Build Broken',
      description: '',
      to: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'backlog'), allElements),
      type: 'global',
      rules: {
        postFunctions: [
          {
            type: 'com.atlassian.jira.workflow.function.event.FireIssueEventFunction',
            configuration: {
              event: {
                id: createReference(new ElemID(JIRA, 'IssueEvent', 'instance', 'Issue_Assigned@s'), allElements),
              },
            },
          },
        ],
      },
    },
    [naclCase('loop transition::From: any status::Circular')]: {
      name: 'loop transition',
      description: '',
      type: 'global',
      rules: {
        postFunctions: [
          {
            type: 'com.atlassian.jira.workflow.function.event.FireIssueEventFunction',
            configuration: {
              event: {
                id: createReference(new ElemID(JIRA, 'IssueEvent', 'instance', 'Issue_Assigned@s'), allElements),
              },
            },
          },
        ],
      },
    },
    [naclCase('Create::From: none::Initial')]: {
      name: 'Create',
      description: '',
      to: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'backlog'), allElements),
      type: 'initial',
      from: [
        {
          sourceAngle: 33.45,
          targetAngle: 99.89,
        },
      ],
      rules: {
        validators: [
          {
            type: 'com.atlassian.jira.workflow.validator.PermissionValidator',
            configuration: {
              permissionKey: 'CREATE_ISSUES',
            },
          },
        ],
        postFunctions: [
          {
            type: 'com.atlassian.jira.workflow.function.event.FireIssueEventFunction',
            configuration: {
              event: {
                id: createReference(new ElemID(JIRA, 'IssueEvent', 'instance', 'Issue_Assigned@s'), allElements),
              },
            },
          },
          {
            type: 'com.atlassian.jira.workflow.function.issue.AssignToCurrentUserFunction',
            configuration: {
              'full.module.key': 'com.atlassian.jira.plugin.system.workflowassigntocurrentuser-function',
            },
          },
          {
            type: 'com.atlassian.jira.workflow.function.issue.AssignToLeadFunction',
            configuration: {
              'full.module.key': 'com.atlassian.jira.plugin.system.workflowassigntolead-function',
            },
          },
          {
            type: 'com.atlassian.jira.workflow.function.issue.AssignToReporterFunction',
            configuration: {
              'full.module.key': 'com.atlassian.jira.plugin.system.workflowassigntoreporter-function',
            },
          },
          {
            type: 'com.atlassian.jira.workflow.function.issue.UpdateIssueFieldFunction',
            configuration: {
              fieldId: createReference(new ElemID(JIRA, 'Field', 'instance', 'Assignee__user'), allElements),
              fieldValue: '',
            },
          },
          {
            type: 'com.atlassian.jira.workflow.function.issue.UpdateIssueStatusFunction',
          },
          {
            type: 'com.atlassian.jira.workflow.function.misc.CreateCommentFunction',
          },
        ],
      },
    },
    [naclCase('TransitionToShared::From: Done::Directed')]: {
      name: 'TransitionToShared',
      description: '',
      from: [
        {
          id: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'done'), allElements),
          sourceAngle: 12.45,
          targetAngle: 67.89,
        },
      ],
      to: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'backlog'), allElements),
      type: 'common',
      rules: {
        validators: [
          {
            type: 'com.atlassian.jira.workflow.validator.PermissionValidator',
            configuration: {
              permissionKey: 'MODIFY_REPORTER',
            },
          },
          {
            type: 'com.atlassian.jira.workflow.validator.UserPermissionValidator',
            configuration: {
              nullallowed: 'true',
              permissionKey: 'ADMINISTER_PROJECTS',
              'vars.key': 'aaa',
            },
          },
        ],
        postFunctions: [
          {
            type: 'com.atlassian.jira.workflow.function.event.FireIssueEventFunction',
            configuration: {
              event: {
                id: createReference(new ElemID(JIRA, 'IssueEvent', 'instance', 'Issue_Assigned@s'), allElements),
              },
            },
          },
          {
            type: 'com.onresolve.jira.groovy.GroovyFunctionPlugin',
            configuration: {
              FIELD_SECURITY_LEVEL_ID: createReference(
                new ElemID(JIRA, 'SecurityLevel', 'instance', 'test__test'),
                allElements,
              ),
              FIELD_FUNCTION_ID: '8b6dfd6d-d46a-49ba-9dab-fe2ca70c2911',
              FIELD_NOTES: 'Post17',
              'full.module.key':
                'com.onresolve.jira.groovy.groovyrunnerscriptrunner-workflow-function-com.onresolve.scriptrunner.canned.jira.workflow.postfunctions.SetIssueSecurity',
              'canned-script': 'com.onresolve.scriptrunner.canned.jira.workflow.postfunctions.SetIssueSecurity',
              FIELD_CONDITION: {
                script: 'issue.projectObject.key == XYZ17',
              },
            },
          },
        ],
        conditions: {
          operator: 'AND',
          conditions: [
            {
              type: 'com.atlassian.jira.workflow.condition.AllowOnlyAssignee',
            },
            {
              type: 'com.atlassian.jira.workflow.condition.AllowOnlyReporter',
            },
            {
              type: 'com.atlassian.jira.workflow.condition.AlwaysFalseCondition',
            },
            {
              type: 'com.atlassian.jira.workflow.condition.InProjectRoleCondition',
              configuration: {
                projectRole: {
                  id: createReference(new ElemID(JIRA, 'ProjectRole', 'instance', 'Administrators'), allElements),
                },
              },
            },
            {
              type: 'com.atlassian.jira.workflow.condition.PermissionCondition',
              configuration: {
                permissionKey: 'DELETE_ISSUES',
              },
            },
            {
              type: 'com.atlassian.jira.workflow.condition.SubTaskBlockingCondition',
              configuration: {
                statuses: [
                  {
                    id: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'backlog'), allElements),
                  },
                  {
                    id: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'done'), allElements),
                  },
                ],
              },
            },
            {
              type: 'com.atlassian.servicedesk.plugins.approvals.internal.workflow.BlockInProgressApprovalCondition',
            },
          ],
        },
      },
    },
  },
  statuses: [
    {
      id: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'backlog'), allElements),
      name: 'Backlog',
      properties: [
        {
          key: 'jira.issue.editable',
          value: 'true',
        },
      ],
      location: {
        x: 12.34,
        y: 56.78,
      },
    },
    {
      id: createReference(new ElemID(JIRA, STATUS_TYPE_NAME, 'instance', 'done'), allElements),
      name: 'Done',
      properties: [
        {
          key: 'jira.issue.editable',
          value: 'true',
        },
      ],
      location: {
        x: 67.89,
        y: 20.78,
      },
    },
  ],
  diagramInitialEntry: {
    x: 12.34,
    y: 34.12,
  },
})
