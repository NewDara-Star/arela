# FUSION-001: Result Fusion Engine

**Agent:** Claude  
**Priority:** High  
**Complexity:** Medium  
**Estimated Time:** 2-3 hours  
**Depends On:** META-RAG-002 (Memory Router) ⏳

---

## Context

The Memory Router returns results from multiple layers (Session, Project, Vector, Graph, etc.). Now we need a **Fusion Engine** that:
1. **Scores** results by relevance
2. **Deduplicates** semantically similar items
3. **Merges** into a single ranked list
4. **Compresses** to fit token limits

**Current state:**
- ✅ QueryClassifier working
- ⏳ MemoryRouter in progress
- ❌ No fusion/deduplication

**Goal:**
Build a fusion engine that combines multi-layer results into optimal context for LLMs.

---

## Requirements

### Must Have
1. **Relevance Scoring** - Rank results by query relevance
2. **Semantic Deduplication** - Remove duplicate/similar items
3. **Layer Weighting** - Apply confidence-based weights
4. **Token Limiting** - Truncate to fit context window
5. **Metadata Preservation** - Keep source layer info

### Should Have
6. **Diversity** - Ensure results from multiple layers
7. **Recency Bias** - Prefer newer items (for Session/Project)
8. **Quality Filtering** - Remove low-confidence items

### Nice to Have
9. **Adaptive Scoring** - Learn from user feedback
10. **Compression** - Summarize long items

---

## Technical Specification

### Files to Create
- `src/fusion/scorer.ts` - Relevance scoring
- `src/fusion/dedup.ts` - Semantic deduplication
- `src/fusion/merger.ts` - Result merging
- `src/fusion/index.ts` - Main fusion engine

### Interface
```typescript
export interface FusionOptions {
  maxTokens?: number; // Default: 10000
  minScore?: number; // Default: 0.3
  diversityWeight?: number; // Default: 0.2
}

export interface FusedResult {
  items: FusedItem[];
  stats: {
    totalItems: number;
    deduplicatedItems: number;
    finalItems: number;
    estimatedTokens: number;
  };
}

export interface FusedItem {
  content: string;
  score: number;
  layer: MemoryLayer;
  metadata: Record<string, any>;
}
```

### Implementation

#### 1. Scorer (`src/fusion/scorer.ts`)
```typescript
export class RelevanceScorer {
  /**
   * Score items by relevance to query
   */
  score(query: string, items: MemoryItem[]): ScoredItem[] {
    return items.map((item) => ({
      ...item,
      score: this.calculateScore(query, item),
    }));
  }

  private calculateScore(query: string, item: MemoryItem): number {
    // Factors:
    // 1. Semantic similarity (cosine similarity)
    // 2. Keyword overlap
    // 3. Layer confidence weight
    // 4. Recency (for Session/Project)
    // 5. Quality indicators (length, structure)

    const semanticScore = this.cosineSimilarity(query, item.content);
    const keywordScore = this.keywordOverlap(query, item.content);
    const layerWeight = item.layerWeight || 1.0;
    const recencyScore = this.recencyScore(item.timestamp);

    return (
      semanticScore * 0.4 +
      keywordScore * 0.3 +
      layerWeight * 0.2 +
      recencyScore * 0.1
    );
  }
}
```

#### 2. Deduplicator (`src/fusion/dedup.ts`)
```typescript
export class SemanticDeduplicator {
  /**
   * Remove semantically similar items
   */
  deduplicate(items: ScoredItem[]): ScoredItem[] {
    const unique: ScoredItem[] = [];
    const threshold = 0.85; // 85% similarity = duplicate

    for (const item of items) {
      const isDuplicate = unique.some(
        (existing) =>
          this.cosineSimilarity(item.content, existing.content) > threshold
      );

      if (!isDuplicate) {
        unique.push(item);
      }
    }

    return unique;
  }
}
```

#### 3. Merger (`src/fusion/merger.ts`)
```typescript
export class ResultMerger {
  /**
   * Merge results from multiple layers
   */
  merge(
    routingResult: RoutingResult,
    options: FusionOptions
  ): FusedResult {
    const allItems: MemoryItem[] = [];

    // Collect all items from all layers
    for (const layerResult of routingResult.results) {
      for (const item of layerResult.items) {
        allItems.push({
          ...item,
          layer: layerResult.layer,
          layerWeight: routingResult.classification.weights[layerResult.layer],
        });
      }
    }

    // Score
    const scorer = new RelevanceScorer();
    const scored = scorer.score(routingResult.query, allItems);

    // Deduplicate
    const deduplicator = new SemanticDeduplicator();
    const deduplicated = deduplicator.deduplicate(scored);

    // Sort by score
    const sorted = deduplicated.sort((a, b) => b.score - a.score);

    // Filter by min score
    const filtered = sorted.filter((item) => item.score >= options.minScore);

    // Truncate to token limit
    const truncated = this.truncateToTokens(filtered, options.maxTokens);

    return {
      items: truncated,
      stats: {
        totalItems: allItems.length,
        deduplicatedItems: deduplicated.length,
        finalItems: truncated.length,
        estimatedTokens: this.estimateTokens(truncated),
      },
    };
  }

  private truncateToTokens(
    items: ScoredItem[],
    maxTokens: number
  ): FusedItem[] {
    const result: FusedItem[] = [];
    let tokens = 0;

    for (const item of items) {
      const itemTokens = this.estimateItemTokens(item);
      if (tokens + itemTokens > maxTokens) break;
      
      result.push({
        content: item.content,
        score: item.score,
        layer: item.layer,
        metadata: item.metadata,
      });
      
      tokens += itemTokens;
    }

    return result;
  }
}
```

#### 4. Main Engine (`src/fusion/index.ts`)
```typescript
export class FusionEngine {
  private merger: ResultMerger;

  constructor() {
    this.merger = new ResultMerger();
  }

  /**
   * Fuse routing results into optimal context
   */
  async fuse(
    routingResult: RoutingResult,
    options: FusionOptions = {}
  ): Promise<FusedResult> {
    const defaults: FusionOptions = {
      maxTokens: 10000,
      minScore: 0.3,
      diversityWeight: 0.2,
    };

    return this.merger.merge(routingResult, { ...defaults, ...options });
  }
}
```

---

## Testing

### Unit Tests
`test/fusion/fusion.test.ts`

```typescript
describe("FusionEngine", () => {
  it("should score items by relevance", () => {
    const scored = scorer.score("JWT authentication", items);
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });

  it("should deduplicate similar items", () => {
    const items = [
      { content: "JWT is a token format" },
      { content: "JWT is a token format for auth" }, // Similar
      { content: "OAuth is different" },
    ];
    const deduplicated = deduplicator.deduplicate(items);
    expect(deduplicated).toHaveLength(2); // Removed duplicate
  });

  it("should merge results from multiple layers", () => {
    const fused = await fusion.fuse(routingResult);
    expect(fused.items.length).toBeGreaterThan(0);
    expect(fused.stats.totalItems).toBeGreaterThan(fused.stats.finalItems);
  });

  it("should truncate to token limit", () => {
    const fused = await fusion.fuse(routingResult, { maxTokens: 1000 });
    expect(fused.stats.estimatedTokens).toBeLessThanOrEqual(1000);
  });

  it("should preserve layer metadata", () => {
    const fused = await fusion.fuse(routingResult);
    expect(fused.items[0].layer).toBeDefined();
    expect(fused.items[0].score).toBeGreaterThan(0);
  });
});
```

---

## Acceptance Criteria

- [ ] RelevanceScorer implemented
- [ ] SemanticDeduplicator implemented
- [ ] ResultMerger implemented
- [ ] FusionEngine main class implemented
- [ ] All unit tests passing
- [ ] Deduplication: >80% accuracy
- [ ] Token limiting: Stays within maxTokens
- [ ] Performance: <100ms fusion time

---

## Integration

### With Context Router (final step)
```typescript
// src/context-router.ts
const routingResult = await router.route(query);
const fusedResult = await fusion.fuse(routingResult, { maxTokens: 10000 });

// fusedResult.items = ranked, deduplicated, truncated context
```

---

## Files to Create/Modify
- `src/fusion/scorer.ts` (NEW)
- `src/fusion/dedup.ts` (NEW)
- `src/fusion/merger.ts` (NEW)
- `src/fusion/index.ts` (NEW)
- `src/fusion/types.ts` (NEW)
- `test/fusion/fusion.test.ts` (NEW)

---

## Success Metrics
- **Deduplication accuracy:** >80%
- **Relevance ranking:** Top 3 items are relevant
- **Token efficiency:** Fits within limits
- **Performance:** <100ms fusion time
- **Diversity:** Results from 2+ layers

---

## Notes
- Use cosine similarity for semantic comparison
- Preserve source layer for debugging
- Token estimation: ~4 chars = 1 token
- Recency matters for Session/Project layers

**This completes the "Router → Fusion" pipeline!** 🔥
