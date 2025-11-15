# META-RAG-002: Memory Router Implementation

**Agent:** Claude  
**Priority:** High  
**Complexity:** Medium  
**Estimated Time:** 2-3 hours  
**Depends On:** META-RAG-001 (Query Classifier) ✅

---

## Context

We have a working query classifier that determines query types (PROCEDURAL, FACTUAL, etc.) and suggests which memory layers to query. Now we need a **Memory Router** that actually executes those queries across the Hexi-Memory system.

**Current state:**
- ✅ QueryClassifier working (OpenAI + Ollama)
- ✅ HexiMemory system ready (6 layers)
- ❌ No router to connect them

**Goal:**
Build a router that takes classification results and queries the right memory layers in parallel.

---

## Requirements

### Must Have
1. **Layer Selection** - Use classification to determine which layers to query
2. **Parallel Execution** - Query multiple layers simultaneously (Promise.all)
3. **Timeout Handling** - Hard timeout per layer (50ms)
4. **Error Handling** - Graceful failures, continue with available results
5. **Result Aggregation** - Collect all results with metadata

### Should Have
6. **Layer Weights** - Apply confidence-based weights to results
7. **Performance Tracking** - Measure query time per layer
8. **Caching** - Cache recent queries (5-minute TTL)

### Nice to Have
9. **Adaptive Routing** - Learn which layers work best for query types
10. **Query Optimization** - Rewrite queries for specific layers

---

## Technical Specification

### File to Create
`src/meta-rag/router.ts`

### Interface
```typescript
export interface MemoryRouterOptions {
  heximemory: HexiMemory;
  classifier: QueryClassifier;
  timeout?: number; // Per-layer timeout (default: 50ms)
  cache?: boolean; // Enable caching (default: true)
}

export interface RoutingResult {
  query: string;
  classification: ClassificationResult;
  results: LayerResult[];
  stats: {
    totalTime: number;
    layersQueried: number;
    cacheHit: boolean;
  };
}

export interface LayerResult {
  layer: MemoryLayer;
  items: MemoryItem[];
  time: number;
  error?: string;
}
```

### Implementation

```typescript
export class MemoryRouter {
  private heximemory: HexiMemory;
  private classifier: QueryClassifier;
  private timeout: number;
  private cache: Map<string, RoutingResult>;

  constructor(options: MemoryRouterOptions) {
    this.heximemory = options.heximemory;
    this.classifier = options.classifier;
    this.timeout = options.timeout || 50;
    this.cache = new Map();
  }

  /**
   * Route a query to appropriate memory layers
   */
  async route(query: string): Promise<RoutingResult> {
    const start = Date.now();

    // Check cache
    if (this.cache.has(query)) {
      const cached = this.cache.get(query)!;
      return {
        ...cached,
        stats: { ...cached.stats, cacheHit: true },
      };
    }

    // Classify query
    const classification = await this.classifier.classify(query);

    // Query layers in parallel
    const layerPromises = classification.layers.map((layer) =>
      this.queryLayer(layer, query, classification.weights[layer])
    );

    const results = await Promise.all(layerPromises);

    const routingResult: RoutingResult = {
      query,
      classification,
      results,
      stats: {
        totalTime: Date.now() - start,
        layersQueried: results.length,
        cacheHit: false,
      },
    };

    // Cache result
    this.cache.set(query, routingResult);
    setTimeout(() => this.cache.delete(query), 5 * 60 * 1000); // 5-minute TTL

    return routingResult;
  }

  /**
   * Query a single memory layer with timeout
   */
  private async queryLayer(
    layer: MemoryLayer,
    query: string,
    weight: number
  ): Promise<LayerResult> {
    const start = Date.now();

    try {
      // Race between query and timeout
      const items = await Promise.race([
        this.heximemory.query(layer, query),
        this.timeoutPromise(this.timeout),
      ]);

      return {
        layer,
        items: items as MemoryItem[],
        time: Date.now() - start,
      };
    } catch (error) {
      return {
        layer,
        items: [],
        time: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## Testing

### Unit Tests
`test/meta-rag/router.test.ts`

```typescript
describe("MemoryRouter", () => {
  it("should route PROCEDURAL queries to session + project + graph", async () => {
    const result = await router.route("Continue working on auth");
    expect(result.classification.type).toBe("procedural");
    expect(result.results).toHaveLength(3);
    expect(result.results.map((r) => r.layer)).toContain("session");
    expect(result.results.map((r) => r.layer)).toContain("project");
    expect(result.results.map((r) => r.layer)).toContain("graph");
  });

  it("should route FACTUAL queries to vector only", async () => {
    const result = await router.route("What is JWT?");
    expect(result.classification.type).toBe("factual");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].layer).toBe("vector");
  });

  it("should handle layer timeouts gracefully", async () => {
    // Mock slow layer
    const result = await router.route("Test query");
    const slowLayer = result.results.find((r) => r.error);
    expect(slowLayer?.error).toBe("Timeout");
  });

  it("should cache results", async () => {
    const result1 = await router.route("Same query");
    const result2 = await router.route("Same query");
    expect(result2.stats.cacheHit).toBe(true);
  });

  it("should query layers in parallel", async () => {
    const start = Date.now();
    await router.route("Multi-layer query");
    const duration = Date.now() - start;
    // Should be <200ms (not 3x 50ms = 150ms sequential)
    expect(duration).toBeLessThan(200);
  });
});
```

---

## Acceptance Criteria

- [ ] MemoryRouter class implemented
- [ ] Routes queries to correct layers based on classification
- [ ] Queries layers in parallel (Promise.all)
- [ ] Handles timeouts gracefully (50ms per layer)
- [ ] Caches results (5-minute TTL)
- [ ] All unit tests passing
- [ ] Performance: <200ms total query time
- [ ] Error handling: Continues with partial results

---

## Integration

### With Context Router (next ticket)
```typescript
// src/context-router.ts
const router = new MemoryRouter({
  heximemory,
  classifier,
});

const result = await router.route("Continue working on auth");
// Returns: { classification, results, stats }
```

---

## Files to Modify
- `src/meta-rag/router.ts` (NEW)
- `src/meta-rag/types.ts` (add RoutingResult, LayerResult)
- `test/meta-rag/router.test.ts` (NEW)

---

## Success Metrics
- **Routing accuracy:** >90% (correct layers selected)
- **Performance:** <200ms total query time
- **Reliability:** >95% success rate (with partial results)
- **Cache hit rate:** >30% (for repeated queries)

---

## Notes
- Use existing HexiMemory.query() method
- Parallel execution is critical for performance
- Graceful degradation: Return partial results if some layers fail
- Cache is in-memory (lost on restart, that's OK)

**This completes the "Classifier → Router" pipeline!** 🎯
