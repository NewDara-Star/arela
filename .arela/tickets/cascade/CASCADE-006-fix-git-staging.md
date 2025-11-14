# CASCADE-006: Fix Git Staging for New Features Directory

**Agent:** cascade  
**Priority:** high  
**Complexity:** simple  
**Estimated Time:** 20 minutes

---

## Context

After slice extraction, the `features/` directory is created but not staged in git.

**Current behavior:**
```bash
git status
# Untracked files:
#   features/
```

**Expected behavior:**
```bash
git status
# Changes to be committed:
#   new file: features/auth/...
#   new file: features/ui/...
```

---

## Root Cause

In `src/refactor/git-manager.ts`, the `stageFiles()` method only stages the destination files, but doesn't stage the parent `features/` directory.

---

## Fix

In `commitSlice()` method, after staging files, also stage the features directory:

```typescript
async commitSlice(
  slice: SliceExtractionPlan,
  stagedFiles: string[],
  cwd: string
): Promise<void> {
  // Stage individual files
  await this.stageFiles(stagedFiles, cwd);
  
  // ✅ ADD THIS: Stage the features directory
  const featuresDir = path.join(cwd, 'features');
  if (await fs.pathExists(featuresDir)) {
    await execa('git', ['add', 'features/'], { cwd });
  }
  
  // ... rest of commit logic
}
```

---

## Acceptance Criteria

- [ ] `features/` directory is staged in git
- [ ] All new files in `features/` are tracked
- [ ] Git commits include new files
- [ ] `git status` shows clean after extraction

---

## Files to Modify

- `src/refactor/git-manager.ts` - Add staging for features directory
