# ALL-NIGHTER PLAN 🔥

**Date:** Nov 15, 2025 - 02:24 AM  
**Goal:** Implement EVERYTHING from research  
**Status:** Phase 1 in progress

---

## ✅ Phase 1: Immediate Wins (DONE - 30 min)

1. ✅ **Added `keep_alive: -1`** - Keeps model warm
2. ✅ **Implemented advanced prompt** - Few-shot + CoT + contrastive examples
3. ✅ **Tested with llama3.2:3b** - 3-4s (slower due to longer prompt)
4. 🔄 **Testing qwen2.5:3b** - Research's #1 pick (downloading now)

---

## 🎯 Phase 2: Model Testing (Next 1 hour)

### Test qwen2.5:3b
- **Why:** Research says it's optimized for JSON output + instruction following
- **Expected:** Better accuracy, similar speed
- **Action:** Switch model, rebuild, test

### If qwen2.5:3b is good:
- Run full test suite (26 queries)
- Measure accuracy improvement (target >85%)
- Commit as winner

### If still slow:
- Try shorter prompt (remove some examples)
- Or accept 2-3s for now (accuracy > speed)

---

## 🚀 Phase 3: Hybrid Classifier (Next 2-3 hours)

### Implement Fast-Path Heuristics
```typescript
// src/meta-rag/heuristic-classifier.ts
class HeuristicClassifier {
  classify(query: string): ClassificationResult | null {
    const lower = query.toLowerCase();
    
    // High-confidence patterns (<10ms)
    if (/^(continue|implement|add|create|build)/.test(lower)) {
      return { type: 'PROCEDURAL', confidence: 0.95 };
    }
    
    if (/^what is|^how does/.test(lower) && !lower.includes('import')) {
      return { type: 'FACTUAL', confidence: 0.9 };
    }
    
    if (/(import|dependen|structure)/.test(lower)) {
      return { type: 'ARCHITECTURAL', confidence: 0.9 };
    }
    
    if (/my (prefer|expert|like|use)/.test(lower)) {
      return { type: 'USER', confidence: 0.95 };
    }
    
    if (/why did we|decision|chose|history/.test(lower)) {
      return { type: 'HISTORICAL', confidence: 0.9 };
    }
    
    // Ambiguous - fallback to LLM
    return null;
  }
}
```

### Implement Ensemble Router
```typescript
// src/meta-rag/classifier.ts
async classify(query: string): Promise<ClassificationResult> {
  // Try fast heuristics first
  const heuristicResult = this.heuristic.classify(query);
  
  if (heuristicResult && heuristicResult.confidence > 0.9) {
    console.log(`⚡ Fast path: ${heuristicResult.type} (${Date.now() - start}ms)`);
    return heuristicResult;
  }
  
  // Fallback to LLM for ambiguous queries
  console.log(`🤖 LLM path: analyzing...`);
  return await this.classifyWithOllama(query);
}
```

**Expected Results:**
- 50-70% of queries use fast path (<50ms)
- 30-50% use LLM path (2-3s)
- Average: <1s across all queries

---

## 🧠 Phase 4: k-NN Classifier (Next 3-4 hours)

### Setup
```bash
npm install @xenova/transformers  # For embeddings
```

### Implementation
```typescript
// src/meta-rag/knn-classifier.ts
import { pipeline } from '@xenova/transformers';

class KNNClassifier {
  private embedder: any;
  private examples: Array<{ embedding: number[], type: QueryType }> = [];
  
  async init() {
    // Load lightweight embedding model
    this.embedder = await pipeline('feature-extraction', 
      'Xenova/all-MiniLM-L6-v2'
    );
    
    // Load pre-computed example embeddings
    await this.loadExamples();
  }
  
  async classify(query: string): Promise<ClassificationResult> {
    // Embed query
    const queryEmbedding = await this.embedder(query);
    
    // Find k=3 nearest neighbors
    const neighbors = this.findNearest(queryEmbedding, 3);
    
    // Majority vote
    const votes = neighbors.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
    
    const winner = Object.entries(votes)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      type: winner[0],
      confidence: winner[1] / 3,
      reasoning: `k-NN: ${neighbors.map(n => n.type).join(', ')}`
    };
  }
  
  private findNearest(embedding: number[], k: number) {
    return this.examples
      .map(ex => ({
        ...ex,
        distance: this.cosineSimilarity(embedding, ex.embedding)
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, k);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }
}
```

### Three-Tier Ensemble
```typescript
async classify(query: string): Promise<ClassificationResult> {
  // Tier 1: Heuristics (<50ms)
  const heuristic = this.heuristic.classify(query);
  if (heuristic?.confidence > 0.9) return heuristic;
  
  // Tier 2: k-NN (<100ms)
  const knn = await this.knn.classify(query);
  if (knn.confidence > 0.8) return knn;
  
  // Tier 3: LLM (2-3s, but most accurate)
  return await this.llm.classify(query);
}
```

**Expected Results:**
- Tier 1 (Heuristics): 40% of queries, <50ms
- Tier 2 (k-NN): 40% of queries, <100ms
- Tier 3 (LLM): 20% of queries, 2-3s
- **Average: <500ms!** ✅

---

## 📊 Phase 5: Testing & Validation (Next 1 hour)

### Run Full Test Suite
```bash
npm test test/meta-rag/classifier.test.ts
```

### Measure Improvements
- **Accuracy:** Target >85% (from 77%)
- **Latency:** Target <500ms average (from 1.36s)
- **Coverage:** All 26 test queries

### Create Benchmark Report
```markdown
# META-RAG Classifier Benchmark

## Before (llama3.1:8b, basic prompt)
- Accuracy: 54% (14/26)
- Latency: 3.8s
- Model: 8B params

## After Phase 1 (llama3.2:3b, advanced prompt)
- Accuracy: 77% (20/26)
- Latency: 1.36s
- Model: 3B params

## After Phase 2 (qwen2.5:3b, keep_alive)
- Accuracy: [TBD]
- Latency: [TBD]
- Model: 3B params

## After Phase 3 (Hybrid: heuristics + LLM)
- Accuracy: [TBD]
- Latency: [TBD] (expected <1s average)
- Fast path: [TBD]%

## After Phase 4 (Three-tier: heuristics + k-NN + LLM)
- Accuracy: [TBD] (expected >90%)
- Latency: [TBD] (expected <500ms average)
- Tier 1: [TBD]%
- Tier 2: [TBD]%
- Tier 3: [TBD]%
```

---

## 🎯 Phase 6: Integration & Cleanup (Next 1 hour)

### Update Memory Router
- Connect classifier to Hexi-Memory
- Implement layer routing based on classification
- Test end-to-end query flow

### Documentation
- Update README with new classifier
- Document prompt engineering decisions
- Add performance benchmarks

### Commit & Push
```bash
git add -A
git commit -m "feat: Complete Meta-RAG classifier with three-tier ensemble

Achievements:
- >90% accuracy (from 54%)
- <500ms average latency (from 3.8s)
- Three-tier routing (heuristics + k-NN + LLM)
- Research-backed implementation

Files:
- src/meta-rag/classifier.ts (advanced prompt + keep_alive)
- src/meta-rag/heuristic-classifier.ts (fast path)
- src/meta-rag/knn-classifier.ts (embedding-based)
- test/meta-rag/classifier.test.ts (full suite)

Research:
- RESEARCH/Optimizing LLM for Query Classification.md
- RESEARCH/Optimal Model & Prompt for Query Classification.md"
```

---

## 🚀 Phase 7: JSON Preprocessing (Next 2-3 hours)

### Implement JSON Compressor
```typescript
// src/compression/json-preprocessor.ts
class JSONPreprocessor {
  // Phase 1: Simple compression
  minify(json: any): any {
    // Shorten keys: "file" → "f", "functions" → "fn"
    return this.shortenKeys(json);
  }
  
  deduplicate(json: any): any {
    // Remove repeated data
    return this.dedup(json);
  }
  
  clean(json: any): any {
    // Remove null/undefined
    return this.removeNulls(json);
  }
  
  truncate(json: any, maxTokens: number): any {
    // Fit within token budget
    return this.fitBudget(json, maxTokens);
  }
  
  // Full pipeline
  compress(json: any, options: CompressOptions): any {
    let result = json;
    result = this.clean(result);
    result = this.deduplicate(result);
    result = this.minify(result);
    result = this.truncate(result, options.maxTokens);
    return result;
  }
}
```

### Test Compression
```typescript
const original = { /* 10k tokens */ };
const compressed = preprocessor.compress(original, { maxTokens: 5000 });
console.log(`Savings: ${(1 - compressed.tokens / original.tokens) * 100}%`);
// Expected: 30-50% savings
```

---

## ⏰ Timeline

**Total: 10-12 hours**

- ✅ Phase 1: Immediate wins (30 min) - DONE
- 🔄 Phase 2: Model testing (1 hour) - IN PROGRESS
- 🎯 Phase 3: Hybrid classifier (2-3 hours)
- 🎯 Phase 4: k-NN classifier (3-4 hours)
- 🎯 Phase 5: Testing (1 hour)
- 🎯 Phase 6: Integration (1 hour)
- 🎯 Phase 7: JSON preprocessing (2-3 hours)

**Expected completion: ~12:00 PM (noon)**

---

## 🎉 Success Criteria

By end of tonight:
- ✅ >85% classification accuracy
- ✅ <500ms average latency
- ✅ Three-tier ensemble working
- ✅ JSON preprocessing implemented
- ✅ All tests passing
- ✅ Ready to ship v4.1.0

**LET'S FUCKING GO!** 🚀🔥
