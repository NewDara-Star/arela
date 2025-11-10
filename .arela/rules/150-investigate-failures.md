---
id: arela.investigate_failures
title: Investigate Failures for Root Cause
category: quality
priority: high
---

# Rule 150: Investigate Failures for Root Cause

## Context

When systems report warnings or failures (indexing, builds, tests, deployments), agents must investigate the root cause rather than ignoring them. Silent failures compound into larger issues.

## The Problem

**Common anti-patterns:**
- ⚠️ "Failed to embed chunk" → ignored
- ⚠️ Build warnings → skipped
- ⚠️ Test flakiness → accepted
- ⚠️ Deployment timeouts → retried blindly

**Why this matters:**
- Failures signal deeper architectural issues
- Warnings become errors under load
- Ignored problems block future work
- Silent failures erode system reliability

## The Rule

### 1. Never Ignore Failures

**When you see warnings/failures:**
```
⚠ Failed to embed chunk in packages/tokens/src/index.ts
⚠ Failed to embed chunk in shadcn-reference/apps/v4/components/icons.tsx
```

**You MUST:**
1. **Read the failing file** - Understand what's in it
2. **Identify the pattern** - Why is it failing?
3. **Assess impact** - Does this affect functionality?
4. **Fix or document** - Either resolve or explain why it's safe to ignore

### 2. Investigation Checklist

For each failure, answer:

- [ ] **What failed?** (file, operation, error message)
- [ ] **Why did it fail?** (file size, format, content, permissions)
- [ ] **Is there a pattern?** (multiple similar files failing)
- [ ] **What's the impact?** (functionality broken, search degraded, build slower)
- [ ] **Can we fix it?** (code change, config adjustment, exclusion rule)
- [ ] **Should we fix it?** (cost/benefit, priority, workaround)

### 3. Common Failure Patterns

**RAG Indexing Failures:**
```
⚠ Failed to embed chunk in file.tsx
```

**Investigate:**
- File size (>100KB chunks may fail)
- Special characters (unicode, emojis)
- Binary content (images, fonts)
- Generated code (massive JSON, minified files)

**Solutions:**
- Add to `.gitignore` or `.ragignore`
- Split large files
- Exclude generated directories
- Adjust chunk size

**Build Warnings:**
```
⚠ Unused variable 'foo'
⚠ Deprecated API usage
```

**Investigate:**
- Is it actually unused? (dead code)
- Can we remove it? (breaking change)
- Should we suppress? (false positive)

**Test Failures:**
```
⚠ Test flaky: passes 4/5 times
```

**Investigate:**
- Race condition
- External dependency
- Timing issue
- State pollution

### 4. Document Findings

**If you fix it:**
```markdown
## Fixed: RAG Indexing Failures

**Problem:** 47 files failed to embed due to large JSON files in registry/

**Root Cause:** Generated registry files >500KB with deeply nested structures

**Solution:** Added `registry/directory.json` to `.ragignore`

**Impact:** Indexing now completes without errors, search still works
```

**If you can't/won't fix it:**
```markdown
## Known Issue: Icon Component Indexing

**Problem:** 9 chunks in icons.tsx fail to embed

**Root Cause:** File contains 500+ SVG path strings, chunks exceed token limit

**Decision:** Safe to ignore - icons are visual assets, not searchable logic

**Workaround:** Search for icon usage in other files instead
```

## Examples

### ❌ Bad: Ignoring Failures

```bash
# Agent sees warnings
⚠ Failed to embed 47 chunks

# Agent continues without investigation
"Indexing complete! ✅"
```

**Why bad:**
- Doesn't know what failed
- Doesn't know if it matters
- Can't help user debug later
- Misses systemic issues

### ✅ Good: Investigating Failures

```bash
# Agent sees warnings
⚠ Failed to embed 47 chunks

# Agent investigates
"I see 47 indexing failures. Let me check the files..."

# Reads failing files
- registry/directory.json (500KB, generated)
- icons.tsx (300KB, SVG paths)
- colors/*.json (large color palettes)

# Identifies pattern
"These are all large generated files with repetitive data"

# Proposes solution
"Should I add these to .ragignore? They're not useful for semantic search."
```

### ✅ Good: Pattern Recognition

```typescript
// Agent notices pattern
const failures = [
  'shadcn-reference/apps/v4/components/icons.tsx',
  'shadcn-reference/deprecated/www/components/icons.tsx',
  // ... 9 total
];

// Identifies: All icon files in shadcn-reference
// Root cause: Large SVG strings
// Solution: Exclude shadcn-reference/*/components/icons.tsx
```

## Integration with Learning System

**Record patterns:**
```bash
# After investigation
npx arela patterns

# Shows learned pattern
Pattern: Large generated files fail RAG indexing
Files: *.json >100KB, icons.tsx with SVG paths
Solution: Add to .ragignore or split files
Frequency: 3 projects
```

**Apply to new projects:**
```bash
# Setup detects similar files
npx arela setup

# Suggests learned pattern
"🧠 Found large registry files (learned pattern)
   Add to .ragignore? [Y/n]"
```

## Enforcement

### Pre-commit Hook

```bash
# Check for new warnings in CI logs
if grep -q "⚠.*Failed" .last-build.log; then
  echo "❌ New failures detected. Investigate before committing."
  exit 1
fi
```

### Doctor Command

```bash
npx arela doctor

# Checks for:
# - Unresolved warnings in logs
# - Known failure patterns
# - Missing investigation docs
```

## Why This Matters

**Technical debt compounds:**
- 1 ignored warning → 10 warnings → 100 warnings → system unusable
- Small failures → large failures → critical failures → outages

**Reliability requires discipline:**
- Investigate every failure
- Document every decision
- Learn from every pattern
- Fix or explicitly accept

**The CTO mindset:**
- "Why did this fail?"
- "Will it fail again?"
- "How do we prevent it?"
- "What's the systemic issue?"

## Summary

**Never ignore failures.** Every warning is a signal. Every failure is a lesson. Investigate, document, and learn.

**The rule:**
1. See failure → Read file
2. Understand cause → Assess impact
3. Fix or document → Record pattern
4. Apply learning → Prevent recurrence

**Ship with confidence, not crossed fingers.** 🔍
