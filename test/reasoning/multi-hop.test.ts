import { describe, it, expect, beforeEach } from "vitest";
import { QueryDecomposer } from "../../src/reasoning/decomposer.js";
import { ResultCombiner } from "../../src/reasoning/combiner.js";
import type { HopResult, SubQuery } from "../../src/reasoning/types.js";
import { QueryType } from "../../src/meta-rag/types.js";
import { MemoryLayer } from "../../src/memory/hexi-memory.js";

describe("Multi-Hop Reasoning", () => {
  describe("QueryDecomposer", () => {
    let decomposer: QueryDecomposer;

    beforeEach(() => {
      decomposer = new QueryDecomposer();
    });

    it("should detect complex queries with flow keyword", () => {
      const query = "How does the authentication flow work from login to dashboard?";
      const isComplex = (decomposer as any).isComplexQuery(query);
      expect(isComplex).toBe(true);
    });

    it("should detect complex queries with 'from...to' pattern", () => {
      const query = "Show me the data flow from API to database";
      const isComplex = (decomposer as any).isComplexQuery(query);
      expect(isComplex).toBe(true);
    });

    it("should detect complex queries with multiple 'and'", () => {
      // Need 2+ complexity indicators, so add more words to make it >10 words
      const query = "Show me the complete login flow and registration process and password reset workflow";
      const isComplex = (decomposer as any).isComplexQuery(query);
      expect(isComplex).toBe(true);
    });

    it("should detect complex long queries", () => {
      const query = "What are all the components involved in the user authentication process";
      const isComplex = (decomposer as any).isComplexQuery(query);
      expect(isComplex).toBe(true);
    });

    it("should not detect simple queries as complex", () => {
      const query = "What is the login endpoint?";
      const isComplex = (decomposer as any).isComplexQuery(query);
      expect(isComplex).toBe(false);
    });

    it("should decompose using fallback when LLM unavailable", async () => {
      const query = "Show login and registration";
      const subQueries = (decomposer as any).fallbackDecomposition(query);

      expect(subQueries.length).toBeGreaterThan(0);
      expect(subQueries[0].query).toBeTruthy();
      expect(subQueries[0].id).toBeTruthy();
    });

    it("should parse sub-queries from JSON", () => {
      const json = `[
        {"id": "1", "query": "First query", "dependencies": [], "priority": 1},
        {"id": "2", "query": "Second query", "dependencies": ["1"], "priority": 2}
      ]`;

      const subQueries = (decomposer as any).parseSubQueries(json);

      expect(subQueries).toHaveLength(2);
      expect(subQueries[0].id).toBe("1");
      expect(subQueries[0].query).toBe("First query");
      expect(subQueries[1].dependencies).toContain("1");
    });

    it("should handle JSON with markdown code blocks", () => {
      const json = `\`\`\`json
      [{"id": "1", "query": "Test", "dependencies": [], "priority": 1}]
      \`\`\``;

      const subQueries = (decomposer as any).parseSubQueries(json);

      expect(subQueries).toHaveLength(1);
      expect(subQueries[0].query).toBe("Test");
    });

    it("should determine parallel strategy for no dependencies", () => {
      const subQueries: SubQuery[] = [
        { id: "1", query: "Q1", dependencies: [], priority: 1 },
        { id: "2", query: "Q2", dependencies: [], priority: 1 },
      ];

      const strategy = (decomposer as any).determineStrategy(subQueries);
      expect(strategy).toBe("parallel");
    });

    it("should determine sequential strategy for linear dependencies", () => {
      const subQueries: SubQuery[] = [
        { id: "1", query: "Q1", dependencies: [], priority: 1 },
        { id: "2", query: "Q2", dependencies: ["1"], priority: 2 },
        { id: "3", query: "Q3", dependencies: ["2"], priority: 3 },
      ];

      const strategy = (decomposer as any).determineStrategy(subQueries);
      expect(strategy).toBe("sequential");
    });

    it("should determine hybrid strategy for mixed dependencies", () => {
      const subQueries: SubQuery[] = [
        { id: "1", query: "Q1", dependencies: [], priority: 1 },
        { id: "2", query: "Q2", dependencies: ["1"], priority: 2 },
        { id: "3", query: "Q3", dependencies: ["1"], priority: 2 },
      ];

      const strategy = (decomposer as any).determineStrategy(subQueries);
      expect(strategy).toBe("hybrid");
    });
  });

  describe("ResultCombiner", () => {
    let combiner: ResultCombiner;

    beforeEach(() => {
      combiner = new ResultCombiner();
    });

    const createMockHopResult = (id: string, contextCount: number): HopResult => ({
      subQueryId: id,
      subQuery: `Query ${id}`,
      classification: {
        query: `Query ${id}`,
        type: QueryType.FACTUAL,
        confidence: 0.9,
        layers: [MemoryLayer.PROJECT],
        weights: { [MemoryLayer.PROJECT]: 1.0 },
        reasoning: "test",
      },
      context: Array.from({ length: contextCount }, (_, i) => ({
        content: `Content ${id}-${i}`,
        layer: MemoryLayer.PROJECT,
        score: 0.8,
        metadata: { type: "code" },
      })),
      relevanceScore: 0.8,
      executionTime: 100,
    });

    it("should deduplicate identical content", () => {
      const hops: HopResult[] = [
        createMockHopResult("1", 2),
        createMockHopResult("2", 2),
      ];

      // Add duplicate content
      hops[1].context[0] = { ...hops[0].context[0] };

      const deduplicated = combiner.deduplicate(hops);
      const totalUnique = deduplicated.reduce((sum, h) => sum + h.context.length, 0);

      expect(totalUnique).toBe(3); // 2 from hop1 + 1 unique from hop2
    });

    it("should rank hops by ID order", () => {
      const hops: HopResult[] = [
        createMockHopResult("3", 1),
        createMockHopResult("1", 1),
        createMockHopResult("2", 1),
      ];

      const ranked = combiner.rank(hops);

      expect(ranked[0].subQueryId).toBe("1");
      expect(ranked[1].subQueryId).toBe("2");
      expect(ranked[2].subQueryId).toBe("3");
    });

    it("should build narrative with separators", () => {
      const combinerWithSeps = new ResultCombiner({ includeSeparators: true });
      const hops: HopResult[] = [
        createMockHopResult("1", 2),
        createMockHopResult("2", 2),
      ];

      const narrative = combinerWithSeps.buildNarrative(hops);

      // Should have separators
      const separators = narrative.filter((item) => item.metadata?.type === "separator");
      expect(separators.length).toBe(2);
    });

    it("should build narrative without separators", () => {
      const combinerNoSeps = new ResultCombiner({ includeSeparators: false });
      const hops: HopResult[] = [
        createMockHopResult("1", 2),
        createMockHopResult("2", 2),
      ];

      const narrative = combinerNoSeps.buildNarrative(hops);

      // Should not have separators
      const separators = narrative.filter((item) => item.metadata?.type === "separator");
      expect(separators.length).toBe(0);
    });

    it("should limit results to maxResults", () => {
      const combinerLimited = new ResultCombiner({ maxResults: 5 });
      const hops: HopResult[] = [
        createMockHopResult("1", 10),
      ];

      const combined = combinerLimited.combine(hops);

      expect(combined.length).toBeLessThanOrEqual(5);
    });

    it("should calculate deduplication rate", () => {
      const hops: HopResult[] = [
        createMockHopResult("1", 5),
        createMockHopResult("2", 5),
      ];

      // After deduplication, we have 10 items (no duplicates in this case)
      const after = hops.flatMap(h => h.context);

      const rate = combiner.calculateDeduplicationRate(hops, after);

      expect(rate).toBe(0); // No deduplication occurred
    });

    it("should calculate deduplication rate with duplicates", () => {
      const hops: HopResult[] = [
        createMockHopResult("1", 5),
        createMockHopResult("2", 5),
      ];

      // Simulate 2 duplicates removed
      const after = hops.flatMap(h => h.context).slice(0, 8);

      const rate = combiner.calculateDeduplicationRate(hops, after);

      expect(rate).toBe(20); // 2/10 = 20%
    });
  });
});
