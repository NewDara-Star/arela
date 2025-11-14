# CASCADE-002: Add Directory-Based Implicit Edges for Slice Detection

## Context
After implementing Go import resolution (CLAUDE-003), we now have 5 resolved imports between files. However, slice detection still shows 13 slices instead of 4 because files within the same directory/package aren't connected.

**Current state:**
- ✅ 5 imports resolved (main.go → features, combat → survivors)
- ❌ Files in same directory not grouped (authentication has 3 separate slices)

**Example:**
```
features/authentication/
  ├── handlers.go  (slice 1)
  ├── models.go    (slice 2)
  └── routes.go    (slice 3)
```

These should be **one slice**, not three!

## Root Cause
The Louvain clustering algorithm only considers **explicit edges** (imports). Files in the same Go package (directory) don't import each other directly, but they're tightly coupled by definition.

**Go package semantics:**
- All `.go` files in a directory are part of the same package
- They share the same namespace
- They can access each other's unexported symbols
- They're compiled together as a unit

## Solution
Add **implicit edges** between files in the same directory during graph loading. This reflects the real-world coupling that exists in package-based languages (Go, Python, etc.).

## Implementation

### Option 1: Enhance Graph Loader (Recommended)
Modify `src/detect/graph-loader.ts` to add directory-based edges:

```typescript
// After loading explicit import edges, add implicit directory edges
const directoryGroups = new Map<string, number[]>();

// Group files by directory
for (const node of nodes) {
  const dir = path.dirname(node.path);
  if (!directoryGroups.has(dir)) {
    directoryGroups.set(dir, []);
  }
  directoryGroups.get(dir)!.push(node.id);
}

// Add edges between files in the same directory
for (const [dir, fileIds] of directoryGroups.entries()) {
  if (fileIds.length > 1) {
    // Create edges between all files in the directory
    for (let i = 0; i < fileIds.length; i++) {
      for (let j = i + 1; j < fileIds.length; j++) {
        edges.push({
          from: fileIds[i],
          to: fileIds[j],
          weight: 0.5, // Lower weight than explicit imports
        });
        
        // Update degrees
        const fromNode = nodeMap.get(fileIds[i]);
        const toNode = nodeMap.get(fileIds[j]);
        if (fromNode && toNode) {
          fromNode.degree += 0.5;
          toNode.degree += 0.5;
        }
      }
    }
  }
}
```

### Option 2: Post-Processing in detectSlices
Add a preprocessing step before Louvain clustering that adds directory edges.

## Expected Results

**Before:**
```
📊 Analyzed 13 files across 5 imports
✨ Detected 13 optimal vertical slices
```

**After:**
```
📊 Analyzed 13 files across 17 imports (5 explicit + 12 implicit)
✨ Detected 5 optimal vertical slices:
1. 🏠 Main (1 file, cohesion: 80%)
   - main.go

2. 🔐 Authentication (3 files, cohesion: 95%)
   - features/authentication/handlers.go
   - features/authentication/models.go
   - features/authentication/routes.go

3. 💪 Survivors (3 files, cohesion: 92%)
   - features/survivors/handlers.go
   - features/survivors/models.go
   - features/survivors/routes.go

4. ⚔️ Combat (3 files, cohesion: 88%)
   - features/combat/handlers.go
   - features/combat/models.go
   - features/combat/routes.go

5. 📦 Resources (3 files, cohesion: 90%)
   - features/resources/handlers.go
   - features/resources/models.go
   - features/resources/routes.go
```

## Files to Modify
- `src/detect/graph-loader.ts` - Add directory-based edge creation

## Acceptance Criteria
- [ ] Files in same directory are connected with implicit edges
- [ ] Implicit edges have lower weight (0.5) than explicit imports (1.0)
- [ ] Zombie game detects 5 slices (main + 4 features)
- [ ] Each feature slice contains all 3 files (handlers, models, routes)
- [ ] Cohesion scores are high (>80%)

## Testing
```bash
cd /Users/Star/zombie-survival-game
node /Users/Star/arela/dist/cli.js detect slices backend
```

**Expected output:**
- 5 slices detected
- Authentication, Survivors, Combat, Resources each have 3 files
- Main has 1 file

## Priority
**Critical** - This completes #2 (Slice Detection Improvements)

## Estimated Effort
**1 hour** - Simple enhancement to graph loader

## Notes
- This pattern applies to all package-based languages (Go, Python, Java, etc.)
- Weight of 0.5 ensures directory edges are weaker than explicit imports
- This reflects real-world coupling in package-based architectures
