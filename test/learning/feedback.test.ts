import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FeedbackLearner } from "../../src/learning/feedback-learner.js";
import { MemoryLayer } from "../../src/memory/hexi-memory.js";
import { QueryType } from "../../src/meta-rag/types.js";
import type { ClassificationResult, RoutingResult } from "../../src/meta-rag/types.js";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

describe("FeedbackLearner", () => {
  let testDir: string;
  let learner: FeedbackLearner;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `arela-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize the learner
    learner = new FeedbackLearner(testDir);
    await learner.init();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  const createMockClassification = (): ClassificationResult => ({
    query: "test query",
    type: QueryType.PROCEDURAL,
    confidence: 0.9,
    layers: [MemoryLayer.SESSION, MemoryLayer.PROJECT],
    weights: {
      [MemoryLayer.SESSION]: 1.0,
      [MemoryLayer.PROJECT]: 0.8,
      [MemoryLayer.USER]: 0.0,
      [MemoryLayer.VECTOR]: 0.0,
      [MemoryLayer.GRAPH]: 0.0,
      [MemoryLayer.GOVERNANCE]: 0.0,
    },
    reasoning: "Test reasoning",
  });

  const createMockRouting = (): RoutingResult => ({
    query: "test query",
    classification: createMockClassification(),
    results: [],
    stats: {
      totalTime: 100,
      layersQueried: 2,
      cacheHit: false,
    },
  });

  describe("recordFeedback", () => {
    it("should record helpful feedback", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: true,
      });

      const stats = await learner.getStats();
      expect(stats.totalFeedback).toBe(1);
      expect(stats.helpfulRate).toBe(100);
    });

    it("should record not helpful feedback", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: false,
      });

      const stats = await learner.getStats();
      expect(stats.totalFeedback).toBe(1);
      expect(stats.helpfulRate).toBe(0);
    });

    it("should record feedback with comment", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: true,
        comment: "This was very helpful!",
      });

      const stats = await learner.getStats();
      expect(stats.totalFeedback).toBe(1);
    });
  });

  describe("adjustWeights", () => {
    it("should increase weight for correct layers", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      const initialWeights = learner.getWeights();
      const initialProjectWeight = initialWeights.get(MemoryLayer.PROJECT) || 1.0;

      await learner.recordFeedback("test query", classification, routing, {
        helpful: false,
        correctLayers: [MemoryLayer.PROJECT, MemoryLayer.VECTOR],
      });

      const newWeights = learner.getWeights();
      const newProjectWeight = newWeights.get(MemoryLayer.PROJECT) || 1.0;
      const newVectorWeight = newWeights.get(MemoryLayer.VECTOR) || 1.0;

      // Project was correctly predicted, so should increase
      expect(newProjectWeight).toBeGreaterThan(initialProjectWeight);
      // Vector was not predicted but should have been, so should increase
      expect(newVectorWeight).toBeGreaterThan(1.0);
    });

    it("should decrease weight for incorrect layers", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      const initialWeights = learner.getWeights();
      const initialSessionWeight = initialWeights.get(MemoryLayer.SESSION) || 1.0;

      await learner.recordFeedback("test query", classification, routing, {
        helpful: false,
        correctLayers: [MemoryLayer.PROJECT], // Only PROJECT, not SESSION
      });

      const newWeights = learner.getWeights();
      const newSessionWeight = newWeights.get(MemoryLayer.SESSION) || 1.0;

      // SESSION was predicted but shouldn't have been, so should decrease
      expect(newSessionWeight).toBeLessThan(initialSessionWeight);
    });

    it("should persist weights to disk", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: false,
        correctLayers: [MemoryLayer.VECTOR],
      });

      // Create a new learner instance to load from disk
      const newLearner = new FeedbackLearner(testDir);
      await newLearner.init();

      const loadedWeights = newLearner.getWeights();
      const originalWeights = learner.getWeights();

      // Should have the same weights
      expect(loadedWeights.get(MemoryLayer.VECTOR)).toBe(
        originalWeights.get(MemoryLayer.VECTOR)
      );
    });
  });

  describe("getStats", () => {
    it("should calculate helpful rate correctly", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      // Record 3 helpful, 2 not helpful
      await learner.recordFeedback("query 1", classification, routing, {
        helpful: true,
      });
      await learner.recordFeedback("query 2", classification, routing, {
        helpful: true,
      });
      await learner.recordFeedback("query 3", classification, routing, {
        helpful: true,
      });
      await learner.recordFeedback("query 4", classification, routing, {
        helpful: false,
      });
      await learner.recordFeedback("query 5", classification, routing, {
        helpful: false,
      });

      const stats = await learner.getStats();
      expect(stats.totalFeedback).toBe(5);
      expect(stats.helpfulRate).toBe(60); // 3/5 = 60%
    });

    it("should detect common mistakes", async () => {
      const classification1 = { ...createMockClassification(), type: QueryType.PROCEDURAL };
      const classification2 = { ...createMockClassification(), type: QueryType.PROCEDURAL };
      const routing = createMockRouting();

      // Record the same mistake twice
      await learner.recordFeedback("query 1", classification1, routing, {
        helpful: false,
        correctType: QueryType.FACTUAL,
      });
      await learner.recordFeedback("query 2", classification2, routing, {
        helpful: false,
        correctType: QueryType.FACTUAL,
      });

      const stats = await learner.getStats();
      expect(stats.commonMistakes.length).toBeGreaterThan(0);
      expect(stats.commonMistakes[0].frequency).toBe(2);
    });

    it("should calculate accuracy improvement", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      // First 10: 30% helpful
      for (let i = 0; i < 10; i++) {
        await learner.recordFeedback(`query ${i}`, classification, routing, {
          helpful: i < 3, // 3 helpful, 7 not helpful
        });
      }

      // Last 10: 80% helpful
      for (let i = 10; i < 20; i++) {
        await learner.recordFeedback(`query ${i}`, classification, routing, {
          helpful: (i - 10) < 8, // 8 helpful, 2 not helpful
        });
      }

      const stats = await learner.getStats();
      // Improvement should be positive (last 10 better than first 10)
      expect(stats.accuracyImprovement).toBeGreaterThan(0);
    });

    it("should return 0 improvement with less than 20 feedbacks", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      for (let i = 0; i < 15; i++) {
        await learner.recordFeedback(`query ${i}`, classification, routing, {
          helpful: true,
        });
      }

      const stats = await learner.getStats();
      expect(stats.accuracyImprovement).toBe(0);
    });
  });

  describe("exportForFineTuning", () => {
    it("should export feedback data to JSON", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: true,
        correctLayers: [MemoryLayer.VECTOR],
        correctType: QueryType.FACTUAL,
        comment: "Should use vector search",
      });

      const exportPath = await learner.exportForFineTuning();
      expect(await fs.pathExists(exportPath)).toBe(true);

      const exportData = await fs.readJSON(exportPath);
      expect(exportData).toHaveLength(1);
      expect(exportData[0].query).toBe("test query");
      expect(exportData[0].helpful).toBe(true);
      expect(exportData[0].correctLayers).toContain(MemoryLayer.VECTOR);
      expect(exportData[0].correctType).toBe(QueryType.FACTUAL);
    });
  });

  describe("getWeights", () => {
    it("should return default weights on initialization", () => {
      const weights = learner.getWeights();

      expect(weights.get(MemoryLayer.SESSION)).toBe(1.0);
      expect(weights.get(MemoryLayer.PROJECT)).toBe(1.0);
      expect(weights.get(MemoryLayer.USER)).toBe(1.0);
      expect(weights.get(MemoryLayer.VECTOR)).toBe(1.0);
      expect(weights.get(MemoryLayer.GRAPH)).toBe(1.0);
      expect(weights.get(MemoryLayer.GOVERNANCE)).toBe(1.0);
    });

    it("should return updated weights after adjustments", async () => {
      const classification = createMockClassification();
      const routing = createMockRouting();

      await learner.recordFeedback("test query", classification, routing, {
        helpful: false,
        correctLayers: [MemoryLayer.VECTOR],
      });

      const weights = learner.getWeights();
      expect(weights.get(MemoryLayer.VECTOR)).toBeGreaterThan(1.0);
    });
  });
});
