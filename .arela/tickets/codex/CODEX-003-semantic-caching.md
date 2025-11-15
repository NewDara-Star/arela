# CODEX-003: Semantic Caching for Code Summarization

**Agent:** codex  
**Priority:** high  
**Complexity:** medium  
**Estimated Time:** 3 hours  
**Depends On:** CODEX-001 (AST Extractor), CODEX-002 (LLM Synthesizer)

---

## Context

Implement semantic caching to avoid expensive LLM calls when only comments or formatting change. Compare `SemanticContract` instead of file hash to determine if re-summarization is needed.

**Why this matters:**
- 70-80% cache hit rate expected
- 5x cost savings (skip LLM calls)
- Massive performance improvement
- Only re-summarize when PUBLIC API changes

**Research basis:**
- Research #1 (Gemini's killer feature): Semantic caching
- Compare AST structure, not file content
- Cache `TechnicalSummary` keyed by semantic hash

---

## Requirements

### Must Have
- [ ] Cache `TechnicalSummary` by semantic hash
- [ ] Compare `SemanticContract` to detect changes
- [ ] Skip LLM call if semantic contract unchanged
- [ ] Persistent cache (file-based or Redis)
- [ ] Cache invalidation on semantic changes

### Should Have
- [ ] Cache statistics (hit rate, savings)
- [ ] Cache expiration (30 days)
- [ ] Cache size limits (max 1000 entries)

### Nice to Have
- [ ] Redis backend (for multi-user)
- [ ] Cache warming (pre-compute summaries)
- [ ] Cache compression

---

## Technical Specification

### Cache Key Strategy

```typescript
// src/summarization/cache/semantic-hash.ts
export function computeSemanticHash(contract: SemanticContract): string {
  // Hash ONLY the semantic structure, not comments or formatting
  const semanticData = {
    exports: contract.exports.map(e => ({
      name: e.name,
      kind: e.kind,
      signature: e.signature, // params, return type
      methods: e.methods?.map(m => ({
        name: m.name,
        signature: m.signature
      }))
    })),
    imports: contract.imports.map(i => ({
      module: i.module,
      names: i.names.sort() // Sort for consistency
    }))
  };

  // Create deterministic hash
  const json = JSON.stringify(semanticData, Object.keys(semanticData).sort());
  return createHash('sha256').update(json).digest('hex');
}
```

### Cache Implementation

```typescript
// src/summarization/cache/semantic-cache.ts
import fs from 'fs-extra';
import path from 'path';

export interface CacheEntry {
  semanticHash: string;
  summary: TechnicalSummary;
  cachedAt: string;
  hits: number;
}

export class SemanticCache {
  private cacheDir: string;
  private stats: CacheStats;

  constructor(projectPath: string) {
    this.cacheDir = path.join(projectPath, '.arela', 'cache', 'summaries');
    this.stats = { hits: 0, misses: 0, savings: 0 };
  }

  /**
   * Get cached summary if semantic contract unchanged
   */
  async get(contract: SemanticContract): Promise<TechnicalSummary | null> {
    const hash = computeSemanticHash(contract);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);

    if (await fs.pathExists(cacheFile)) {
      const entry: CacheEntry = await fs.readJSON(cacheFile);
      
      // Check expiration (30 days)
      const age = Date.now() - new Date(entry.cachedAt).getTime();
      if (age > 30 * 24 * 60 * 60 * 1000) {
        await fs.remove(cacheFile);
        this.stats.misses++;
        return null;
      }

      // Cache hit!
      entry.hits++;
      await fs.writeJSON(cacheFile, entry);
      this.stats.hits++;
      this.stats.savings += 0.0001; // $0.0001 per LLM call saved
      
      console.log(`✅ Cache HIT: ${contract.filePath} (${entry.hits} hits)`);
      return entry.summary;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store summary in cache
   */
  async set(contract: SemanticContract, summary: TechnicalSummary): Promise<void> {
    const hash = computeSemanticHash(contract);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);

    await fs.ensureDir(this.cacheDir);
    
    const entry: CacheEntry = {
      semanticHash: hash,
      summary,
      cachedAt: new Date().toISOString(),
      hits: 0,
    };

    await fs.writeJSON(cacheFile, entry, { spaces: 2 });
    console.log(`💾 Cached: ${contract.filePath}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100),
    };
  }

  /**
   * Clear expired cache entries
   */
  async cleanup(): Promise<number> {
    const files = await fs.readdir(this.cacheDir);
    let removed = 0;

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const entry: CacheEntry = await fs.readJSON(filePath);
      
      const age = Date.now() - new Date(entry.cachedAt).getTime();
      if (age > 30 * 24 * 60 * 60 * 1000) {
        await fs.remove(filePath);
        removed++;
      }
    }

    return removed;
  }
}

interface CacheStats {
  hits: number;
  misses: number;
  savings: number; // dollars saved
  hitRate?: number; // percentage
}
```

---

## Files to Create

1. **`src/summarization/cache/semantic-hash.ts`**
   - `computeSemanticHash()` function
   - Deterministic hashing logic

2. **`src/summarization/cache/semantic-cache.ts`**
   - `SemanticCache` class
   - Cache get/set/cleanup methods

3. **`src/summarization/cache/types.ts`**
   - `CacheEntry` interface
   - `CacheStats` interface

4. **`test/summarization/cache.test.ts`**
   - Unit tests for caching logic
   - Test semantic hash consistency

---

## Test Cases

### Test 1: Cache Miss (First Time)
```typescript
const contract = { /* ... */ };
const cache = new SemanticCache('/project');

const cached = await cache.get(contract);
expect(cached).toBeNull(); // Cache miss

const summary = await synthesizer.synthesize(contract);
await cache.set(contract, summary);
```

### Test 2: Cache Hit (Unchanged Semantic)
```typescript
// First call
const contract1 = { exports: [{ name: 'add', /* ... */ }] };
await cache.set(contract1, summary1);

// Second call (same semantic, different comments)
const contract2 = { exports: [{ name: 'add', /* ... */ }] }; // Same structure
const cached = await cache.get(contract2);
expect(cached).toEqual(summary1); // Cache hit!
```

### Test 3: Cache Miss (Changed Semantic)
```typescript
// First call
const contract1 = { exports: [{ name: 'add', /* ... */ }] };
await cache.set(contract1, summary1);

// Second call (different signature)
const contract2 = { exports: [{ name: 'add', signature: { /* different params */ } }] };
const cached = await cache.get(contract2);
expect(cached).toBeNull(); // Cache miss (semantic changed)
```

---

## Acceptance Criteria

- [ ] Caches `TechnicalSummary` by semantic hash
- [ ] Cache hit when only comments/formatting change
- [ ] Cache miss when public API changes
- [ ] Persistent cache (survives restarts)
- [ ] Cache expiration (30 days)
- [ ] Cache statistics (hit rate, savings)
- [ ] All tests pass

---

## Success Metrics

- **Hit Rate:** 70-80% (expected)
- **Cost Savings:** 5x reduction in LLM calls
- **Performance:** Instant cache hits (<10ms)
- **Accuracy:** 100% semantic change detection

---

## Notes

- Semantic hash ONLY includes public API structure
- Comments, formatting, private functions DON'T affect hash
- This is Gemini's "killer feature" from research
- Expected to save massive costs in production

---

## Related Tickets

- CODEX-001: AST Extractor (provides input)
- CODEX-002: LLM Synthesizer (provides output to cache)
- CODEX-004: Integration (uses cache in pipeline)
