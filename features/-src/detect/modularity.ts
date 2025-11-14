/**
 * Modularity calculations for slice cohesion
 */

import type { Graph, Community } from "./types.js";

/**
 * Calculate cohesion score for a community (0-100)
 * Cohesion = internal edges / (internal edges + external edges) * 100
 */
export function calculateCohesion(community: Community, graph: Graph): number {
  const internal = countInternalEdges(community, graph);
  const external = countExternalEdges(community, graph);
  const total = internal + external;

  if (total === 0) {
    return 100; // Isolated community
  }

  return (internal / total) * 100;
}

/**
 * Calculate overall modularity of the clustering
 */
export function calculateModularityScore(communities: Community[], graph: Graph): number {
  const m = graph.edges.length;
  if (m === 0) return 0;

  let Q = 0;

  for (const community of communities) {
    if (community.nodes.length === 0) continue;

    const eIn = countInternalEdges(community, graph);
    const degree = getTotalDegree(community, graph);

    Q += eIn / m - Math.pow(degree / (2 * m), 2);
  }

  return Q;
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
 * Get total degree of nodes in a community
 */
function getTotalDegree(community: Community, graph: Graph): number {
  let totalDegree = 0;

  for (const nodeId of community.nodes) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      totalDegree += node.degree;
    }
  }

  return totalDegree;
}

/**
 * Calculate coupling between two communities
 */
export function calculateCoupling(
  comm1: Community,
  comm2: Community,
  graph: Graph
): number {
  const set1 = new Set(comm1.nodes);
  const set2 = new Set(comm2.nodes);
  let edges = 0;

  for (const edge of graph.edges) {
    if ((set1.has(edge.from) && set2.has(edge.to)) ||
        (set1.has(edge.to) && set2.has(edge.from))) {
      edges += edge.weight;
    }
  }

  return edges;
}

/**
 * Calculate average cohesion across all communities
 */
export function calculateAverageCohesion(communities: Community[], graph: Graph): number {
  if (communities.length === 0) return 0;

  const totalCohesion = communities.reduce((sum, comm) => sum + calculateCohesion(comm, graph), 0);
  return totalCohesion / communities.length;
}

/**
 * Get statistics about communities
 */
export function getCommunitiesStats(communities: Community[], graph: Graph) {
  const sizes = communities.map((c) => c.nodes.length);
  const cohesions = communities.map((c) => calculateCohesion(c, graph));

  return {
    count: communities.length,
    avgSize: sizes.reduce((a, b) => a + b, 0) / communities.length,
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    avgCohesion: cohesions.reduce((a, b) => a + b, 0) / communities.length,
    minCohesion: Math.min(...cohesions),
    maxCohesion: Math.max(...cohesions),
    modularity: calculateModularityScore(communities, graph),
  };
}
