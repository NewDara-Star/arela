---
id: arela.refactor_over_rewrite
title: Refactor Over Rewrite
category: engineering
severity: should
version: 1.0.0
---

# Refactor Over Rewrite

## Principle

**When you can refactor, don't rewrite.** Adding a new file is often lazier than improving an existing one.

## The Problem

Engineers love creating new files because:
- It feels like a clean slate
- No need to understand existing code
- Avoids "touching legacy code"

**But this leads to:**
- Code duplication
- Maintenance burden (now you have 2 files to update)
- Confusion (which one should I use?)
- Technical debt accumulation

## The Rule

### ✅ **Refactor When:**
- Functionality overlaps >50%
- You're adding similar logic
- The existing file is <500 lines
- The change is additive (not breaking)

### ❌ **Rewrite When:**
- Fundamentally different use case
- Existing code is unsalvageable
- Breaking changes required
- Clear separation of concerns

## Examples

### **Bad: Over-Engineering**
```typescript
// Existing: auto-index.ts (handles trigger-based indexing)

// Developer adds: incremental-index.ts (handles commit-based indexing)
// Result: 2 files, duplicated logic, confusion
```

### **Good: Refactoring**
```typescript
// Refactored: auto-index.ts
export async function autoIndex(options: {
  incremental?: boolean;  // ← Add flag
  checkTriggers?: boolean;
}) {
  // Unified logic, one source of truth
}
```

## Decision Tree

```
Need similar functionality?
├─ Yes → Can I add it to existing file?
│  ├─ Yes → REFACTOR (add flag/option)
│  └─ No → Is it >500 lines?
│     ├─ Yes → EXTRACT (split logically)
│     └─ No → REFACTOR (it's not that big)
└─ No → CREATE (genuinely different)
```

## Questions to Ask

Before creating a new file:

1. **"Does a file already do something similar?"**
   - If yes → Refactor it

2. **"Can I add a parameter/flag instead?"**
   - If yes → Do that

3. **"Will this cause duplication?"**
   - If yes → Don't do it

4. **"Am I just avoiding understanding existing code?"**
   - If yes → Read the code, then refactor

## Exceptions

**Create a new file when:**
- Different domain (e.g., `auth.ts` vs `payments.ts`)
- Different layer (e.g., `api.ts` vs `db.ts`)
- Existing file is >1000 lines (time to split)
- Genuinely orthogonal concerns

## The Carmack Test

> "Little tiny steps using local information."
> - John Carmack

**Ask:** "Is creating a new file a tiny step, or am I avoiding the work of understanding what's already there?"

If you're avoiding understanding → **Refactor, don't rewrite.**

## Enforcement

**In Code Review:**
- "Why not add this to `existing-file.ts`?"
- "Can we refactor instead of duplicating?"
- "What's the separation of concerns here?"

**Red Flags:**
- Two files with similar names (`index.ts` + `incremental-index.ts`)
- Duplicated imports/types
- Copy-pasted logic

## Remember

**Refactoring is not laziness—it's discipline.**

Creating a new file is often the lazy choice. Improving an existing one takes more thought, but results in better code.

---

*"Make it work, make it right, make it fast."*  
*- Kent Beck*

*Start with "make it right" by refactoring, not rewriting.*
