# Arela v4.1.0 Development Plan

**Date:** 2025-11-15  
**Status:** In Progress (Week 3)  
**Goal:** Complete Meta-RAG + JSON Preprocessing

---

## Current Status (v4.0.2 - SHIPPED!)

### ✅ Completed (Week 2)
- **Hexi-Memory System** - All 6 layers (Session, Project, User, Vector, Graph, Governance)
- **149 tests passing** - Full test coverage
- **<120ms performance** - Parallel queries
- **80% token savings** - arela_search vs grep validated

### ✅ Completed (v4.0.2)
- **OpenAI Integration** - gpt-4o-mini as primary classifier
- **700-1500ms classification** - Fast and reliable
- **Auto-fallback** - Uses Ollama if OpenAI unavailable
- **Environment config** - Simple .env setup

### 🎯 Next (v4.1.0)
- **Memory Router** - Layer selection logic
- **Fusion Engine** - Combine + deduplicate results
- **Context Router** - End-to-end integration

---

## v4.1.0 Features

### 1. Meta-RAG Query Classification ✅ (Week 3, Days 1-2)
**Status:** Testing llama3.2:3b  
**Goal:** Intelligent query routing to right memory layers

**What it does:**
- Classifies queries into 5 types (PROCEDURAL, FACTUAL, ARCHITECTURAL, USER, HISTORICAL)
- Routes to appropriate Hexi-Memory layers
- Returns confidence scores and reasoning

**Success Criteria:**
- ✅ >85% classification accuracy
- ✅ <1s latency per classification
- ✅ Works with local models (Ollama)

**Files:**
- `src/meta-rag/classifier.ts` ✅
- `src/meta-rag/router.ts` (next)
- `src/meta-rag/types.ts` ✅
- `test/meta-rag/classifier.test.ts` ✅

---

### 2. Memory Router 🎯 (Week 3, Days 3-4)
**Status:** Next after classifier  
**Goal:** Execute retrieval from right memory layers

**What it does:**
- Takes classification result
- Queries appropriate Hexi-Memory layers in parallel
- Applies layer-specific weights
- Returns ranked results

**Implementation:**
```typescript
class MemoryRouter {
  async route(classification: Classification): Promise<MemoryResult[]> {
    // Query layers based on classification
    const layers = classification.layers; // e.g., [Session, Project, Vector]
    const weights = classification.weights; // e.g., {Session: 0.5, Project: 0.3, Vector: 0.2}
    
    // Parallel queries
    const results = await Promise.all(
      layers.map(layer => hexiMemory.query(layer, query))
    );
    
    // Apply weights and rank
    return this.rank(results, weights);
  }
}
```

**Files to create:**
- `src/meta-rag/router.ts`
- `test/meta-rag/router.test.ts`

---

### 3. Fusion Engine 🎯 (Week 3, Days 5-6)
**Status:** After router  
**Goal:** Combine and deduplicate results from multiple layers

**What it does:**
- Scores results by relevance
- Deduplicates semantically similar items
- Merges into final context

**Techniques:**
- **Reciprocal Rank Fusion (RRF)** - Combine rankings from multiple sources
- **Semantic Deduplication** - Remove similar results using embeddings
- **Token Budget Management** - Fit within context window

**Files to create:**
- `src/fusion/scorer.ts`
- `src/fusion/dedup.ts`
- `src/fusion/merger.ts`
- `test/fusion/fusion.test.ts`

---

### 4. JSON Preprocessing 🎯 (Week 3, Day 7)
**Status:** Replaces TOON  
**Goal:** Compress JSON context for efficient LLM calls

**Decision:** Drop TOON (unproven) in favor of battle-tested JSON preprocessing

**What it does:**
- Minifies JSON keys (30% savings)
- Deduplicates repeated data (50% savings)
- Removes null/undefined values
- Truncates to token budget

**Implementation:**
```typescript
class JSONPreprocessor {
  // Phase 1: Simple (v4.1.0)
  minify(json: any): any // Shorten keys
  deduplicate(json: any): any // Remove duplicates
  clean(json: any): any // Remove null/undefined
  truncate(json: any, maxTokens: number): any // Fit budget
  
  // Phase 2: Smart (v4.2.0)
  summarize(code: string): string // Summarize long code
  prioritize(results: any[], query: string): any[] // Rank by relevance
}
```

**Files to create:**
- `src/compression/json-preprocessor.ts`
- `test/compression/json-preprocessor.test.ts`

**Why not TOON:**
- ❌ Unproven technology
- ❌ Unknown LLM compatibility
- ❌ Hard to debug
- ✅ JSON is battle-tested
- ✅ 30-50% savings is good enough

---

### 5. Context Router Integration 🎯 (Week 3, Days 8-9)
**Status:** Final integration  
**Goal:** Complete end-to-end Meta-RAG pipeline

**What it does:**
- Orchestrates entire flow
- Classifier → Router → Fusion → Preprocessing → LLM
- Handles errors gracefully
- Provides fallbacks

**Implementation:**
```typescript
class ContextRouter {
  async route(query: string): Promise<string> {
    // 1. Classify query
    const classification = await classifier.classify(query);
    
    // 2. Route to memories
    const results = await router.route(classification);
    
    // 3. Fuse results
    const fused = await fusion.merge(results);
    
    // 4. Preprocess JSON
    const compressed = preprocessor.compress(fused, {
      maxTokens: 10000,
      level: 'medium'
    });
    
    // 5. Return compressed context
    return JSON.stringify(compressed);
  }
}
```

**Files to create:**
- `src/context-router.ts`
- `test/context-router.test.ts`

---

## Timeline

**Week 3 (Current):**
- ✅ Day 1-2: Query Classifier (testing llama3.2:3b)
- 🎯 Day 3-4: Memory Router
- 🎯 Day 5-6: Fusion Engine
- 🎯 Day 7: JSON Preprocessing
- 🎯 Day 8-9: Context Router Integration

**Total:** 9 days (1.5 weeks)

---

## Success Criteria

### Performance
- [ ] Classification: <1s per query
- [ ] Routing: <200ms overhead
- [ ] Fusion: <200ms overhead
- [ ] Total: <500ms end-to-end

### Accuracy
- [ ] Classification: >85% correct routing
- [ ] Retrieval: >90% relevant results
- [ ] Deduplication: <5% false positives

### Efficiency
- [ ] Token savings: 30-50% via JSON preprocessing
- [ ] Context quality: 30%+ improvement in relevance
- [ ] Hallucination: 50%+ reduction

---

## Architecture

```
User Query
    ↓
Meta-RAG Classifier (llama3.2:3b, <1s)
    ↓
Memory Router (query right layers)
    ↓
Hexi-Memory (6 layers, parallel)
    ├─ Session
    ├─ Project
    ├─ User
    ├─ Vector
    ├─ Graph
    └─ Governance
    ↓
Fusion Engine (RRF, dedup, rank)
    ↓
JSON Preprocessing (minify, dedupe, truncate)
    ↓
Compressed Context (30-50% smaller)
    ↓
LLM (GPT-4/Claude/Ollama)
```

---

## What's NOT in v4.1.0

**Deferred to v4.2.0:**
- Advanced summarization (code → summary)
- Learning from feedback
- Multi-hop reasoning
- Fine-tuned models

**Deferred to v5.0.0:**
- VS Code Extension
- Real-time collaboration
- Cloud sync

---

## Files Summary

**New files (v4.1.0):**
```
src/
├── meta-rag/
│   ├── classifier.ts ✅
│   ├── router.ts 🎯
│   ├── types.ts ✅
│   └── index.ts ✅
├── fusion/
│   ├── scorer.ts 🎯
│   ├── dedup.ts 🎯
│   ├── merger.ts 🎯
│   └── index.ts 🎯
├── compression/
│   ├── json-preprocessor.ts 🎯
│   └── index.ts 🎯
└── context-router.ts 🎯

test/
├── meta-rag/
│   ├── classifier.test.ts ✅
│   └── router.test.ts 🎯
├── fusion/
│   └── fusion.test.ts 🎯
├── compression/
│   └── json-preprocessor.test.ts 🎯
└── context-router.test.ts 🎯
```

**Total:** ~2,000 lines of new code + tests

---

## Competitive Advantage

**Current tools:**
- Cursor/Windsurf: Single-session memory, no intelligence
- Copilot: No memory at all
- Devin: Basic memory, no smart routing

**Arela with Meta-RAG:**
- ✅ 6-layer Hexi-Memory (comprehensive)
- ✅ Intelligent query routing (right memory for right question)
- ✅ Quality verification (no hallucinations)
- ✅ JSON preprocessing (30-50% token savings)
- ✅ Local-first (privacy, speed, cost)

**This is the 10x improvement that makes Arela a true "technical co-founder."**

---

## Next Steps

**Immediate (Today):**
1. ✅ Finish llama3.2:3b testing
2. 🎯 Implement Memory Router
3. 🎯 Create router tests

**This Week:**
1. 🎯 Complete Fusion Engine
2. 🎯 Implement JSON Preprocessing
3. 🎯 Integrate Context Router
4. 🎯 Ship v4.1.0

**Next Week (v4.2.0):**
1. Advanced summarization
2. Prompt optimization
3. Fine-tuning exploration
4. Performance optimization

---

## Philosophy

> "Make it work, make it right, make it fast." - Kent Beck

**v4.1.0:** Make it work (basic Meta-RAG + JSON preprocessing)  
**v4.2.0:** Make it right (optimize accuracy, add summarization)  
**v4.3.0:** Make it fast (fine-tune, cache, optimize)

**Ship working software. Iterate based on real usage.** 🚀
