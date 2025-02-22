/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import _ from 'lodash'
import wu from 'wu'

export class GraphNode<T> {
  // eslint-disable-next-line no-use-before-define
  edges: Map<string, GraphNode<T>>
  value: T
  id: string

  constructor(id: string, value: T) {
    this.value = value
    this.edges = new Map<string, GraphNode<T>>()
    this.id = id
  }

  addEdge(node: GraphNode<T>): void {
    this.edges.set(node.id, node)
  }
}

type DFSParameters<T> = {
  node: GraphNode<T>
  visited: Set<string>
  resultArray?: GraphNode<T>[]
  // optional parameters for cycle detection
  path?: GraphNode<T>[]
  cycle?: GraphNode<T>[]
}

export class Graph<T> {
  nodes: Map<string, GraphNode<T>>

  constructor(nodes: GraphNode<T>[] = []) {
    this.nodes = new Map()
    nodes.forEach(node => this.nodes.set(node.id, node))
  }

  addNodes(nodes: GraphNode<T>[]): void {
    nodes.forEach(node => {
      if (!this.nodes.has(node.id)) {
        this.nodes.set(node.id, node)
      }
    })
  }

  private dfs(dfsParams: DFSParameters<T>): void {
    const { node, visited, resultArray = [], path = [], cycle = [] } = dfsParams
    if (visited.has(node.id)) {
      const cycleStartIndex = path.findIndex(nodeInPath => nodeInPath.id === node.id)
      if (cycleStartIndex !== -1) {
        // node is visited & in path mean its a cycle
        cycle.push(...path.slice(cycleStartIndex))
      }
      return
    }
    visited.add(node.id)
    node.edges.forEach(dependency => {
      this.dfs({ node: dependency, visited, resultArray, path: path.concat(node), cycle })
    })
    resultArray.push(node)
  }

  getTopologicalOrder(): GraphNode<T>[] {
    const visited = new Set<string>()
    const sortedNodes: GraphNode<T>[] = []
    Array.from(this.nodes.values()).forEach(node => {
      this.dfs({ node, visited, resultArray: sortedNodes })
    })
    return sortedNodes.reverse()
  }

  getNodeDependencies(startNode: GraphNode<T>): GraphNode<T>[] {
    if (_.isEmpty(startNode.edges)) {
      return [startNode]
    }
    const visited = new Set<string>()
    const dependencies: GraphNode<T>[] = []
    this.dfs({ node: startNode, visited, resultArray: dependencies })
    return dependencies
  }

  getNode(id: string): GraphNode<T> | undefined {
    return this.nodes.get(id)
  }

  findNodeByField<K extends keyof T>(key: K, value: T[K]): GraphNode<T> | undefined {
    return wu(this.nodes.values()).find(node => _.isEqual(node.value[key], value))
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id)
    if (node) {
      Array.from(this.nodes.values()).forEach(otherNode => {
        otherNode.edges.delete(id)
      })
      this.nodes.delete(id)
    }
  }

  findCycle(): GraphNode<T>[] {
    const visited = new Set<string>()
    const nodesInCycle: GraphNode<T>[] = []

    Array.from(this.nodes.values()).forEach(node => {
      if (!visited.has(node.id)) {
        this.dfs({ node, visited, cycle: nodesInCycle })
      }
    })
    return nodesInCycle
  }
}
