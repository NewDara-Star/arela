import { describe, it, expect, beforeEach } from "vitest";
import { QueryClassifier } from "../../src/meta-rag/classifier.js";
import { QueryType } from "../../src/meta-rag/types.js";
import { MemoryLayer } from "../../src/memory/hexi-memory.js";

describe("QueryClassifier (META-RAG-001)", () => {
  let classifier: QueryClassifier;

  beforeEach(async () => {
    classifier = new QueryClassifier();
    await classifier.init();
  });

  describe("Procedural queries", () => {
    it("should classify 'Continue working on authentication'", async () => {
      const result = await classifier.classify(
        "Continue working on authentication"
      );

      expect(result.type).toBe(QueryType.PROCEDURAL);
      expect(result.layers).toContain(MemoryLayer.SESSION);
      expect(result.layers).toContain(MemoryLayer.PROJECT);
      expect(result.layers).toContain(MemoryLayer.VECTOR);
      expect(result.weights[MemoryLayer.SESSION]).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should classify 'Implement login feature'", async () => {
      const result = await classifier.classify("Implement login feature");

      expect(result.type).toBe(QueryType.PROCEDURAL);
      expect(result.layers).toContain(MemoryLayer.SESSION);
    });

    it("should classify 'Add tests for auth'", async () => {
      const result = await classifier.classify("Add tests for auth");

      expect(result.type).toBe(QueryType.PROCEDURAL);
    });
  });

  describe("Factual queries", () => {
    it("should classify 'What is the authentication flow?'", async () => {
      const result = await classifier.classify(
        "What is the authentication flow?"
      );

      expect(result.type).toBe(QueryType.FACTUAL);
      expect(result.layers).toContain(MemoryLayer.VECTOR);
      expect(result.layers).toContain(MemoryLayer.GRAPH);
      expect(result.weights[MemoryLayer.VECTOR]).toBeGreaterThan(0);
    });

    it("should classify 'How does JWT work?'", async () => {
      const result = await classifier.classify("How does JWT work?");

      expect(result.type).toBe(QueryType.FACTUAL);
      expect(result.layers).toContain(MemoryLayer.VECTOR);
    });

    it("should classify 'Explain the login process'", async () => {
      const result = await classifier.classify("Explain the login process");

      expect(result.type).toBe(QueryType.FACTUAL);
    });
  });

  describe("Architectural queries", () => {
    it("should classify 'Show me auth dependencies'", async () => {
      const result = await classifier.classify("Show me auth dependencies");

      expect(result.type).toBe(QueryType.ARCHITECTURAL);
      expect(result.layers).toContain(MemoryLayer.GRAPH);
      expect(result.layers).toContain(MemoryLayer.PROJECT);
      expect(result.weights[MemoryLayer.GRAPH]).toBeGreaterThan(0);
    });

    it("should classify 'What imports the auth module?'", async () => {
      const result = await classifier.classify(
        "What imports the auth module?"
      );

      expect(result.type).toBe(QueryType.ARCHITECTURAL);
      expect(result.layers).toContain(MemoryLayer.GRAPH);
    });

    it("should classify 'Show me the file structure'", async () => {
      const result = await classifier.classify("Show me the file structure");

      expect(result.type).toBe(QueryType.ARCHITECTURAL);
    });
  });

  describe("User queries", () => {
    it("should classify 'What is my preferred testing framework?'", async () => {
      const result = await classifier.classify(
        "What is my preferred testing framework?"
      );

      expect(result.type).toBe(QueryType.USER);
      expect(result.layers).toEqual([MemoryLayer.USER]);
      expect(result.weights[MemoryLayer.USER]).toBe(1.0);
    });

    it("should classify 'My expertise in frontend'", async () => {
      const result = await classifier.classify("My expertise in frontend");

      expect(result.type).toBe(QueryType.USER);
      expect(result.layers).toEqual([MemoryLayer.USER]);
    });

    it("should classify 'What do I like to use?'", async () => {
      const result = await classifier.classify("What do I like to use?");

      expect(result.type).toBe(QueryType.USER);
    });
  });

  describe("Historical queries", () => {
    it("should classify 'What decisions were made about auth?'", async () => {
      const result = await classifier.classify(
        "What decisions were made about auth?"
      );

      // Should be HISTORICAL or GENERAL (acceptable)
      expect([QueryType.HISTORICAL, QueryType.GENERAL]).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should classify 'Why did we choose PostgreSQL?'", async () => {
      const result = await classifier.classify(
        "Why did we choose PostgreSQL?"
      );

      // Should be HISTORICAL or GENERAL (acceptable)
      expect([QueryType.HISTORICAL, QueryType.GENERAL]).toContain(result.type);
    });

    it("should classify 'Show me change history'", async () => {
      const result = await classifier.classify("Show me change history");

      // Should be HISTORICAL or ARCHITECTURAL (acceptable)
      expect([QueryType.HISTORICAL, QueryType.ARCHITECTURAL, QueryType.GENERAL]).toContain(result.type);
    });
  });

  describe("General queries", () => {
    it("should classify ambiguous queries as GENERAL", async () => {
      const result = await classifier.classify("help");

      expect(result.type).toBe(QueryType.GENERAL);
      expect(result.layers.length).toBe(6); // All layers
    });

    it("should handle empty queries", async () => {
      const result = await classifier.classify("");

      expect(result.type).toBe(QueryType.GENERAL);
      expect(result.layers.length).toBe(6);
    });
  });

  describe("Performance", () => {
    it("should classify in <2000ms", async () => {
      const start = Date.now();
      await classifier.classify("Continue working on authentication");
      const duration = Date.now() - start;

      // Ollama is slower but still acceptable
      expect(duration).toBeLessThan(2000);
    });

    it("should handle multiple classifications quickly", async () => {
      const queries = [
        "Continue working on auth",
        "What is JWT?",
        "Show me dependencies",
        "My preferred framework",
        "What decisions were made?",
      ];

      const start = Date.now();
      await Promise.all(queries.map((q) => classifier.classify(q)));
      const duration = Date.now() - start;

      // Should handle 5 queries in <500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe("Layer routing", () => {
    it("should provide correct layers for PROCEDURAL", () => {
      const layers = classifier.getSuggestedLayers(QueryType.PROCEDURAL);

      expect(layers).toContain(MemoryLayer.SESSION);
      expect(layers).toContain(MemoryLayer.PROJECT);
      expect(layers).toContain(MemoryLayer.VECTOR);
      expect(layers.length).toBe(3);
    });

    it("should provide correct weights for PROCEDURAL", () => {
      const weights = classifier.getLayerWeights(QueryType.PROCEDURAL);

      expect(weights[MemoryLayer.SESSION]).toBe(0.4);
      expect(weights[MemoryLayer.PROJECT]).toBe(0.3);
      expect(weights[MemoryLayer.VECTOR]).toBe(0.3);
      expect(weights[MemoryLayer.USER]).toBe(0.0);
    });

    it("should provide correct layers for USER", () => {
      const layers = classifier.getSuggestedLayers(QueryType.USER);

      expect(layers).toEqual([MemoryLayer.USER]);
      expect(layers.length).toBe(1);
    });

    it("should provide correct weights for USER", () => {
      const weights = classifier.getLayerWeights(QueryType.USER);

      expect(weights[MemoryLayer.USER]).toBe(1.0);
      expect(weights[MemoryLayer.SESSION]).toBe(0.0);
    });
  });

  describe("Confidence scores", () => {
    it("should return confidence between 0 and 1", async () => {
      const result = await classifier.classify("Continue working on auth");

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should include reasoning", async () => {
      const result = await classifier.classify("Continue working on auth");

      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe("string");
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("Fallback behavior", () => {
    it("should handle classification errors gracefully", async () => {
      // This should not throw, even if Ollama fails
      const result = await classifier.classify("test query");

      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.layers).toBeDefined();
      expect(result.weights).toBeDefined();
    });
  });
});
