# Auto-Indexing on Milestones

Arela automatically re-indexes your codebase when you hit development milestones - silently and efficiently.

## Overview

Instead of manually running `npx arela index` after every change, Arela watches for milestones and triggers indexing automatically:

- ✅ **1000+ lines added** - Significant code changes
- ✅ **10+ files added** - New features or modules
- ✅ **1 hour elapsed** - Regular refresh
- ✅ **5+ commits** - Active development

**Silent by default** - runs in background without interrupting your flow.

---

## Quick Start

### 1. Install Auto-Index Hook

```bash
npx arela install-auto-index
```

This creates a post-commit hook that checks milestones after every commit.

### 2. Check Status

```bash
npx arela auto-index-status
```

**Output:**
```
📊 Auto-Index Status

Enabled: Yes
Silent: Yes
Last indexed: 11/9/2025, 8:45:32 PM

Triggers:
  lines_added: 750/1000 lines (75%)
  files_added: 3/10 files (30%)
  time_elapsed: 25/60 minutes (42%)
  commits: 2/5 commits (40%)
```

### 3. Manual Trigger

```bash
npx arela check-auto-index
```

Checks if any threshold is met and triggers indexing if needed.

---

## Configuration

Edit `.arela/auto-index.json`:

```json
{
  "enabled": true,
  "silent": true,
  "triggers": [
    {
      "type": "lines_added",
      "threshold": 1000
    },
    {
      "type": "files_added",
      "threshold": 10
    },
    {
      "type": "time_elapsed",
      "threshold": 3600000
    },
    {
      "type": "commits",
      "threshold": 5
    }
  ]
}
```

### Trigger Types

#### 1. Lines Added

Triggers when N+ lines added since last index:

```json
{
  "type": "lines_added",
  "threshold": 1000
}
```

**Use cases:**
- Large refactors
- New features
- Significant changes

**Recommended:** 500-2000 lines

#### 2. Files Added

Triggers when N+ files added since last index:

```json
{
  "type": "files_added",
  "threshold": 10
}
```

**Use cases:**
- New modules
- Component libraries
- Multiple features

**Recommended:** 5-20 files

#### 3. Time Elapsed

Triggers after N milliseconds since last index:

```json
{
  "type": "time_elapsed",
  "threshold": 3600000
}
```

**Common values:**
- 1 hour: `3600000`
- 2 hours: `7200000`
- 1 day: `86400000`

**Recommended:** 1-4 hours for active development

#### 4. Commits

Triggers after N commits since last index:

```json
{
  "type": "commits",
  "threshold": 5
}
```

**Use cases:**
- Active development
- Feature branches
- Regular updates

**Recommended:** 3-10 commits

---

## Silent Mode

### Enabled (Default)

```json
{
  "silent": true
}
```

**Behavior:**
- Runs in background
- No console output
- No interruption
- Perfect for git hooks

### Disabled

```json
{
  "silent": false
}
```

**Behavior:**
- Shows progress
- Displays completion message
- Useful for debugging

---

## How It Works

### 1. Post-Commit Hook

After every commit, Arela checks if any trigger threshold is met:

```bash
git commit -m "Add new feature"
# Hook runs: npx arela check-auto-index
# If threshold met: Silent indexing starts
```

### 2. State Tracking

Arela tracks state in `.arela/.auto-index-state.json`:

```json
{
  "last_index_time": "2025-11-09T20:45:32Z",
  "last_index_commit": "abc123...",
  "lines_since_last_index": 750,
  "files_since_last_index": 3,
  "commits_since_last_index": 2
}
```

### 3. Threshold Check

On each commit:
1. Calculate current metrics
2. Compare to thresholds
3. If any threshold met → trigger indexing
4. Reset counters after indexing

---

## Examples

### Example 1: Active Development

**Scenario:** Building a new feature

```bash
# Initial state
npx arela auto-index-status
# lines_added: 0/1000 (0%)

# Make changes
git add .
git commit -m "Add user auth"
# lines_added: 250/1000 (25%)

git commit -m "Add tests"
# lines_added: 500/1000 (50%)

git commit -m "Add docs"
# lines_added: 750/1000 (75%)

git commit -m "Add validation"
# lines_added: 1050/1000 (105%)
# 🔄 Auto-indexing triggered silently!
# lines_added: 0/1000 (0%) - reset
```

### Example 2: Time-Based

**Scenario:** Long coding session

```bash
# 9:00 AM - Start work
npx arela index
# Last indexed: 9:00 AM

# 10:30 AM - Still coding
git commit -m "Progress"
# time_elapsed: 90/60 minutes (150%)
# 🔄 Auto-indexing triggered!
# Last indexed: 10:30 AM
```

### Example 3: Multiple Triggers

**Scenario:** Any threshold triggers

```bash
# State:
# lines: 800/1000 (80%)
# files: 8/10 (80%)
# time: 50/60 min (83%)
# commits: 4/5 (80%)

# One more commit...
git commit -m "Final touches"

# Now:
# commits: 5/5 (100%) ← TRIGGERED!
# 🔄 Auto-indexing triggered!
# All counters reset
```

---

## Best Practices

### 1. Tune Thresholds for Your Workflow

**Fast-paced development:**
```json
{
  "lines_added": 500,
  "commits": 3,
  "time_elapsed": 1800000
}
```

**Slower development:**
```json
{
  "lines_added": 2000,
  "commits": 10,
  "time_elapsed": 7200000
}
```

### 2. Keep Silent Mode On

```json
{
  "silent": true
}
```

Don't interrupt your flow. Let indexing happen in the background.

### 3. Monitor Status Periodically

```bash
npx arela auto-index-status
```

Check if thresholds are appropriate for your pace.

### 4. Adjust Based on Project Size

**Small project (<10K lines):**
- Lower thresholds (500 lines, 5 files)

**Large project (>100K lines):**
- Higher thresholds (2000 lines, 20 files)

---

## Troubleshooting

### Issue: Indexing too frequent

**Solution:** Increase thresholds

```json
{
  "lines_added": 2000,
  "commits": 10
}
```

### Issue: Indexing not triggering

**Solution:** Check status

```bash
npx arela auto-index-status
```

Verify thresholds and current counts.

### Issue: Hook not running

**Solution:** Reinstall hook

```bash
npx arela install-auto-index
chmod +x .husky/post-commit
```

### Issue: Want to disable

**Solution:** Set enabled to false

```json
{
  "enabled": false
}
```

Or remove the hook:
```bash
rm .husky/post-commit
```

---

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Check auto-index
  run: npx arela check-auto-index
```

### Pre-Push Hook

```bash
#!/bin/sh
# .husky/pre-push

npx arela check-auto-index
```

---

## Performance

**Indexing time:** ~10-30 seconds (depends on codebase size)

**Impact:**
- Silent mode: Zero interruption
- Runs after commit (async)
- No blocking operations

**Resource usage:**
- CPU: Low (background process)
- Memory: ~100MB
- Disk: Minimal (index updates)

---

## FAQ

**Q: Does this slow down commits?**  
A: No! The hook runs async after commit completes.

**Q: Can I disable for specific branches?**  
A: Yes, edit the hook to check branch:
```bash
if [ "$(git branch --show-current)" = "main" ]; then
  npx arela check-auto-index
fi
```

**Q: What if indexing fails?**  
A: Silent mode swallows errors. Check logs in `.arela/logs/`.

**Q: Can I force index manually?**  
A: Yes: `npx arela index`

**Q: Does this work without git?**  
A: Partially. Time-based triggers work, but commit/line/file triggers need git.

---

## Commands Reference

```bash
# Install hook
npx arela install-auto-index

# Check status
npx arela auto-index-status

# Manual trigger check
npx arela check-auto-index

# Force index (bypass thresholds)
npx arela index
```

---

**Set it and forget it. Your codebase stays indexed automatically.** 🔄
