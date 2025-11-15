# Week 2: Hexi-Memory System

**Status:** Ready to start  
**Duration:** 4-7 days  
**Total Tickets:** 7

---

## Overview

Build the 6-layer Hexi-Memory system that enables Arela to **never forget anything important**.

**Layers:**
1. **Vector Memory** - Semantic search (wrap existing RAG)
2. **Graph Memory** - Structural dependencies (wrap existing graph.db)
3. **Governance Memory** - Audit trail (wrap existing audit.db)
4. **Session Memory** - Current conversation/task (NEW!)
5. **Project Memory** - Project-specific patterns (NEW!)
6. **User Memory** - Cross-project preferences (NEW!)

---

## Tickets

### Phase 1: New Memory Layers (Claude)

**HEXI-001: Session Memory** ⏳
- **Agent:** Claude
- **Time:** 3-4 hours
- **Priority:** HIGH
- **What:** In-memory + SQLite snapshot for current session
- **Why:** Remember current task across IDE restarts

**HEXI-002: Project Memory** ⏳
- **Agent:** Claude
- **Time:** 3-4 hours
- **Priority:** HIGH
- **What:** Project-specific patterns, decisions, todos
- **Why:** Learn project conventions and architecture

**HEXI-003: User Memory** ⏳
- **Agent:** Claude
- **Time:** 3-4 hours
- **Priority:** HIGH
- **What:** Global user preferences and expertise
- **Why:** Learn user's coding style across all projects

### Phase 2: Memory Wrappers (Codex)

**HEXI-004: Vector Memory Wrapper** ⏳
- **Agent:** Codex
- **Time:** 1-2 hours
- **Priority:** MEDIUM
- **What:** Wrap existing RAG index
- **Why:** Unified interface for semantic search

**HEXI-005: Graph Memory Wrapper** ⏳
- **Agent:** Codex
- **Time:** 1-2 hours
- **Priority:** MEDIUM
- **What:** Wrap existing graph.db
- **Why:** Unified interface for structural queries

**HEXI-006: Governance Memory Wrapper** ⏳
- **Agent:** Codex
- **Time:** 1-2 hours
- **Priority:** MEDIUM
- **What:** Wrap existing audit.db
- **Why:** Unified interface for audit log

### Phase 3: Integration (Cascade)

**HEXI-007: Memory Orchestrator** ⏳
- **Agent:** Cascade
- **Time:** 4-5 hours
- **Priority:** CRITICAL
- **What:** Unified API for all 6 layers
- **Why:** Query routing, result fusion, performance

---

## Execution Strategy

### Option 1: Sequential (Safe)
```bash
# Day 1-2: Session Memory
arela orchestrate --tickets HEXI-001-session-memory

# Day 2-3: Project Memory
arela orchestrate --tickets HEXI-002-project-memory

# Day 3-4: User Memory
arela orchestrate --tickets HEXI-003-user-memory

# Day 4: Wrappers (parallel)
arela orchestrate --tickets HEXI-004-vector-memory-wrapper,HEXI-005-graph-memory-wrapper,HEXI-006-governance-memory-wrapper

# Day 5-7: Orchestrator
arela orchestrate --tickets HEXI-007-memory-orchestrator
```

### Option 2: Parallel (Fast)
```bash
# Day 1-3: All new layers (Claude parallel)
arela orchestrate --parallel --tickets HEXI-001,HEXI-002,HEXI-003

# Day 3: All wrappers (Codex parallel)
arela orchestrate --parallel --tickets HEXI-004,HEXI-005,HEXI-006

# Day 4-7: Orchestrator (Cascade)
arela orchestrate --tickets HEXI-007
```

---

## Dependencies

```
HEXI-001 (Session) ──┐
HEXI-002 (Project) ──┼──> HEXI-007 (Orchestrator)
HEXI-003 (User) ─────┤
HEXI-004 (Vector) ───┤
HEXI-005 (Graph) ────┤
HEXI-006 (Governance)┘
```

**All 6 layers must complete before orchestrator!**

---

## Success Criteria

### Technical
- [ ] All 6 layers implemented
- [ ] Unified API working
- [ ] Query performance <200ms
- [ ] Memory usage <50MB total
- [ ] Session continuity across restarts
- [ ] Project patterns learned
- [ ] User preferences tracked
- [ ] All tests passing (>90% coverage)

### Functional
- [ ] Session memory persists across IDE restarts
- [ ] Project memory remembers architecture decisions
- [ ] User memory learns coding style
- [ ] Vector search works via wrapper
- [ ] Graph queries work via wrapper
- [ ] Governance log accessible
- [ ] Orchestrator queries all layers

---

## Testing Strategy

### Unit Tests
- Each layer has >90% test coverage
- Mock dependencies
- Test error handling

### Integration Tests
- Test orchestrator with all layers
- Test parallel queries
- Test error recovery
- Test performance

### Manual Testing
```bash
# Initialize memory
arela memory init

# Query all layers
arela memory query "authentication"

# Check stats
arela memory stats

# Test session continuity
# 1. Set current task
# 2. Restart IDE
# 3. Check task restored
```

---

## Files Created

### New Files (13 total)
```
src/memory/
├── session.ts          # HEXI-001
├── project.ts          # HEXI-002
├── user.ts             # HEXI-003
├── vector.ts           # HEXI-004
├── graph.ts            # HEXI-005
├── governance.ts       # HEXI-006
├── hexi-memory.ts      # HEXI-007
├── types.ts            # Shared types
└── index.ts            # Exports

test/memory/
├── session.test.ts
├── project.test.ts
├── user.test.ts
├── hexi-memory.test.ts
```

### Databases
```
.arela/memory/
├── session.db          # Per-session (cleared on new session)
├── project.db          # Per-project (lifetime of project)
└── graph.db            # Existing (wrapped)
└── audit.db            # Existing (wrapped)

~/.arela/
└── user.db             # Global (forever)
```

---

## Integration with Week 3

Once Hexi-Memory is complete, Week 3 will add:
- **Meta-RAG** - Smart query routing to appropriate layers
- **Fusion Engine** - Combine results from multiple layers
- **Context Router** - Build optimal LLM context

**Hexi-Memory is the foundation!**

---

## Time Estimates

**Minimum (Sequential):**
- Claude: 9-12 hours (3 layers)
- Codex: 3-6 hours (3 wrappers)
- Cascade: 4-5 hours (orchestrator)
- **Total: 16-23 hours (4-5 days)**

**Maximum (with testing/debugging):**
- Claude: 12-15 hours
- Codex: 4-8 hours
- Cascade: 5-7 hours
- **Total: 21-30 hours (5-7 days)**

---

## Ready to Start!

**Next command:**
```bash
arela orchestrate --tickets HEXI-001-session-memory
```

Or assign manually to Claude! 🚀

---

**This is the week we make Arela NEVER FORGET!** 🧠
