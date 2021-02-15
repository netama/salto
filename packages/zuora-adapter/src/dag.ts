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
import { AbstractNodeMap, NodeId } from '@salto-io/dag'

// TODO move to shared location / remove

class NodeMap extends AbstractNodeMap {
  addNode(id: NodeId, dependsOn: Iterable<NodeId> = []): void {
    super.addNodeBase(id, dependsOn)
  }
}

// TODON remove if not using
export const toposort = (nodes: { id: NodeId; dependsOn?: NodeId[] }[]): NodeId[] => {
  const dag = new NodeMap()
  nodes.forEach(({ id, dependsOn }) => dag.addNode(id, dependsOn))
  return [...dag.evaluationOrder()]
}
