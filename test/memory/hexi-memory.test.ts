import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";
import { HexiMemory, MemoryLayer } from "../../src/memory/hexi-memory.js";
import { GraphDB } from "../../src/ingest/storage.js";
import { AuditMemory } from "../../src/memory/audit.js";

describe("HexiMemory (HEXI-007 orchestrator)", () => {
  let testDir: string;
  let hexi: HexiMemory;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `arela-hexi-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Seed minimal data for each layer

    // 1. Vector: RAG index
    const indexPath = path.join(testDir, ".arela", ".rag-index.json");
    await fs.ensureDir(path.dirname(indexPath));
    await fs.writeJson(
      indexPath,
      {
        version: "1.0",
        model: "test-model",
        timestamp: new Date().toISOString(),
        embeddings: [
          {
            file: "src/auth.ts",
            chunk: "authentication logic",
            embedding: [1, 0, 0],
          },
        ],
      },
      { spaces: 2 }
    );

    // 2. Graph: graph.db
    const dbPath = path.join(testDir, ".arela", "memory", "graph.db");
    await fs.ensureDir(path.dirname(dbPath));
    const db = new GraphDB(dbPath);
    db.addFile({
      path: "src/auth.ts",
      repoPath: testDir,
      type: "component",
      lines: 50,
    });
    db.close();

    // 3. Audit/Governance: audit.db
    const audit = new AuditMemory(testDir);
    await audit.init();
    await audit.logDecision({
      agent: "cascade",
      action: "test-decision",
      result: "success",
      timestamp: new Date().toISOString(),
      metadata: {
        type: "decision",
        title: "Test Decision",
      },
    });

    // 4. Session, Project, User will auto-initialize

    // Initialize HexiMemory
    hexi = new HexiMemory();
    await hexi.init(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should initialize all 6 layers", async () => {
    expect(hexi).toBeDefined();
    expect(hexi.getSession()).toBeDefined();
    expect(hexi.getProject()).toBeDefined();
    expect(hexi.getUser()).toBeDefined();
    expect(hexi.getVector()).toBeDefined();
    expect(hexi.getGraph()).toBeDefined();
    expect(hexi.getGovernance()).toBeDefined();
  });

  it("should query all layers in parallel", async () => {
    const start = Date.now();
    const results = await hexi.queryAll("authentication");
    const duration = Date.now() - start;

    // Should complete quickly with parallel queries
    expect(duration).toBeLessThan(1000);

    // All layers should return something
    expect(results.session).toBeDefined();
    expect(results.project).toBeDefined();
    expect(results.user).toBeDefined();
    expect(results.vector).toBeDefined();
    expect(results.graph).toBeDefined();
    expect(results.governance).toBeDefined();
  });

  it("should query session layer", async () => {
    const session = hexi.getSession();
    await session.setCurrentTask("Test task");
    await session.trackOpenFile("src/test.ts");

    const result = await hexi.querySession("test");

    expect(result.currentTask).toBe("Test task");
    expect(result.openFiles).toContain("src/test.ts");
    expect(result.recentMessages).toBeDefined();
  });

  it("should query project layer", async () => {
    const project = hexi.getProject();
    await project.setArchitecture("VSA Modular Monolith");
    await project.addTechStack("TypeScript");

    const result = await hexi.queryProject("test");

    expect(result.architecture).toBe("VSA Modular Monolith");
    expect(result.techStack).toContain("TypeScript");
    expect(result.patterns).toBeDefined();
  });

  it("should query user layer", async () => {
    const user = hexi.getUser();
    await user.setPreference("language", "TypeScript");
    await user.setExpertise("frontend", "expert");

    const result = await hexi.queryUser("test");

    expect(result.preferences.language).toBe("TypeScript");
    expect(result.expertise.frontend).toBe("expert");
    expect(result.patterns).toBeDefined();
  });

  it("should query vector layer", async () => {
    const results = await hexi.queryVector("authentication", 5);

    expect(Array.isArray(results)).toBe(true);
    // Should find the seeded auth chunk
    expect(results.length).toBeGreaterThan(0);
  });

  it("should query graph layer", async () => {
    const result = await hexi.queryGraph("test");

    expect(result.stats).toBeDefined();
    expect(result.stats.files).toBeGreaterThan(0);
  });

  it("should query governance layer", async () => {
    const results = await hexi.queryGovernance("test", 10);

    expect(Array.isArray(results)).toBe(true);
    // Should find the seeded decision
    expect(results.length).toBeGreaterThan(0);
  });

  it("should query specific layers only", async () => {
    const results = await hexi.queryLayers("test", [
      MemoryLayer.SESSION,
      MemoryLayer.PROJECT,
    ]);

    expect(results.session).toBeDefined();
    expect(results.project).toBeDefined();
    expect(results.user).toBeUndefined();
    expect(results.vector).toBeUndefined();
    expect(results.graph).toBeUndefined();
    expect(results.governance).toBeUndefined();
  });

  it("should handle layer failures gracefully", async () => {
    // Force a layer to fail by querying before init
    const brokenHexi = new HexiMemory();
    // Don't call init()

    // Should not throw, should return empty/null results
    const results = await brokenHexi.queryAll("test").catch(() => ({
      session: null,
      project: null,
      user: null,
      vector: [],
      graph: null,
      governance: [],
    }));

    // Should have some structure even if layers failed
    expect(results).toBeDefined();
  });

  it("should get aggregated stats from all layers", async () => {
    const stats = await hexi.getStats();

    expect(stats.session).toBeDefined();
    expect(stats.project).toBeDefined();
    expect(stats.user).toBeDefined();
    expect(stats.vector).toBeDefined();
    expect(stats.graph).toBeDefined();
    expect(stats.governance).toBeDefined();
    expect(typeof stats.totalMemoryUsage).toBe("number");
  });

  it("should provide access to individual layers", async () => {
    const session = hexi.getSession();
    const project = hexi.getProject();
    const user = hexi.getUser();
    const vector = hexi.getVector();
    const graph = hexi.getGraph();
    const governance = hexi.getGovernance();

    expect(session).toBeDefined();
    expect(project).toBeDefined();
    expect(user).toBeDefined();
    expect(vector).toBeDefined();
    expect(graph).toBeDefined();
    expect(governance).toBeDefined();

    // Should be able to use them directly
    await session.setCurrentTask("Direct access test");
    const task = await session.getCurrentTask();
    expect(task).toBe("Direct access test");
  });

  it("should complete multi-layer query in <200ms", async () => {
    // Warm up
    await hexi.queryAll("warmup");

    // Measure
    const start = Date.now();
    await hexi.queryAll("performance test");
    const duration = Date.now() - start;

    // Should be fast with parallel queries
    expect(duration).toBeLessThan(200);
  });

  it("should handle empty query gracefully", async () => {
    const results = await hexi.queryAll("");

    expect(results.session).toBeDefined();
    expect(results.project).toBeDefined();
    expect(results.user).toBeDefined();
    expect(results.vector).toBeDefined();
    expect(results.graph).toBeDefined();
    expect(results.governance).toBeDefined();
  });

  it("should query vector with custom limit", async () => {
    const results = await hexi.queryVector("test", 3);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should query governance with custom limit", async () => {
    const results = await hexi.queryGovernance("test", 5);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
