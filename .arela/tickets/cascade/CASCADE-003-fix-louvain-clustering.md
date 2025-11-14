# CASCADE-003: Fix Louvain Clustering Algorithm

## Context
The Louvain community detection algorithm is returning 13 communities (one per node) instead of grouping connected nodes into slices. Despite having:
- 13 nodes (files)
- 29 edges (5 explicit imports + 24 directory-based edges)
- Fully connected directory groups (e.g., nodes 2,3,4 are all connected)

The algorithm fails to merge nodes into communities.

## Problem
**Current behavior:**
```
Nodes: 13
Edges: 29
Communities: 13 (one per node) ❌
```

**Expected behavior:**
```
Nodes: 13
Edges: 29
Communities: 5 (main + 4 features) ✅
```

**Graph structure:**
```
Node 1 (main.go) -> [2, 5, 8, 11]
Node 2 (auth/handlers.go) -> [3, 4]  # Fully connected
Node 3 (auth/models.go) -> [2, 4]
Node 4 (auth/routes.go) -> [2, 3]
Node 5 (combat/handlers.go) -> [6, 7]  # Fully connected
Node 6 (combat/models.go) -> [5, 7]
Node 7 (combat/routes.go) -> [5, 6]
... etc
```

## Research Questions (for Gemini)
1. What are common reasons why Louvain fails to merge nodes even when they're strongly connected?
2. Are there known issues with small graphs (< 20 nodes)?
3. Should we use a different modularity calculation for weighted graphs?
4. Are there better community detection algorithms for small, dense graphs?
5. What are the typical hyperparameters that need tuning (resolution, threshold, etc.)?
6. Should we consider using a different algorithm like Label Propagation or Infomap?

## Task
**WAITING FOR RESEARCH:** User will provide Gemini research results.

Once research is available:
1. Analyze the root cause (modularity calculation, threshold, algorithm choice)
2. Implement the fix in `src/detect/louvain.ts`
3. Test with zombie game backend (should detect 5 slices)
4. Add unit tests for small, dense graphs
5. Document the fix and any parameter tuning

## Acceptance Criteria
- [ ] Louvain groups connected nodes into communities
- [ ] Zombie game backend shows 5 slices (not 13)
- [ ] Files in same directory are grouped together
- [ ] Algorithm works for graphs with 10-20 nodes
- [ ] Unit tests added for edge cases
- [ ] Documentation updated with algorithm details

## Files to Modify
- `src/detect/louvain.ts` - Fix algorithm or replace
- `src/detect/louvain.test.ts` - Add tests (create if needed)
- `docs/slice-detection.md` - Document algorithm choice

## Testing
```bash
# Build and test
cd /Users/Star/arela
npm run build

# Test with zombie game
cd /Users/Star/zombie-survival-game
node /Users/Star/arela/dist/cli.js detect slices backend

# Expected output:
# ✨ Detected 5 optimal vertical slices:
# 1. Main (1 file)
# 2. Authentication (3 files)
# 3. Combat (3 files)
# 4. Survivors (3 files)
# 5. Resources (3 files)
```

## Priority
**P0 - CRITICAL BLOCKER**

This blocks all slice-based features:
- Contract generation
- Refactoring automation
- Observability setup
- Architecture tests

## Dependencies
- Waiting for Gemini research results
- CASCADE-002 completed (directory edges added)
- CLAUDE-003 completed (import resolution)

## Notes
The algorithm implementation looks correct (standard Louvain two-phase). The issue is likely:
1. Modularity gain threshold too high (currently 1e-6)
2. Small graph problem (algorithm optimized for large graphs)
3. Need different algorithm (Label Propagation, Infomap)
4. Edge weight normalization issue
