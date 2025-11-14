/**
 * Louvain Community Detection Algorithm
 * Maximizes modularity to find optimal communities in weighted graphs
 */

import type { Graph, Community, ImportEdge } from "./types.js";

export interface ModularityInfo {
  modularity: number;
  gainPerNode: Map<number, number>;
}

/**
 * Run the Louvain algorithm to detect communities in a graph
 */
export function louvainClustering(graph: Graph): Community[] {
  // Initialize: each node is its own community
  let communities = initializeCommunities(graph);
  let currentGraph = graph;
  let improved = true;
  let iteration = 0;
  const maxIterations = 100;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    // Phase 1: Optimize modularity locally
    const modularityBefore = calculateModularity(communities, currentGraph);

    for (const node of currentGraph.nodes) {
      const currentCommunity = findCommunityById(node.id, communities);
      if (!currentCommunity) continue;

      const neighbors = getNeighborCommunities(node.id, currentGraph, communities);

      // Try moving node to each neighbor community
      for (const neighbor of neighbors) {
        if (neighbor.id === currentCommunity.id) continue;

        const deltaQ = modularityGain(
          node.id,
          currentCommunity,
          neighbor,
          currentGraph,
          communities
        );

        if (deltaQ > 1e-6) {
          moveNode(node.id, currentCommunity, neighbor);
          improved = true;
        }
      }
    }

    const modularityAfter = calculateModularity(communities, currentGraph);

    // Phase 2: Aggregate communities into super-nodes
    if (improved && modularityAfter > modularityBefore) {
      currentGraph = aggregateGraph(currentGraph, communities);
      communities = initializeCommunities(currentGraph);
    } else {
      improved = false;
    }
  }

  return communities;
}

/**
 * Initialize communities with each node as its own community
 */
function initializeCommunities(graph: Graph): Community[] {
  return graph.nodes.map((node, index) => ({
    nodes: [node.id],
    id: `${index}`,
  }));
}

/**
 * Find community containing a specific node
 */
function findCommunityById(nodeId: number, communities: Community[]): Community | undefined {
  return communities.find((c) => c.nodes.includes(nodeId));
}

/**
 * Get all unique communities connected to a node
 */
function getNeighborCommunities(
  nodeId: number,
  graph: Graph,
  communities: Community[]
): Community[] {
  const neighborCommunities = new Set<string>();

  // Find all neighbors of this node
  const neighbors = new Set<number>();
  for (const edge of graph.edges) {
    if (edge.from === nodeId) {
      neighbors.add(edge.to);
    }
    if (edge.to === nodeId) {
      neighbors.add(edge.from);
    }
  }

  // Get unique communities of neighbors
  for (const neighborId of neighbors) {
    const community = findCommunityById(neighborId, communities);
    if (community) {
      neighborCommunities.add(community.id);
    }
  }

  // Add current community
  const currentCommunity = findCommunityById(nodeId, communities);
  if (currentCommunity) {
    neighborCommunities.add(currentCommunity.id);
  }

  // Return community objects
  return Array.from(neighborCommunities)
    .map((id) => communities.find((c) => c.id === id))
    .filter((c) => c !== undefined) as Community[];
}

/**
 * Calculate modularity gain if node moves from one community to another
 */
function modularityGain(
  nodeId: number,
  fromCommunity: Community,
  toCommunity: Community,
  graph: Graph,
  communities: Community[]
): number {
  const m = graph.edges.length; // Total edges
  if (m === 0) return 0;

  // Count internal edges within each community
  const fromInternalBefore = countInternalEdges(fromCommunity, graph);
  const toInternalBefore = countInternalEdges(toCommunity, graph);

  // Simulate node move
  const tempFromNodes = fromCommunity.nodes.filter((n) => n !== nodeId);
  const tempToNodes = [...toCommunity.nodes, nodeId];

  const fromInternalAfter = tempFromNodes.length > 0 ? countInternalEdgesForNodes(tempFromNodes, graph) : 0;
  const toInternalAfter = countInternalEdgesForNodes(tempToNodes, graph);

  // Degree of nodes in each community
  const nodeDegree = graph.nodes.find((n) => n.id === nodeId)?.degree || 0;
  const fromDegree = tempFromNodes.reduce((sum, id) => sum + (graph.nodes.find((n) => n.id === id)?.degree || 0), 0);
  const toDegree = tempToNodes.reduce((sum, id) => sum + (graph.nodes.find((n) => n.id === id)?.degree || 0), 0);

  // Calculate change in modularity
  const before =
    (fromInternalBefore / m - Math.pow(fromDegree / (2 * m), 2)) +
    (toInternalBefore / m - Math.pow(toDegree / (2 * m), 2));

  const after =
    (tempFromNodes.length > 0 ? (fromInternalAfter / m - Math.pow(fromDegree / (2 * m), 2)) : 0) +
    (toInternalAfter / m - Math.pow((toDegree + nodeDegree) / (2 * m), 2));

  return after - before;
}

/**
 * Move node from one community to another
 */
function moveNode(nodeId: number, fromCommunity: Community, toCommunity: Community): void {
  fromCommunity.nodes = fromCommunity.nodes.filter((n) => n !== nodeId);
  toCommunity.nodes.push(nodeId);
}

/**
 * Count edges within a community
 */
function countInternalEdges(community: Community, graph: Graph): number {
  const nodeSet = new Set(community.nodes);
  let count = 0;

  for (const edge of graph.edges) {
    if (nodeSet.has(edge.from) && nodeSet.has(edge.to)) {
      count += edge.weight;
    }
  }

  return count;
}

/**
 * Count edges within a set of nodes
 */
function countInternalEdgesForNodes(nodeIds: number[], graph: Graph): number {
  const nodeSet = new Set(nodeIds);
  let count = 0;

  for (const edge of graph.edges) {
    if (nodeSet.has(edge.from) && nodeSet.has(edge.to)) {
      count += edge.weight;
    }
  }

  return count;
}

/**
 * Count edges going out of a community
 */
function countExternalEdges(community: Community, graph: Graph): number {
  const nodeSet = new Set(community.nodes);
  let count = 0;

  for (const edge of graph.edges) {
    const fromIn = nodeSet.has(edge.from);
    const toIn = nodeSet.has(edge.to);

    if ((fromIn && !toIn) || (!fromIn && toIn)) {
      count += edge.weight;
    }
  }

  return count;
}

/**
 * Calculate total modularity of the graph
 */
export function calculateModularity(communities: Community[], graph: Graph): number {
  const m = graph.edges.length;
  if (m === 0) return 0;

  let Q = 0;

  for (const community of communities) {
    if (community.nodes.length === 0) continue;

    const eIn = countInternalEdges(community, graph);
    const eTot = community.nodes.reduce((sum, id) => sum + (graph.nodes.find((n) => n.id === id)?.degree || 0), 0);

    Q += eIn / m - Math.pow(eTot / (2 * m), 2);
  }

  return Q;
}

/**
 * Aggregate communities into super-nodes for next iteration
 */
function aggregateGraph(graph: Graph, communities: Community[]): Graph {
  // Map from old node IDs to community IDs
  const nodeToCommId = new Map<number, string>();
  for (const community of communities) {
    for (const nodeId of community.nodes) {
      nodeToCommId.set(nodeId, community.id);
    }
  }

  // Create new nodes for each community
  const newNodes = communities.map((comm, idx) => {
    const degree = comm.nodes.reduce((sum, id) => sum + (graph.nodes.find((n) => n.id === id)?.degree || 0), 0);
    return {
      id: idx,
      path: `community_${comm.id}`,
      type: "community",
      degree,
    };
  });

  // Create new edges between communities
  const edgeMap = new Map<string, number>();
  const communityIndexMap = new Map<string, number>();

  for (let i = 0; i < communities.length; i++) {
    communityIndexMap.set(communities[i].id, i);
  }

  for (const edge of graph.edges) {
    const fromComm = nodeToCommId.get(edge.from);
    const toComm = nodeToCommId.get(edge.to);

    if (fromComm && toComm && fromComm !== toComm) {
      const key = `${Math.min(communityIndexMap.get(fromComm)!, communityIndexMap.get(toComm)!)}_${Math.max(
        communityIndexMap.get(fromComm)!,
        communityIndexMap.get(toComm)!
      )}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + edge.weight);
    }
  }

  const newEdges: ImportEdge[] = [];
  for (const [key, weight] of edgeMap) {
    const [from, to] = key.split("_").map(Number);
    newEdges.push({ from, to, weight });
  }

  return {
    nodes: newNodes,
    edges: newEdges,
  };
}
