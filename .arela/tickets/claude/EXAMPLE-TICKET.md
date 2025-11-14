# CLAUDE-XXX: [Feature Name]

**Agent:** claude  
**Priority:** high  
**Complexity:** complex  
**Estimated Time:** 6-8 hours

---

## 🔍 BEFORE YOU START (Read This First!)

**Use Arela's built-in tools to save 85k+ tokens:**

### 1. Semantic Search (FASTEST - Use This First!)
```
arela_search "relevant feature logic"
arela_search "similar implementation"
```
- **Cost:** ~1k tokens per search
- **When:** Always try this FIRST

### 2. Check Architecture Graph
```
.arela/memory/graph.db contains:
- File dependencies
- Module relationships
```

### 3. grep/find (LAST RESORT)
- Only use if semantic search fails
- **Cost:** 85k+ tokens for large searches

---

## Context

[Why this task exists and what problem it solves]

---

## Requirements

### Must Have
- [ ] Core requirement 1
- [ ] Core requirement 2

### Should Have
- [ ] Nice-to-have 1

---

## Technical Implementation

### Files to Create
```
src/feature/
├── index.ts
└── implementation.ts
```

### Architecture
```typescript
// High-level design
```

---

## Acceptance Criteria

- [ ] Feature works as specified
- [ ] Tests pass
- [ ] Documentation updated

---

## Remember

**Search Priority:**
1. ✅ `arela_search` first (1k tokens)
2. ✅ Check graph.db (0 tokens)
3. ❌ grep only if needed (85k+ tokens)
