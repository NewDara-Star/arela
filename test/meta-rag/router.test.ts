import { describe, test, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "../../src/meta-rag/router.js";
import { QueryClassifier } from "../../src/meta-rag/classifier.js";
import { HexiMemory, MemoryLayer } from "../../src/memory/hexi-memory.js";
import { QueryType } from "../../src/meta-rag/types.js";

// Mock HexiMemory
class MockHexiMemory {
  async querySession(query: string) {
    return {
      currentTask: "Test task",
      activeTicket: "TEST-001",
      openFiles: [],
    };
  }

  async queryProject(query: string) {
    return {
      architecture: {},
      techStack: ["TypeScript", "Node.js"],
      decisions: [],
    };
  }

  async queryUser(query: string) {
    return {
      preferences: {},
      expertise: [],
      patterns: [],
    };
  }

  async queryVector(query: string) {
    return [
      { content: "Vector result 1", score: 0.9 },
      { content: "Vector result 2", score: 0.8 },
    ];
  }

  async queryGraph(query: string) {
    return {
      stats: { nodes: 100, edges: 200 },
    };
  }

  async queryGovernance(query: string) {
    return [
      { event: "decision", timestamp: Date.now() },
    ];
  }
}

// Mock QueryClassifier
class MockQueryClassifier {
  async classify(query: string) {
    // Simple mock classification (case-insensitive)
    const lower = query.toLowerCase();

    if (lower.includes("continue") || lower.includes("implement")) {
      return {
        query,
        type: QueryType.PROCEDURAL,
        confidence: 0.9,
        layers: [MemoryLayer.SESSION, MemoryLayer.PROJECT, MemoryLayer.VECTOR],
        weights: {
          [MemoryLayer.SESSION]: 0.4,
          [MemoryLayer.PROJECT]: 0.3,
          [MemoryLayer.VECTOR]: 0.3,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.GRAPH]: 0.0,
          [MemoryLayer.GOVERNANCE]: 0.0,
        },
        reasoning: "Task-oriented query",
      };
    } else if (lower.includes("what is")) {
      return {
        query,
        type: QueryType.FACTUAL,
        confidence: 1.0,
        layers: [MemoryLayer.VECTOR],
        weights: {
          [MemoryLayer.VECTOR]: 1.0,
          [MemoryLayer.SESSION]: 0.0,
          [MemoryLayer.PROJECT]: 0.0,
          [MemoryLayer.USER]: 0.0,
          [MemoryLayer.GRAPH]: 0.0,
          [MemoryLayer.GOVERNANCE]: 0.0,
        },
        reasoning: "Knowledge query",
      };
    } else {
      return {
        query,
        type: QueryType.GENERAL,
        confidence: 0.6,
        layers: [
          MemoryLayer.SESSION,
          MemoryLayer.PROJECT,
          MemoryLayer.USER,
          MemoryLayer.VECTOR,
          MemoryLayer.GRAPH,
          MemoryLayer.GOVERNANCE,
        ],
        weights: {
          [MemoryLayer.SESSION]: 0.2,
          [MemoryLayer.PROJECT]: 0.2,
          [MemoryLayer.USER]: 0.1,
          [MemoryLayer.VECTOR]: 0.2,
          [MemoryLayer.GRAPH]: 0.2,
          [MemoryLayer.GOVERNANCE]: 0.1,
        },
        reasoning: "General query",
      };
    }
  }
}

describe("MemoryRouter", () => {
  let router: MemoryRouter;
  let mockMemory: MockHexiMemory;
  let mockClassifier: MockQueryClassifier;

  beforeEach(() => {
    mockMemory = new MockHexiMemory();
    mockClassifier = new MockQueryClassifier();
    router = new MemoryRouter({
      heximemory: mockMemory as unknown as HexiMemory,
      classifier: mockClassifier as unknown as QueryClassifier,
      timeout: 50,
      cache: true,
    });
  });

  describe("PROCEDURAL routing", () => {
    test("should route PROCEDURAL queries to session + project + vector", async () => {
      const result = await router.route("Continue working on auth");

      expect(result.classification.type).toBe(QueryType.PROCEDURAL);
      expect(result.results).toHaveLength(3);
      expect(result.results.map((r) => r.layer)).toContain(MemoryLayer.SESSION);
      expect(result.results.map((r) => r.layer)).toContain(MemoryLayer.PROJECT);
      expect(result.results.map((r) => r.layer)).toContain(MemoryLayer.VECTOR);
    });

    test("should include weights in results", async () => {
      const result = await router.route("Continue working on auth");

      const sessionResult = result.results.find(
        (r) => r.layer === MemoryLayer.SESSION
      );
      expect(sessionResult?.weight).toBe(0.4);

      const projectResult = result.results.find(
        (r) => r.layer === MemoryLayer.PROJECT
      );
      expect(projectResult?.weight).toBe(0.3);

      const vectorResult = result.results.find(
        (r) => r.layer === MemoryLayer.VECTOR
      );
      expect(vectorResult?.weight).toBe(0.3);
    });
  });

  describe("FACTUAL routing", () => {
    test("should route FACTUAL queries to vector only", async () => {
      const result = await router.route("What is JWT?");

      expect(result.classification.type).toBe(QueryType.FACTUAL);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].layer).toBe(MemoryLayer.VECTOR);
    });
  });

  describe("Parallel execution", () => {
    test("should query layers in parallel", async () => {
      const start = Date.now();
      await router.route("General query");
      const duration = Date.now() - start;

      // Should be <200ms (parallel) not 6x 50ms = 300ms (sequential)
      expect(duration).toBeLessThan(200);
    });

    test("should include timing information per layer", async () => {
      const result = await router.route("Continue working on auth");

      result.results.forEach((layerResult) => {
        expect(layerResult.time).toBeDefined();
        expect(layerResult.time).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Error handling", () => {
    test("should handle layer errors gracefully", async () => {
      // Create a mock that throws for one layer
      const errorMemory = new MockHexiMemory();
      errorMemory.querySession = async () => {
        throw new Error("Session error");
      };

      const errorRouter = new MemoryRouter({
        heximemory: errorMemory as unknown as HexiMemory,
        classifier: mockClassifier as unknown as QueryClassifier,
      });

      const result = await errorRouter.route("Continue working on auth");

      // Should still return results for other layers
      expect(result.results.length).toBeGreaterThan(0);

      // Session should have error
      const sessionResult = result.results.find(
        (r) => r.layer === MemoryLayer.SESSION
      );
      expect(sessionResult?.error).toBe("Session error");
      expect(sessionResult?.items).toBeNull();
    });

    test("should continue with partial results on timeout", async () => {
      // Create a mock with slow query
      const slowMemory = new MockHexiMemory();
      slowMemory.querySession = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Longer than 50ms timeout
        return { data: "slow data" };
      };

      const slowRouter = new MemoryRouter({
        heximemory: slowMemory as unknown as HexiMemory,
        classifier: mockClassifier as unknown as QueryClassifier,
        timeout: 50,
      });

      const result = await slowRouter.route("Continue working on auth");

      // Session should timeout
      const sessionResult = result.results.find(
        (r) => r.layer === MemoryLayer.SESSION
      );
      expect(sessionResult?.error).toBe("Timeout");

      // But other layers should succeed
      const projectResult = result.results.find(
        (r) => r.layer === MemoryLayer.PROJECT
      );
      expect(projectResult?.error).toBeUndefined();
      expect(projectResult?.items).toBeDefined();
    });
  });

  describe("Caching", () => {
    test("should cache results", async () => {
      const result1 = await router.route("Same query");
      const result2 = await router.route("Same query");

      expect(result2.stats.cacheHit).toBe(true);
      expect(result1.stats.cacheHit).toBe(false);
    });

    test("should return different results for different queries", async () => {
      const result1 = await router.route("Query 1");
      const result2 = await router.route("Query 2");

      expect(result1.stats.cacheHit).toBe(false);
      expect(result2.stats.cacheHit).toBe(false);
    });

    test("should allow disabling cache", async () => {
      const noCacheRouter = new MemoryRouter({
        heximemory: mockMemory as unknown as HexiMemory,
        classifier: mockClassifier as unknown as QueryClassifier,
        cache: false,
      });

      const result1 = await noCacheRouter.route("Same query");
      const result2 = await noCacheRouter.route("Same query");

      expect(result1.stats.cacheHit).toBe(false);
      expect(result2.stats.cacheHit).toBe(false);
    });

    test("should clear cache", async () => {
      await router.route("Query to cache");
      expect(router.getCacheSize()).toBe(1);

      router.clearCache();
      expect(router.getCacheSize()).toBe(0);
    });
  });

  describe("Performance tracking", () => {
    test("should track total query time", async () => {
      const result = await router.route("Continue working on auth");

      expect(result.stats.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalTime).toBeDefined();
    });

    test("should track number of layers queried", async () => {
      const result1 = await router.route("What is JWT?");
      expect(result1.stats.layersQueried).toBe(1);

      const result2 = await router.route("Continue working on auth");
      expect(result2.stats.layersQueried).toBe(3);
    });
  });

  describe("Result structure", () => {
    test("should include classification in result", async () => {
      const result = await router.route("Continue working on auth");

      expect(result.classification).toBeDefined();
      expect(result.classification.query).toBe("Continue working on auth");
      expect(result.classification.type).toBe(QueryType.PROCEDURAL);
      expect(result.classification.confidence).toBe(0.9);
    });

    test("should include query in result", async () => {
      const result = await router.route("Test query");

      expect(result.query).toBe("Test query");
    });

    test("should include layer results with proper structure", async () => {
      const result = await router.route("Continue working on auth");

      result.results.forEach((layerResult) => {
        expect(layerResult.layer).toBeDefined();
        expect(layerResult.time).toBeDefined();
        expect(layerResult.weight).toBeDefined();
        // Either items or error should be present
        expect(
          layerResult.items !== undefined || layerResult.error !== undefined
        ).toBe(true);
      });
    });
  });

  describe("Cache utilities", () => {
    test("should get cache keys", async () => {
      await router.route("Query 1");
      await router.route("Query 2");

      const keys = router.getCacheKeys();
      expect(keys).toContain("Query 1");
      expect(keys).toContain("Query 2");
      expect(keys.length).toBe(2);
    });

    test("should get cache size", async () => {
      expect(router.getCacheSize()).toBe(0);

      await router.route("Query 1");
      expect(router.getCacheSize()).toBe(1);

      await router.route("Query 2");
      expect(router.getCacheSize()).toBe(2);

      // Same query should not increase size
      await router.route("Query 1");
      expect(router.getCacheSize()).toBe(2);
    });
  });
});
