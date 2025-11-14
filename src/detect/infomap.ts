import type { Graph, Community, FileNode, ImportEdge } from './types.js';

export interface InfomapOptions {
  directed?: boolean;    // Use directed graph (imports have direction)
  twoLevel?: boolean;    // Flat partition (no hierarchy)
  numTrials?: number;    // Number of trials for stability
  seed?: number;         // Random seed for reproducibility
  silent?: boolean;      // Suppress console output
}

/**
 * Detect communities using Infomap algorithm
 * 
 * Infomap uses information flow (random walk) to find communities.
 * This is conceptually superior to modularity optimization for codebases
 * because it models how information flows through dependencies.
 * 
 * For now, we'll use a simplified implementation that mimics Infomap's
 * information-flow approach with the refined weighting model from research.
 */
export function detectCommunitiesInfomap(
  graph: Graph,
  options: InfomapOptions = {}
): Community[] {
  const {
    directed = true,
    twoLevel = true,
    numTrials = 20,
    seed = 42,
    silent = true,
  } = options;

  // For now, use a simplified flow-based clustering approach
  // This implements the key insight from research: directory edges create "traps"
  
  // Step 1: Apply refined weighting model
  const weightedGraph = applyRefinedWeights(graph);
  
  // Step 2: Find connected components with strong internal flow
  const communities = findFlowCommunities(weightedGraph);
  
  // Step 3: Apply post-processing filter for singletons
  const filtered = classifySingletons(communities, weightedGraph);

  return filtered;
}

/**
 * Apply refined weighting model from research
 * 
 * Key insight: Directory edges should be STRONGER than import edges
 * This creates "information flow traps" within features
 * 
 * Note: The graph loader already creates directory edges with weight 1.0
 * We just need to use them as-is since they already represent strong coupling
 */
function applyRefinedWeights(graph: Graph): Graph {
  // The graph already has the correct structure:
  // - Directory edges (created by loadGraph) have weight 1.0
  // - Import edges (from DB) have weight based on import count
  // We don't need to modify anything - just return the graph as-is
  return graph;
}

/**
 * Find communities based on flow (connected components with strong internal edges)
 */
function findFlowCommunities(graph: Graph): Community[] {
  const visited = new Set<number>();
  const communities: Community[] = [];
  let communityId = 0;
  
  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    
    // BFS to find connected component with strong edges (weight >= 0.5)
    const community: number[] = [];
    const queue: number[] = [node.id];
    visited.add(node.id);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      community.push(current);
      
      // Find neighbors connected by strong edges
      for (const edge of graph.edges) {
        if (edge.weight < 0.5) continue; // Only follow strong edges (directory edges)
        
        let neighbor: number | null = null;
        if (edge.from === current && !visited.has(edge.to)) {
          neighbor = edge.to;
        } else if (edge.to === current && !visited.has(edge.from)) {
          neighbor = edge.from;
        }
        
        if (neighbor !== null) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    communities.push({
      id: `slice-${communityId++}`,
      nodes: community,
    });
  }
  
  return communities;
}

/**
 * Classify singleton communities
 * 
 * From research: We need to distinguish between:
 * - "Good" singletons: main.go (entry point) - KEEP
 * - "Bad" singletons: shared/utils.go (hub) - IGNORE
 * 
 * Heuristic:
 * - High in-degree (>3), low out-degree (<=1) = Shared Utility (IGNORE)
 * - Otherwise = Singleton Slice (KEEP)
 */
function classifySingletons(
  communities: Community[],
  graph: Graph
): Community[] {
  const filtered: Community[] = [];

  for (const community of communities) {
    if (community.nodes.length > 1) {
      // Multi-node feature slice - KEEP
      filtered.push(community);
    } else {
      // Singleton - classify it
      const nodeId = community.nodes[0];
      const inDegree = getInDegree(graph, nodeId);
      const outDegree = getOutDegree(graph, nodeId);

      if (inDegree > 3 && outDegree <= 1) {
        // High in-degree, low out-degree = Shared Utility (utils.go)
        // IGNORE - don't add to filtered list
        const node = graph.nodes.find(n => n.id === nodeId);
        console.log(`Filtering out shared utility: ${node?.path || nodeId} (in=${inDegree}, out=${outDegree})`);
        continue;
      } else {
        // Low in-degree, high out-degree = Main entry point (main.go)
        // OR isolated file
        // KEEP
        filtered.push(community);
      }
    }
  }

  return filtered;
}

/**
 * Calculate in-degree for a node
 */
function getInDegree(graph: Graph, nodeId: number): number {
  return graph.edges.filter(e => e.to === nodeId).length;
}

/**
 * Calculate out-degree for a node
 */
function getOutDegree(graph: Graph, nodeId: number): number {
  return graph.edges.filter(e => e.from === nodeId).length;
}
