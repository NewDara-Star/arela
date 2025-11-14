# CASCADE-007: Fix Import Detection in Import Updater

**Agent:** cascade  
**Priority:** high  
**Complexity:** medium  
**Estimated Time:** 30 minutes

---

## Context

Import updater reports "0 imports updated" even when files were moved and imports need updating.

**Current output:**
```
🔗 Updating imports...
✅ Updated 0 imports
```

**Expected:**
```
🔗 Updating imports...
✅ Updated 47 imports
```

---

## Root Cause

The `planImportUpdates()` method in `src/refactor/import-updater.ts` isn't detecting imports that reference moved files.

Likely issues:
1. File mapping not built correctly
2. Import detection not finding references
3. Path resolution incorrect

---

## Investigation Steps

1. Check `buildFileMapping()` - is it mapping old → new paths?
2. Check `planImportUpdates()` - is it scanning all files?
3. Add debug logging to see what imports are found

---

## Fix

Add logging and fix detection:

```typescript
async planImportUpdates(
  slices: SliceExtractionPlan[],
  cwd: string
): Promise<ImportUpdate[]> {
  const updates: ImportUpdate[] = [];
  
  // Debug: Log file mapping
  console.log(`File mapping has ${this.fileMapping.size} entries`);
  
  // Scan ALL files in codebase, not just moved files
  const allFiles = await this.getAllSourceFiles(cwd);
  
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Find imports that reference moved files
    const imports = this.extractImports(content, file);
    
    for (const imp of imports) {
      const resolvedPath = this.resolveImportPath(imp, file, cwd);
      
      // Check if this import references a moved file
      if (this.fileMapping.has(resolvedPath)) {
        const newPath = this.fileMapping.get(resolvedPath)!;
        updates.push({
          file,
          oldImport: imp,
          newImport: this.calculateNewImport(file, newPath),
          line: this.findImportLine(content, imp)
        });
      }
    }
  }
  
  return updates;
}
```

---

## Acceptance Criteria

- [ ] Import updater detects all imports referencing moved files
- [ ] Reports correct number of imports to update
- [ ] Actually updates the imports
- [ ] Code still compiles after extraction

---

## Files to Modify

- `src/refactor/import-updater.ts` - Fix import detection logic
