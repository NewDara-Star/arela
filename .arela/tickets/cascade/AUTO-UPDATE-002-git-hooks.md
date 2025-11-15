# CASCADE-AUTO-UPDATE-002: Create Git Hooks for Memory Refresh

**Agent:** cascade  
**Priority:** high  
**Complexity:** simple  
**Estimated Time:** 2-4 hours

---

## Context

**Why this exists:**
File watcher handles real-time updates, but git operations (commit, branch switch, pull) can change many files at once. We need hooks to trigger full refreshes on these events.

**Current state:**
- No git integration
- Memory not updated on branch switch
- Memory not updated after pull/merge

**Desired state:**
- Auto-refresh on commit (incremental)
- Full refresh on branch switch
- Full refresh after pull/merge

---

## Requirements

### Must Have
- [ ] `post-commit` hook - Incremental update
- [ ] `post-checkout` hook - Full refresh on branch switch
- [ ] `post-merge` hook - Full refresh after merge
- [ ] Install script (`arela install-hook`)
- [ ] Hooks executable and in `.git/hooks/`

### Should Have
- [ ] Skip if no changes to code files
- [ ] Progress output
- [ ] Error handling

---

## Technical Implementation

### Files to Create
```
.arela/hooks/
├── post-commit          # Incremental update
├── post-checkout        # Full refresh
└── post-merge           # Full refresh

src/cli.ts               # Add install-hook command
```

### Hook Scripts

**`.arela/hooks/post-commit`:**
```bash
#!/bin/bash
# Auto-update memory after commit (incremental)

echo "🔄 Updating Arela memory (incremental)..."

# Get changed files in last commit
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No files changed, skipping update"
  exit 0
fi

# Run incremental index
npm run arela -- auto-index --incremental 2>&1 | grep -v "npm WARN"

echo "✅ Memory updated!"
```

**`.arela/hooks/post-checkout`:**
```bash
#!/bin/bash
# Full refresh on branch switch

# Check if this is a branch switch (not file checkout)
if [ "$3" == "1" ]; then
  echo "🔄 Branch changed, refreshing Arela memory..."
  
  # Full refresh
  npm run arela -- index --refresh 2>&1 | grep -v "npm WARN"
  npm run arela -- ingest codebase --refresh 2>&1 | grep -v "npm WARN"
  
  echo "✅ Memory refreshed!"
fi
```

**`.arela/hooks/post-merge`:**
```bash
#!/bin/bash
# Full refresh after merge

echo "🔄 Merge detected, refreshing Arela memory..."

# Full refresh
npm run arela -- index --refresh 2>&1 | grep -v "npm WARN"
npm run arela -- ingest codebase --refresh 2>&1 | grep -v "npm WARN"

echo "✅ Memory refreshed!"
```

### Install Command

**`src/cli.ts`:**
```typescript
program
  .command('install-hook')
  .description('Install git hooks for automatic memory updates')
  .action(async () => {
    const fs = await import('fs-extra');
    const path = await import('path');
    
    const gitDir = path.join(process.cwd(), '.git');
    
    if (!fs.existsSync(gitDir)) {
      console.error('❌ Not a git repository');
      process.exit(1);
    }
    
    const hooksDir = path.join(gitDir, 'hooks');
    const sourceDir = path.join(__dirname, '../.arela/hooks');
    
    // Copy hooks
    const hooks = ['post-commit', 'post-checkout', 'post-merge'];
    
    for (const hook of hooks) {
      const source = path.join(sourceDir, hook);
      const dest = path.join(hooksDir, hook);
      
      if (!fs.existsSync(source)) {
        console.warn(`⚠️  Hook not found: ${hook}`);
        continue;
      }
      
      fs.copyFileSync(source, dest);
      fs.chmodSync(dest, 0o755); // Make executable
      
      console.log(`✅ Installed ${hook}`);
    }
    
    console.log('\n🎉 Git hooks installed!');
    console.log('Memory will auto-update on:');
    console.log('  - Every commit (incremental)');
    console.log('  - Branch switch (full refresh)');
    console.log('  - After merge (full refresh)');
  });
```

---

## Acceptance Criteria

- [ ] `arela install-hook` command works
- [ ] Hooks copied to `.git/hooks/`
- [ ] Hooks are executable
- [ ] `post-commit` triggers incremental update
- [ ] `post-checkout` triggers full refresh on branch switch
- [ ] `post-merge` triggers full refresh
- [ ] Hooks don't break git operations
- [ ] Clear output messages

---

## Test Plan

### Manual Tests
1. Run `arela install-hook`
2. Make a commit → verify incremental update
3. Switch branch → verify full refresh
4. Merge branch → verify full refresh

### Edge Cases
- Empty commit (no files changed)
- File checkout (not branch switch)
- Merge with no changes

---

## Success Metrics

**Performance:**
- Incremental update: < 5 seconds
- Full refresh: < 30 seconds

**Quality:**
- Hooks don't fail git operations
- Clear progress output
- Memory always fresh after git operations

---

## Dependencies

**Internal:**
- `arela auto-index --incremental` (must exist)
- `arela index --refresh` (exists)
- `arela ingest codebase --refresh` (exists)

---

## Notes

**Important:**
- Hooks must be fast (don't block git)
- Use `--incremental` for commits (faster)
- Use full refresh for branch switch (safer)
- Suppress npm warnings in output

**Related:**
- AUTO-UPDATE-001 (file watcher)

---

## Remember

**Git operations can change hundreds of files instantly.**

Hooks ensure memory stays fresh even when file watcher can't keep up.

🚀 **Ship it!**
