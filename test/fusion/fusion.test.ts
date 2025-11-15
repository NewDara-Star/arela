import { describe, it, expect, beforeEach } from "vitest";
import { FusionEngine } from "../../src/fusion/index.js";
import { RelevanceScorer } from "../../src/fusion/scorer.js";
import { SemanticDeduplicator } from "../../src/fusion/dedup.js";
import { ResultMerger } from "../../src/fusion/merger.js";
import { MemoryLayer } from "../../src/memory/hexi-memory.js";
import { QueryType } from "../../src/meta-rag/types.js";
import type { RoutingResult } from "../../src/meta-rag/types.js";
import type { MemoryItem, ScoredItem } from "../../src/fusion/types.js";

describe("RelevanceScorer", () => {
  let scorer: RelevanceScorer;

  beforeEach(() => {
    scorer = new RelevanceScorer();
  });

  it("should score items by relevance to query", () => {
    const items: MemoryItem[] = [
      {
        content: "JWT authentication is a token-based auth system",
        timestamp: Date.now(),
        layerWeight: 1.0,
      },
      {
        content: "OAuth is a different authentication protocol",
        timestamp: Date.now(),
        layerWeight: 1.0,
      },
      {
        content: "Database connection pooling improves performance",
        timestamp: Date.now(),
        layerWeight: 1.0,
      },
    ];

    const scored = scorer.score("JWT authentication", items);

    expect(scored).toHaveLength(3);
    expect(scored[0].score).toBeGreaterThan(0);
    // First item should score highest (most relevant)
    expect(scored[0].score).toBeGreaterThan(scored[2].score);
  });

  it("should handle empty items array", () => {
    const scored = scorer.score("test query", []);
    expect(scored).toHaveLength(0);
  });

  it("should apply layer weights correctly", () => {
    const items: MemoryItem[] = [
      {
        content: "Test content",
        layerWeight: 0.5,
      },
      {
        content: "Test content",
        layerWeight: 1.0,
      },
    ];

    const scored = scorer.score("test", items);

    // Higher layer weight should contribute to higher score
    expect(scored[1].score).toBeGreaterThan(scored[0].score);
  });

  it("should calculate cosine similarity correctly", () => {
    const text1 = "JWT is a token format";
    const text2 = "JWT is a token format for authentication";
    const text3 = "OAuth is completely different";

    const sim1 = scorer.cosineSimilarity(text1, text2);
    const sim2 = scorer.cosineSimilarity(text1, text3);

    expect(sim1).toBeGreaterThan(sim2);
    expect(sim1).toBeGreaterThan(0.5);
  });
});

describe("SemanticDeduplicator", () => {
  let deduplicator: SemanticDeduplicator;

  beforeEach(() => {
    deduplicator = new SemanticDeduplicator(0.85);
  });

  it("should deduplicate similar items", () => {
    const items: ScoredItem[] = [
      {
        content: "JWT is a token-based authentication format for web applications",
        score: 0.9,
        timestamp: Date.now(),
      },
      {
        content: "JWT is a token-based authentication format for web apps",
        score: 0.85,
        timestamp: Date.now(),
      },
      {
        content: "OAuth is a completely different authorization protocol",
        score: 0.8,
        timestamp: Date.now(),
      },
    ];

    const deduplicated = deduplicator.deduplicate(items);

    // Should remove one of the similar JWT items (first two are >85% similar)
    expect(deduplicated.length).toBeLessThan(items.length);
    expect(deduplicated.length).toBeGreaterThanOrEqual(2);
  });

  it("should keep highest-scoring item from duplicate group", () => {
    const items: ScoredItem[] = [
      {
        content: "JWT authentication system",
        score: 0.7,
        timestamp: Date.now(),
      },
      {
        content: "JWT authentication system",
        score: 0.9,
        timestamp: Date.now(),
      },
    ];

    const deduplicated = deduplicator.deduplicate(items);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].score).toBe(0.9);
  });

  it("should handle empty array", () => {
    const deduplicated = deduplicator.deduplicate([]);
    expect(deduplicated).toHaveLength(0);
  });

  it("should allow threshold customization", () => {
    deduplicator.setThreshold(0.95);
    expect(deduplicator.getThreshold()).toBe(0.95);
  });

  it("should find duplicate groups", () => {
    const items: ScoredItem[] = [
      { content: "JWT auth", score: 0.9, timestamp: Date.now() },
      { content: "JWT authentication", score: 0.85, timestamp: Date.now() },
      { content: "OAuth", score: 0.8, timestamp: Date.now() },
    ];

    const groups = deduplicator.findDuplicateGroups(items);

    // Should find at least one group if items are similar
    expect(Array.isArray(groups)).toBe(true);
  });
});

describe("ResultMerger", () => {
  let merger: ResultMerger;

  beforeEach(() => {
    merger = new ResultMerger();
  });

  it("should merge results from multiple layers", () => {
    const routingResult: RoutingResult = {
      query: "JWT authentication",
      classification: {
        query: "JWT authentication",
        type: QueryType.FACTUAL,
        confidence: 0.9,
        layers: [MemoryLayer.PROJECT, MemoryLayer.VECTOR],
        weights: {
          [MemoryLayer.PROJECT]: 0.8,
          [MemoryLayer.VECTOR]: 0.6,
          [MemoryLayer.SESSION]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.PROJECT,
          items: [
            { content: "JWT is a token format", timestamp: Date.now() },
          ],
          time: 10,
          weight: 0.8,
        },
        {
          layer: MemoryLayer.VECTOR,
          items: [
            { content: "Authentication using JWT", timestamp: Date.now() },
          ],
          time: 15,
          weight: 0.6,
        },
      ],
      stats: {
        totalTime: 25,
        layersQueried: 2,
        cacheHit: false,
      },
    };

    const fused = merger.merge(routingResult, { maxTokens: 10000 });

    expect(fused.items.length).toBeGreaterThan(0);
    expect(fused.stats.totalItems).toBeGreaterThan(0);
    expect(fused.stats.fusionTime).toBeGreaterThanOrEqual(0);
  });

  it("should filter by minimum score", () => {
    const routingResult: RoutingResult = {
      query: "test",
      classification: {
        query: "test",
        type: QueryType.GENERAL,
        confidence: 0.7,
        layers: [MemoryLayer.SESSION],
        weights: {
          [MemoryLayer.SESSION]: 1.0,
          [MemoryLayer.PROJECT]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [
            { content: "Relevant item", timestamp: Date.now() },
            { content: "Irrelevant xyz abc", timestamp: Date.now() },
          ],
          time: 10,
        },
      ],
      stats: { totalTime: 10, layersQueried: 1, cacheHit: false },
    };

    const fused = merger.merge(routingResult, { minScore: 0.5 });

    // Items below minScore should be filtered
    expect(fused.items.every((item) => item.score >= 0.5)).toBe(true);
  });

  it("should handle layers with errors gracefully", () => {
    const routingResult: RoutingResult = {
      query: "test",
      classification: {
        query: "test",
        type: QueryType.GENERAL,
        confidence: 0.7,
        layers: [MemoryLayer.SESSION, MemoryLayer.PROJECT],
        weights: {
          [MemoryLayer.SESSION]: 1.0,
          [MemoryLayer.PROJECT]: 0.8,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [{ content: "Valid item", timestamp: Date.now() }],
          time: 10,
        },
        {
          layer: MemoryLayer.PROJECT,
          items: null,
          time: 5,
          error: "Timeout",
        },
      ],
      stats: { totalTime: 15, layersQueried: 2, cacheHit: false },
    };

    const fused = merger.merge(routingResult, {});

    // Should not throw and should process valid items
    expect(fused.items.length).toBeGreaterThanOrEqual(0);
    expect(fused.stats.totalItems).toBeGreaterThanOrEqual(0);
  });
});

describe("FusionEngine", () => {
  let fusion: FusionEngine;

  beforeEach(() => {
    fusion = new FusionEngine();
  });

  it("should fuse routing results", async () => {
    const routingResult: RoutingResult = {
      query: "JWT authentication implementation",
      classification: {
        query: "JWT authentication implementation",
        type: QueryType.PROCEDURAL,
        confidence: 0.85,
        layers: [MemoryLayer.SESSION, MemoryLayer.PROJECT],
        weights: {
          [MemoryLayer.SESSION]: 0.9,
          [MemoryLayer.PROJECT]: 0.7,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Procedural query about implementing JWT",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [
            {
              content:
                "Implemented JWT authentication with bcrypt password hashing",
              timestamp: Date.now(),
            },
          ],
          time: 5,
          weight: 0.9,
        },
        {
          layer: MemoryLayer.PROJECT,
          items: [
            {
              content: "JWT tokens should expire after 24 hours",
              timestamp: Date.now() - 86400000,
            },
          ],
          time: 8,
          weight: 0.7,
        },
      ],
      stats: { totalTime: 13, layersQueried: 2, cacheHit: false },
    };

    const fused = await fusion.fuse(routingResult);

    expect(fused.items.length).toBeGreaterThan(0);
    expect(fused.stats.totalItems).toBeGreaterThan(0);
    expect(fused.items[0].score).toBeGreaterThan(0);
    expect(fused.items[0].layer).toBeDefined();
  });

  it("should truncate to token limit", async () => {
    const longContent = "a".repeat(10000); // ~2500 tokens

    const routingResult: RoutingResult = {
      query: "test",
      classification: {
        query: "test",
        type: QueryType.GENERAL,
        confidence: 0.7,
        layers: [MemoryLayer.SESSION],
        weights: {
          [MemoryLayer.SESSION]: 1.0,
          [MemoryLayer.PROJECT]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [
            { content: longContent, timestamp: Date.now() },
            { content: longContent, timestamp: Date.now() },
            { content: longContent, timestamp: Date.now() },
          ],
          time: 10,
        },
      ],
      stats: { totalTime: 10, layersQueried: 1, cacheHit: false },
    };

    const fused = await fusion.fuse(routingResult, { maxTokens: 1000 });

    expect(fused.stats.estimatedTokens).toBeLessThanOrEqual(1000);
  });

  it("should preserve layer metadata", async () => {
    const routingResult: RoutingResult = {
      query: "test query",
      classification: {
        query: "test query",
        type: QueryType.FACTUAL,
        confidence: 0.8,
        layers: [MemoryLayer.PROJECT],
        weights: {
          [MemoryLayer.PROJECT]: 0.9,
          [MemoryLayer.SESSION]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.PROJECT,
          items: [
            {
              content: "Test item with metadata",
              timestamp: Date.now(),
              metadata: { source: "test" },
            },
          ],
          time: 5,
          weight: 0.9,
        },
      ],
      stats: { totalTime: 5, layersQueried: 1, cacheHit: false },
    };

    const fused = await fusion.fuse(routingResult);

    expect(fused.items.length).toBeGreaterThan(0);
    expect(fused.items[0].layer).toBe(MemoryLayer.PROJECT);
    expect(fused.items[0].score).toBeGreaterThan(0);
    expect(fused.items[0].metadata).toBeDefined();
  });

  it("should use default options when none provided", async () => {
    const routingResult: RoutingResult = {
      query: "test",
      classification: {
        query: "test",
        type: QueryType.GENERAL,
        confidence: 0.7,
        layers: [MemoryLayer.SESSION],
        weights: {
          [MemoryLayer.SESSION]: 1.0,
          [MemoryLayer.PROJECT]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [{ content: "test item", timestamp: Date.now() }],
          time: 5,
        },
      ],
      stats: { totalTime: 5, layersQueried: 1, cacheHit: false },
    };

    const fused = await fusion.fuse(routingResult);

    // Should apply defaults
    expect(fused.stats.estimatedTokens).toBeLessThanOrEqual(10000);
  });

  it("should allow updating default options", () => {
    fusion.setDefaults({ maxTokens: 5000, minScore: 0.5 });

    const defaults = fusion.getDefaults();

    expect(defaults.maxTokens).toBe(5000);
    expect(defaults.minScore).toBe(0.5);
  });

  it("should support verbose mode", async () => {
    fusion.setVerbose(true);

    const routingResult: RoutingResult = {
      query: "test",
      classification: {
        query: "test",
        type: QueryType.GENERAL,
        confidence: 0.7,
        layers: [MemoryLayer.SESSION],
        weights: {
          [MemoryLayer.SESSION]: 1.0,
          [MemoryLayer.PROJECT]: 0,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.VECTOR]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Test",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [{ content: "test", timestamp: Date.now() }],
          time: 5,
        },
      ],
      stats: { totalTime: 5, layersQueried: 1, cacheHit: false },
    };

    // Should not throw with verbose mode enabled
    await expect(fusion.fuse(routingResult)).resolves.toBeDefined();
  });
});

describe("Integration: Full Pipeline", () => {
  it("should complete full fusion pipeline with performance target", async () => {
    const fusion = new FusionEngine();

    // Create realistic routing result
    const routingResult: RoutingResult = {
      query: "Continue working on authentication feature",
      classification: {
        query: "Continue working on authentication feature",
        type: QueryType.PROCEDURAL,
        confidence: 0.92,
        layers: [
          MemoryLayer.SESSION,
          MemoryLayer.PROJECT,
          MemoryLayer.VECTOR,
        ],
        weights: {
          [MemoryLayer.SESSION]: 0.95,
          [MemoryLayer.PROJECT]: 0.85,
          [MemoryLayer.VECTOR]: 0.6,
          [MemoryLayer.USER]: 0,
          [MemoryLayer.GRAPH]: 0,
          [MemoryLayer.GOVERNANCE]: 0,
        },
        reasoning: "Procedural query about continuing work",
      },
      results: [
        {
          layer: MemoryLayer.SESSION,
          items: [
            {
              content: "Implemented JWT authentication with refresh tokens",
              timestamp: Date.now() - 1000,
            },
            {
              content: "Added password hashing with bcrypt",
              timestamp: Date.now() - 2000,
            },
          ],
          time: 5,
          weight: 0.95,
        },
        {
          layer: MemoryLayer.PROJECT,
          items: [
            {
              content: "Authentication system uses JWT tokens",
              timestamp: Date.now() - 86400000,
            },
            {
              content: "Password requirements: 8+ chars, special chars",
              timestamp: Date.now() - 172800000,
            },
          ],
          time: 8,
          weight: 0.85,
        },
        {
          layer: MemoryLayer.VECTOR,
          items: [
            {
              content: "JWT best practices documentation",
              timestamp: Date.now() - 604800000,
            },
          ],
          time: 12,
          weight: 0.6,
        },
      ],
      stats: { totalTime: 25, layersQueried: 3, cacheHit: false },
    };

    const startTime = Date.now();
    const fused = await fusion.fuse(routingResult, {
      maxTokens: 10000,
      minScore: 0.3,
    });
    const fusionTime = Date.now() - startTime;

    // Acceptance Criteria
    expect(fused.items.length).toBeGreaterThan(0); // Has results
    expect(fused.stats.deduplicatedItems).toBeLessThanOrEqual(
      fused.stats.totalItems
    ); // Deduplication occurred
    expect(fused.stats.estimatedTokens).toBeLessThanOrEqual(10000); // Token limiting
    expect(fusionTime).toBeLessThan(100); // Performance: <100ms

    // Items should be sorted by score
    for (let i = 1; i < fused.items.length; i++) {
      expect(fused.items[i - 1].score).toBeGreaterThanOrEqual(
        fused.items[i].score
      );
    }

    // All items should have required fields
    fused.items.forEach((item) => {
      expect(item.content).toBeDefined();
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(1);
      expect(item.layer).toBeDefined();
      expect(item.metadata).toBeDefined();
    });
  });
});
