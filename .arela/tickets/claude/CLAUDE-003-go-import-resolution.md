# CLAUDE-003: Go Import Resolution for Slice Detection

## Context
Slice detection is working but detecting 13 slices (one per file) instead of 4 slices (one per feature) because Go module imports aren't being resolved to actual file paths.

**Current state:**
- ✅ 13 files scanned
- ✅ 9 imports detected
- ❌ 0 imports resolved (all `to_file_id` are NULL)

**Example unresolved imports:**
```
main.go → "zombie-survival/features/authentication" (not resolved)
combat/handlers.go → "zombie-survival/features/survivors" (not resolved)
```

**Why it matters:**
Without resolved imports, the Louvain clustering algorithm can't group files into slices. Each file becomes its own slice.

## Task
Add Go module import resolution to the graph builder so that imports like `zombie-survival/features/authentication` resolve to the actual files in `features/authentication/`.

## Technical Requirements

**1. Understand Go Module Structure:**
- Go modules use the module name from `go.mod` as the base path
- Example: `module zombie-survival` means imports start with `zombie-survival/`
- Package imports map to directory paths: `zombie-survival/features/authentication` → `features/authentication/`

**2. Parse go.mod:**
- Read `go.mod` file to get module name
- Extract module name from `module <name>` line
- Store in memory for import resolution

**3. Resolve Go Imports:**
- When import is `zombie-survival/features/authentication`, strip the module prefix
- Result: `features/authentication`
- Look for files in that directory (any .go file in that package)
- Link to the first file found (Go packages can have multiple files)

**4. Update graph-builder.ts:**
Add Go-specific import resolution logic:
```typescript
function resolveGoImport(
  importPath: string,
  moduleName: string,
  fileMap: Map<string, number>
): number | null {
  // Strip module prefix
  if (importPath.startsWith(moduleName + '/')) {
    const relativePath = importPath.substring(moduleName.length + 1);
    
    // Look for any .go file in that directory
    for (const [filePath, fileId] of fileMap.entries()) {
      if (filePath.startsWith(relativePath + '/') && filePath.endsWith('.go')) {
        return fileId;
      }
    }
  }
  
  return null;
}
```

**5. Integration:**
- Call this in `buildGraph` when processing Go imports
- Only for imports that start with the module name
- External imports (github.com, etc.) should remain unresolved

## Files to Modify

**Primary:**
- `src/ingest/graph-builder.ts` - Add Go import resolution logic

**Supporting:**
- `src/ingest/types.ts` - Add module name to context if needed
- `src/ingest/index.ts` - Parse go.mod and pass module name

## Acceptance Criteria

- [ ] Parse `go.mod` to extract module name
- [ ] Resolve internal Go imports (starting with module name)
- [ ] External imports remain unresolved (correct behavior)
- [ ] Test on zombie game: should detect 4 slices instead of 13
- [ ] Imports table shows resolved `to_file_id` for internal imports

## Expected Output

**Before:**
```
📊 Analyzed 13 files across 0 imports
✨ Detected 13 optimal vertical slices
```

**After:**
```
📊 Analyzed 13 files across 9 imports
✨ Detected 4 optimal vertical slices:
1. 🔐 Authentication (3 files, cohesion: 85%)
2. 💪 Survivors (3 files, cohesion: 82%)
3. ⚔️ Combat (3 files, cohesion: 88%)
4. 📦 Resources (3 files, cohesion: 80%)
```

## Testing

**Test with zombie game:**
```bash
cd /Users/Star/zombie-survival-game
node /Users/Star/arela/dist/cli.js ingest codebase --repo backend --refresh
node /Users/Star/arela/dist/cli.js detect slices backend
```

**Verify in database:**
```sql
-- Should show resolved imports
SELECT f1.path as from_file, f2.path as to_file 
FROM imports i 
JOIN files f1 ON i.from_file_id = f1.id 
JOIN files f2 ON i.to_file_id = f2.id 
WHERE f2.path IS NOT NULL;
```

## Priority
**High** - Blocks proper slice detection for Go codebases

## Estimated Effort
**2-3 hours** - Medium complexity

## Dependencies
- None (can start immediately)

## Notes
- This is Go-specific; Python/TypeScript import resolution already works
- Focus on internal imports only (module-prefixed)
- External imports (github.com, stdlib) should stay unresolved
- Test thoroughly with the zombie game backend
