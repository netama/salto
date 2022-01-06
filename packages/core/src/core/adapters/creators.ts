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
import { Adapter } from '@salto-io/adapter-api'
import { adapter as salesforceAdapter } from '@salto-io/salesforce-adapter'
import { adapter as hubspotAdapter } from '@salto-io/hubspot-adapter'
import { adapter as netsuiteAdapter } from '@salto-io/netsuite-adapter'
import { adapter as dummyAdapter } from '@salto-io/dummy-adapter'
import { adapter as workatoAdapter } from '@salto-io/workato-adapter'
import { adapter as zendeskSupportAdapter } from '@salto-io/zendesk-support-adapter'
import { adapter as zuoraBillingAdapter } from '@salto-io/zuora-billing-adapter'
import { adapter as jiraAdapter } from '@salto-io/jira-adapter'
import { adapter as slackAdapter } from '@salto-io/slack-adapter'
import { adapter as stripeAdapter } from '@salto-io/stripe-adapter'

const adapterCreators: Record<string, Adapter> = {
  salesforce: salesforceAdapter,
  hubspot: hubspotAdapter,
  netsuite: netsuiteAdapter,
  workato: workatoAdapter,
  slack: slackAdapter,
  stripe: stripeAdapter,
  // eslint-disable-next-line camelcase
  zuora_billing: zuoraBillingAdapter,
  // eslint-disable-next-line camelcase
  zendesk_support: zendeskSupportAdapter,
  jira: jiraAdapter,
  dummy: dummyAdapter,
}

export default adapterCreators
