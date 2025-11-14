# CASCADE-005: Fix File Path Validation in Slice Extraction

**Agent:** cascade  
**Priority:** high  
**Complexity:** simple  
**Estimated Time:** 30 minutes

---

## Context

Slice extraction is failing with:
```
ENOENT: no such file or directory, lstat '/Users/Star/arela/test-analysis.ts'
```

The issue: `FileMover.planFileMovement()` doesn't validate that source files exist before planning movements.

---

## Root Cause

In `src/refactor/file-mover.ts` line 28:
```typescript
const fullPath = path.join(cwd, filePath);
```

This assumes `filePath` is valid and exists, but slice detection may return:
- Non-existent files
- Incorrect relative paths  
- Files that were deleted

---

## Fix

Add validation in `planFileMovement()`:

```typescript
async planFileMovement(
  slice: Slice,
  cwd: string = process.cwd()
): Promise<FileMovement[]> {
  const movements: FileMovement[] = [];
  const sliceDir = path.join(cwd, "features", this.slugify(slice.name));

  for (const filePath of slice.files) {
    const fullPath = path.join(cwd, filePath);
    
    // ✅ ADD THIS: Validate file exists
    if (!await fs.pathExists(fullPath)) {
      console.warn(`⚠️  Skipping non-existent file: ${filePath}`);
      continue;
    }
    
    // ... rest of logic
  }
  
  return movements;
}
```

---

## Acceptance Criteria

- [ ] Validate files exist before planning movement
- [ ] Warn (don't error) on missing files
- [ ] Skip non-existent files gracefully
- [ ] Test on Arela codebase
- [ ] Extraction completes without ENOENT errors

---

## Test

```bash
cd /Users/Star/arela
node dist/cli.js refactor extract-all-slices --dry-run --verbose
# Should complete without errors
```

---

## Files to Modify

- `src/refactor/file-mover.ts` - Add validation in `planFileMovement()`

---

## Estimated Impact

- **Time to fix:** 10 minutes
- **Risk:** Low (just adds validation)
- **Benefit:** Extraction works on real codebases
