# Week 3: Meta-RAG + Context Router

**Status:** Ready to start  
**Duration:** 5-7 days  
**Total Tickets:** 5

---

## Overview

Build the intelligence layer that routes queries to the right memory layers and fuses results into optimal LLM context.

**What we're building:**
1. **Meta-RAG Classifier** - Determines query type and which layers to query
2. **Memory Router** - Routes queries to appropriate layers
3. **Fusion Engine** - Combines results from multiple layers
4. **Context Router** - Builds optimal LLM context
5. **CLI Integration** - User-facing commands

---

## Architecture

```
User Query
    ↓
Meta-RAG Classifier (Ollama - local, free)
    ↓
Memory Router (which layers?)
    ↓
HexiMemory (parallel queries)
    ↓
Fusion Engine (combine + deduplicate)
    ↓
Context Router (compress + format)
    ↓
LLM (GPT-4/Claude/Ollama)
```

---

## Tickets

### Phase 1: Classification (Days 1-2)

**META-RAG-001: Query Classifier** ⏳
- **Agent:** Claude
- **Time:** 4-6 hours
- **Priority:** CRITICAL
- **What:** Classify queries into types (procedural, factual, architectural, etc.)
- **Why:** Different query types need different memory layers

**META-RAG-002: Memory Router** ⏳
- **Agent:** Claude
- **Time:** 3-4 hours
- **Priority:** HIGH
- **What:** Route queries to appropriate memory layers based on classification
- **Why:** Don't query all layers for every query (performance + cost)

### Phase 2: Fusion (Days 3-4)

**FUSION-001: Result Scorer** ⏳
- **Agent:** Codex
- **Time:** 2-3 hours
- **Priority:** HIGH
- **What:** Score and rank results from multiple layers
- **Why:** Not all results are equally relevant

**FUSION-002: Deduplicator** ⏳
- **Agent:** Codex
- **Time:** 2-3 hours
- **Priority:** MEDIUM
- **What:** Remove duplicate/redundant results using semantic similarity
- **Why:** Same info might appear in multiple layers

**FUSION-003: Context Builder** ⏳
- **Agent:** Claude
- **Time:** 4-5 hours
- **Priority:** CRITICAL
- **What:** Combine scored results into optimal LLM context
- **Why:** Final context must be coherent and within token limits

### Phase 3: Integration (Days 5-7)

**CONTEXT-001: Context Router** ⏳
- **Agent:** Cascade
- **Time:** 4-5 hours
- **Priority:** CRITICAL
- **What:** Main integration - classifier → router → fusion → context
- **Why:** Ties everything together

**CLI-001: Memory Commands** ⏳
- **Agent:** Codex
- **Time:** 2-3 hours
- **Priority:** MEDIUM
- **What:** CLI commands for querying memory
- **Why:** User-facing interface

---

## Execution Strategy

### Option 1: Sequential (Safe)
```bash
# Day 1-2: Classification
arela orchestrate --tickets META-RAG-001,META-RAG-002

# Day 3-4: Fusion
arela orchestrate --tickets FUSION-001,FUSION-002,FUSION-003

# Day 5-7: Integration
arela orchestrate --tickets CONTEXT-001,CLI-001
```

### Option 2: Parallel (Fast)
```bash
# Day 1-4: All at once (dependencies managed)
arela orchestrate --parallel --tickets META-RAG-001,META-RAG-002,FUSION-001,FUSION-002,FUSION-003

# Day 5-7: Integration
arela orchestrate --tickets CONTEXT-001,CLI-001
```

---

## Dependencies

```
META-RAG-001 (Classifier) ──┐
                            ├──> META-RAG-002 (Router) ──┐
FUSION-001 (Scorer) ────────┤                            │
FUSION-002 (Dedup) ─────────┼────> FUSION-003 (Builder) ┤
                            │                            │
                            └────────────────────────────┴──> CONTEXT-001 (Router)
                                                              │
                                                              └──> CLI-001 (Commands)
```

**Critical path:** META-RAG-001 → META-RAG-002 → CONTEXT-001

---

## Success Criteria

### Technical
- [ ] Query classification accuracy >85%
- [ ] Routing overhead <100ms
- [ ] Fusion performance <200ms
- [ ] Total query time <500ms (end-to-end)
- [ ] Context within token limits (configurable)
- [ ] All tests passing (>90% coverage)

### Functional
- [ ] Procedural queries → Session + Project + Vector
- [ ] Factual queries → Vector + Graph
- [ ] Architectural queries → Project + Graph + Governance
- [ ] User preference queries → User only
- [ ] Deduplication working (no redundant results)
- [ ] Context coherent and useful

---

## Testing Strategy

### Unit Tests
- Query classifier (each query type)
- Memory router (routing logic)
- Result scorer (ranking algorithm)
- Deduplicator (semantic similarity)
- Context builder (formatting)

### Integration Tests
- End-to-end query flow
- Multi-layer fusion
- Performance benchmarks
- Edge cases (empty results, failures)

### Manual Testing
```bash
# Test different query types
arela memory query "Continue working on auth" # → Session + Project + Vector
arela memory query "What's my preferred testing framework?" # → User
arela memory query "Show me auth-related code" # → Vector + Graph
arela memory query "What decisions were made about auth?" # → Project + Governance
```

---

## Files to Create

### Meta-RAG
```
src/meta-rag/
├── classifier.ts       # Query classification (Ollama)
├── router.ts           # Memory layer routing
├── types.ts            # Shared types
└── index.ts            # Exports

test/meta-rag/
├── classifier.test.ts
└── router.test.ts
```

### Fusion
```
src/fusion/
├── scorer.ts           # Result scoring/ranking
├── dedup.ts            # Semantic deduplication
├── builder.ts          # Context building
├── types.ts            # Shared types
└── index.ts            # Exports

test/fusion/
├── scorer.test.ts
├── dedup.test.ts
└── builder.test.ts
```

### Context Router
```
src/context-router.ts   # Main integration
test/context-router.test.ts
```

### CLI
```
src/cli.ts              # Add memory commands
```

---

## Time Estimates

**Minimum (Sequential):**
- Meta-RAG: 7-10 hours
- Fusion: 8-11 hours
- Integration: 6-8 hours
- **Total: 21-29 hours (5-7 days)**

**Maximum (with testing/debugging):**
- Meta-RAG: 10-14 hours
- Fusion: 11-15 hours
- Integration: 8-12 hours
- **Total: 29-41 hours (7-10 days)**

---

## Key Decisions

### 1. Use Ollama for Classification (Free!)
- No API costs
- Fast enough (<100ms)
- Good enough accuracy (>85%)
- Privacy-first (local)

### 2. Semantic Deduplication
- Use cosine similarity on embeddings
- Threshold: 0.85 (configurable)
- Keep highest-scored result

### 3. Context Budget
- Default: 8k tokens (configurable)
- Allocate by layer priority
- Compress if needed (JSON for now, TOON later)

### 4. Query Types
- **Procedural:** "Continue working on...", "Implement..."
- **Factual:** "What is...", "How does..."
- **Architectural:** "Show me structure...", "What depends on..."
- **User:** "What's my preferred...", "My expertise in..."
- **Historical:** "What decisions...", "Why did we..."

---

## Integration with Week 2

**Hexi-Memory provides:**
- `queryAll()` - Query all 6 layers
- `queryLayers()` - Query specific layers
- `getStats()` - Layer statistics

**Meta-RAG uses:**
- `queryLayers()` - Route to specific layers
- Results from each layer
- Stats for performance monitoring

---

## Ready to Start!

**First command:**
```bash
# Create META-RAG-001 ticket
# Or start manually with Claude
```

**The goal:** Smart query routing that saves tokens and improves relevance! 🎯

---

**This is the week we make Arela INTELLIGENT!** 🧠
