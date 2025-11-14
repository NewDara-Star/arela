# [AGENT]-[ID]: [Title]

**Agent:** [claude | codex | cascade]  
**Priority:** [critical | high | medium | low]  
**Complexity:** [simple | medium | complex]  
**Estimated Time:** [hours]

---

## 🔍 BEFORE YOU START (Read This First!)

**Use Arela's built-in tools to save 85k+ tokens:**

### 1. Semantic Search (FASTEST - Use This First!)
```
arela_search "slice extraction logic"
arela_search "import path rewriting"  
arela_search "test runner implementation"
```
- **Cost:** ~1k tokens per search
- **Finds:** Relevant code semantically
- **When:** Always try this FIRST

### 2. Check Architecture Graph
```
.arela/memory/graph.db contains:
- File dependencies
- Module relationships
- Slice boundaries
```
- Use this to understand relationships
- No token cost (local file)

### 3. Check RAG Index
```
.arela/.rag-index.json contains:
- Code embeddings
- Semantic similarity
- Related files
```
- If stale, run: `arela index`

### 4. grep/find (LAST RESORT)
- Only use if semantic search fails
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

**Search Priority:**
1. ✅ `arela_search` first (1k tokens)
2. ✅ Check graph.db (0 tokens)
3. ❌ grep only if needed (85k+ tokens)

**Save tokens, save money, ship faster!** 🚀
