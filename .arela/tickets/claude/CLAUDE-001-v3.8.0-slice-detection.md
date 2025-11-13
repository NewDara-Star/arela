# CLAUDE-001: Autonomous Slice Boundary Detection

## Priority
🔴 CRITICAL

## Complexity
High (4-5 hours)

## Phase
Phase 2 - Intelligence (v3.8.0)

## Description
Build an autonomous slice boundary detection system that uses graph clustering algorithms (Louvain) to identify optimal vertical slice boundaries in a codebase. This analyzes the Graph DB to find natural feature groupings based on coupling and cohesion patterns.

## Context
This is the first intelligence feature for Arela v4.0.0. It takes the Graph DB from Phase 1 and applies machine learning clustering to automatically detect where vertical slices should be. This is the foundation for autonomous refactoring in Phase 3.

## Acceptance Criteria
- [ ] Implements Louvain algorithm for graph clustering
- [ ] Analyzes Graph DB to find file groupings
- [ ] Calculates cohesion scores for each detected slice
- [ ] Identifies slice boundaries (which files belong together)
- [ ] Suggests slice names based on file patterns
- [ ] Outputs clear, actionable slice recommendations
- [ ] Works with multi-repo projects

## CLI Interface
```bash
# Detect slices in current directory
arela detect slices

# Detect slices in specific repo
arela detect slices --repo /path/to/repo

# Multi-repo slice detection
arela detect slices /path/to/mobile /path/to/backend

# Export to JSON
arela detect slices --json slices.json

# Verbose output
arela detect slices --verbose
```

## Expected Output
```
🔍 Detecting optimal slice boundaries...

📊 Analyzed 247 files across 1,834 imports

✨ Detected 4 optimal vertical slices:

1. 🔐 authentication (23 files, cohesion: 87%)
   - src/auth/login.ts
   - src/auth/signup.ts
   - src/auth/session.ts
   - src/middleware/auth.ts
   - components/LoginScreen.tsx
   - components/SignupScreen.tsx
   ... and 17 more

2. 💪 workout (45 files, cohesion: 82%)
   - src/workout/create.ts
   - src/workout/list.ts
   - components/WorkoutScreen.tsx
   - components/ExerciseCard.tsx
   ... and 41 more

3. 🥗 nutrition (31 files, cohesion: 79%)
   - src/nutrition/meals.ts
   - src/nutrition/tracking.ts
   - components/NutritionScreen.tsx
   ... and 28 more

4. 👥 social (28 files, cohesion: 75%)
   - src/social/feed.ts
   - src/social/friends.ts
   - components/FeedScreen.tsx
   ... and 25 more

💡 Recommendations:
   - Create feature directories: features/authentication/, features/workout/, etc.
   - Move files into their respective slices
   - Extract shared utilities to a common/ directory
   - Define slice boundaries with barrel exports (index.ts)

📋 Next step: arela generate contracts
```

## Technical Implementation

### Algorithm: Louvain Community Detection

The Louvain algorithm is perfect for detecting slices because it:
- Maximizes modularity (high cohesion within, low coupling between)
- Works on weighted graphs (import frequency = edge weight)
- Produces hierarchical communities (slices and sub-slices)
- Fast: O(n log n) complexity

**Steps:**
1. Build weighted graph from Graph DB
   - Nodes = files
   - Edges = imports (weight = import count)
2. Initialize each file as its own community
3. Iteratively optimize modularity:
   - For each file, try moving it to neighbor communities
   - Keep move if it increases modularity
4. Aggregate communities into super-nodes
5. Repeat until modularity stops improving
6. Return final communities as slices

### Files to Create
```
src/detect/
├── index.ts              # Main orchestrator (exports detectSlices)
├── louvain.ts            # Louvain algorithm implementation
├── graph-loader.ts       # Load graph from Graph DB
├── modularity.ts         # Modularity calculation
├── slice-namer.ts        # Suggest slice names from file patterns
├── reporter.ts           # Format and display results
└── types.ts              # TypeScript types
```

### Key Functions

```typescript
// src/detect/index.ts
export async function detectSlices(
  repoPaths: string[],
  options?: DetectOptions
): Promise<SliceReport> {
  // 1. Load graph from Graph DB
  const graph = await loadGraph(repoPaths);
  
  // 2. Run Louvain algorithm
  const communities = louvainClustering(graph);
  
  // 3. Calculate cohesion for each slice
  const slices = communities.map(c => ({
    files: c.nodes,
    cohesion: calculateCohesion(c, graph),
    name: suggestSliceName(c.nodes),
  }));
  
  // 4. Sort by cohesion (best first)
  slices.sort((a, b) => b.cohesion - a.cohesion);
  
  // 5. Generate report
  return {
    slices,
    totalFiles: graph.nodes.length,
    totalImports: graph.edges.length,
    recommendations: generateRecommendations(slices),
  };
}
```

```typescript
// src/detect/louvain.ts
export function louvainClustering(graph: Graph): Community[] {
  // Initialize: each node is its own community
  let communities = graph.nodes.map(n => ({ nodes: [n], id: n.id }));
  let improved = true;
  
  while (improved) {
    improved = false;
    
    // Phase 1: Optimize modularity
    for (const node of graph.nodes) {
      const currentCommunity = findCommunity(node, communities);
      const neighbors = getNeighborCommunities(node, graph, communities);
      
      // Try moving to each neighbor community
      for (const neighbor of neighbors) {
        const deltaQ = modularityGain(node, currentCommunity, neighbor, graph);
        
        if (deltaQ > 0) {
          moveNode(node, currentCommunity, neighbor);
          improved = true;
        }
      }
    }
    
    // Phase 2: Aggregate communities into super-nodes
    if (improved) {
      graph = aggregateGraph(graph, communities);
    }
  }
  
  return communities;
}
```

```typescript
// src/detect/modularity.ts
export function calculateModularity(communities: Community[], graph: Graph): number {
  const m = graph.edges.length; // Total edges
  let Q = 0;
  
  for (const community of communities) {
    // Internal edges within community
    const eIn = countInternalEdges(community, graph);
    
    // Total degree of nodes in community
    const eTot = sumDegrees(community, graph);
    
    Q += (eIn / m) - Math.pow(eTot / (2 * m), 2);
  }
  
  return Q;
}

export function calculateCohesion(community: Community, graph: Graph): number {
  const internal = countInternalEdges(community, graph);
  const external = countExternalEdges(community, graph);
  
  // Cohesion = internal / (internal + external)
  return internal / (internal + external) * 100;
}
```

```typescript
// src/detect/slice-namer.ts
export function suggestSliceName(files: string[]): string {
  // Extract common directory names
  const dirs = files.map(f => path.dirname(f).split('/')[0]);
  const dirCounts = countOccurrences(dirs);
  
  // Most common directory name
  const commonDir = Object.keys(dirCounts).sort((a, b) => 
    dirCounts[b] - dirCounts[a]
  )[0];
  
  // Common patterns
  const patterns = {
    'auth': 'authentication',
    'user': 'user-management',
    'workout': 'workout',
    'nutrition': 'nutrition',
    'social': 'social',
    'payment': 'billing',
    'admin': 'administration',
  };
  
  return patterns[commonDir] || commonDir || 'feature';
}
```

### Graph Schema (from Graph DB)

```typescript
interface Graph {
  nodes: FileNode[];
  edges: ImportEdge[];
}

interface FileNode {
  id: number;
  path: string;
  type: string;
  degree: number; // Number of imports + exports
}

interface ImportEdge {
  from: number; // File ID
  to: number;   // File ID
  weight: number; // Number of imports (default: 1)
}
```

### SQL Queries to Load Graph

```sql
-- Load all files as nodes
SELECT id, path, type FROM files;

-- Load all imports as edges
SELECT from_file_id, to_file_id, COUNT(*) as weight
FROM imports
GROUP BY from_file_id, to_file_id;
```

## Dependencies
- Graph DB from Phase 1 (Feature 6.1)
- No new npm packages needed (pure algorithm implementation)

## Integration Points
- **Input:** Graph DB at `.arela/memory/graph.db`
- **Output:** Slice recommendations (JSON + formatted terminal)
- **Used by:** Phase 3 autonomous refactoring

## Testing Strategy
- Test with Stride repos (known architecture issues)
- Test with Arela repo (already has slices)
- Verify slice cohesion scores are reasonable
- Test multi-repo slice detection
- Validate Louvain algorithm correctness

## Performance Considerations
- Louvain is O(n log n) - fast enough for large codebases
- Cache graph in memory during clustering
- Target: <10 seconds for 1000 files

## Example Usage
```bash
# Detect slices in Stride
arela detect slices /Users/Star/stride-mobile

# Expected output:
# - authentication (23 files, 87% cohesion)
# - workout (45 files, 82% cohesion)
# - nutrition (31 files, 79% cohesion)
# - social (28 files, 75% cohesion)
```

## Notes
- Start with single-repo detection, then add multi-repo
- Use modularity as the optimization metric
- Suggest slice names based on file patterns
- Save results to `.arela/slices.json` for Phase 3

## Related Features
- Depends on: Feature 6.1 (Graph DB)
- Enables: Phase 3 autonomous refactoring
- Enables: Feature 6.2 complete

## Estimated Time
4-5 hours

## Agent Assignment
Claude (Complex algorithm implementation and graph analysis)
