# [AGENT]-[ID]: [Title]

**Agent:** [claude | codex | cascade]  
**Priority:** [critical | high | medium | low]  
**Complexity:** [simple | medium | complex]  
**Estimated Time:** [hours]

---

## 🔍 BEFORE YOU START (Read This First!)

**Use Arela's Hexi-Memory System to save 85k+ tokens:**

### 1. Semantic Search (FASTEST - Use This First!)
```bash
arela_search "slice extraction logic"
arela_search "import path rewriting"  
arela_search "test runner implementation"
```
- **Cost:** ~1k tokens per search
- **Finds:** Relevant code semantically (Vector Memory)
- **When:** Always try this FIRST

### 2. Check Project Memory
```bash
# Get project patterns & conventions
arela memory project --key auth_patterns
arela memory project --key testing_strategy
arela memory project --category decision

# What's in Project Memory:
# - Architecture decisions & rationales
# - Patterns & conventions (observed, not claimed)
# - Project-scoped todos & tech debt
# - Component summaries
```
- **Cost:** 0 tokens (local SQLite)
- **Finds:** "How we do things in THIS repo"

### 3. Check User Memory (Cross-Project Patterns)
```bash
# Get your preferences across all projects
arela memory user --key preferred_db
arela memory user --key testing_style
arela memory user --patterns

# What's in User Memory:
# - Your tech stack preferences
# - Workflow preferences (PR size, TDD, etc.)
# - Expertise levels
# - Patterns you follow (or avoid)
```
- **Cost:** 0 tokens (global SQLite)
- **Finds:** "How YOU typically work"

### 4. Check Architecture Graph
```bash
# See dependencies & relationships
arela graph --from src/auth/login.ts
arela graph --slice auth

# What's in Graph Memory:
# - File → file imports
# - Symbol → symbol calls
# - Slices / module boundaries
```
- **Cost:** 0 tokens (local SQLite)
- **Finds:** Structural relationships

### 5. Check Governance Log
```bash
# See past decisions & why
arela memory governance --recent 10
arela memory governance --search "authentication"

# What's in Governance Memory:
# - Architectural decisions
# - Tooling choices
# - Policy/governance rules
# - Linked artifacts (docs, PRs, ADRs)
```
- **Cost:** 0 tokens (append-only log)
- **Finds:** "What we decided and why"

### 6. grep/find (LAST RESORT)
- Only use if memory system + semantic search fails
- **Cost:** 85k+ tokens for large searches
- Use sparingly!

---

## Context

**Why this task exists:**
[Explain the problem or need]

**Current state:**
[What exists now]

**Desired state:**
[What we want after this ticket]

---

## Requirements

### Must Have
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Should Have
- [ ] Nice-to-have 1
- [ ] Nice-to-have 2

### Nice to Have
- [ ] Future enhancement 1
- [ ] Future enhancement 2

---

## Technical Implementation

### Files to Create/Modify
```
src/
├── feature/
│   ├── index.ts
│   ├── implementation.ts
│   └── types.ts
```

### Architecture
```typescript
// High-level design
interface Example {
  // Key interfaces
}

async function mainFlow() {
  // 1. Step one
  // 2. Step two
  // 3. Step three
}
```

### Key Decisions
- **Decision 1:** [Why we chose this approach]
- **Decision 2:** [Trade-offs considered]

---

## Acceptance Criteria

- [ ] Feature works as specified
- [ ] Tests pass (unit + integration)
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Code reviewed
- [ ] Performance acceptable

---

## Test Plan

### Unit Tests
- Test case 1
- Test case 2

### Integration Tests
- Integration scenario 1
- Integration scenario 2

### Edge Cases
- Edge case 1
- Edge case 2

---

## Success Metrics

**Performance:**
- Metric 1: < X seconds
- Metric 2: < Y operations

**Quality:**
- Test coverage: > 80%
- No regressions
- Clean build

---

## Example Output

```bash
$ arela command --option

🚀 Starting...
✅ Step 1 complete
✅ Step 2 complete
✅ Done!

Summary:
  - Item 1: Success
  - Item 2: Success
```

---

## Documentation

**Files to create/update:**
- `docs/feature.md` - Complete guide
- `README.md` - Add feature to list
- `CHANGELOG.md` - Document changes

---

## Notes

**Important considerations:**
- Note 1
- Note 2

**Related work:**
- Ticket #123
- ADR-042

---

## Remember

**Hexi-Memory Search Priority:**
1. ✅ `arela_search` - Semantic code search (1k tokens)
2. ✅ `arela memory project` - This repo's patterns (0 tokens)
3. ✅ `arela memory user` - Your preferences (0 tokens)
4. ✅ `arela graph` - Dependencies & structure (0 tokens)
5. ✅ `arela memory governance` - Past decisions (0 tokens)
6. ❌ `grep`/`find` - Only if memory fails (85k+ tokens)

**The memory system knows more than you think. Use it!** 🧠

**Save tokens, save money, ship faster!** 🚀
