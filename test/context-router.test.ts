import { describe, beforeAll, test, expect } from "vitest";
import { ContextRouter } from "../src/context-router.js";
import { QueryClassifier } from "../src/meta-rag/classifier.js";
import { MemoryRouter } from "../src/meta-rag/router.js";
import { FusionEngine } from "../src/fusion/index.js";
import { HexiMemory, MemoryLayer } from "../src/memory/hexi-memory.js";
import { QueryType } from "../src/meta-rag/types.js";

describe("ContextRouter", () => {
  let router: ContextRouter;
  let heximemory: HexiMemory;
  let classifier: QueryClassifier;
  let memoryRouter: MemoryRouter;
  let fusion: FusionEngine;

  beforeAll(async () => {
    // Initialize components
    heximemory = new HexiMemory();
    await heximemory.init(process.cwd());

    classifier = new QueryClassifier();
    await classifier.init();

    memoryRouter = new MemoryRouter({
      heximemory,
      classifier,
    });

    fusion = new FusionEngine();

    // Create ContextRouter
    router = new ContextRouter({
      heximemory,
      classifier,
      router: memoryRouter,
      fusion,
      debug: false,
    });

    await router.init();
  });

  test("routes procedural query correctly", async () => {
    const response = await router.route({
      query: "Continue working on authentication",
    });

    expect(response.classification.type).toBe(QueryType.PROCEDURAL);
    expect(response.routing.layers).toContain(MemoryLayer.SESSION);
    expect(response.routing.layers).toContain(MemoryLayer.PROJECT);
    expect(response.stats.totalTime).toBeLessThan(5000);
    expect(response.context).toBeDefined();
    expect(Array.isArray(response.context)).toBe(true);
  });

  test("routes factual query correctly", async () => {
    const response = await router.route({
      query: "What is JWT?",
    });

    expect(response.classification.type).toBe(QueryType.FACTUAL);
    expect(response.routing.layers).toContain(MemoryLayer.VECTOR);
    expect(response.context).toBeDefined();
  });

  test("includes fusion stats", async () => {
    const response = await router.route({
      query: "Test query",
    });

    expect(response.stats.classificationTime).toBeGreaterThanOrEqual(0);
    expect(response.stats.retrievalTime).toBeGreaterThanOrEqual(0);
    expect(response.stats.fusionTime).toBeGreaterThanOrEqual(0);
    expect(response.stats.totalTime).toBeGreaterThanOrEqual(0);
    expect(response.stats.tokensEstimated).toBeGreaterThanOrEqual(0);
  });
});

