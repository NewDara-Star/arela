import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";
import { VectorMemory } from "../../src/memory/vector.js";

describe("VectorMemory (Hexi-004 wrapper)", () => {
  let testDir: string;
  let vector: VectorMemory;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `arela-vector-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Prepare a minimal RAG index
    const indexPath = path.join(testDir, ".arela", ".rag-index.json");
    await fs.ensureDir(path.dirname(indexPath));
    await fs.writeJson(
      indexPath,
      {
        version: "1.0",
        model: "test-model",
        timestamp: new Date().toISOString(),
        embeddings: [
          { file: "src/a.ts", chunk: "function a() {}", embedding: [1, 0, 0] },
          { file: "src/b.ts", chunk: "function b() {}", embedding: [0, 1, 0] },
        ],
      },
      { spaces: 2 }
    );

    vector = new VectorMemory(testDir);
    await vector.init(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should report readiness based on index file", async () => {
    const ready = await vector.isReady();
    expect(ready).toBe(true);
  });

  it("should return stats including index size and chunk count", async () => {
    const stats = await vector.getStats();
    expect(stats.ready).toBe(true);
    expect(stats.filesIndexed).toBe(2);
    expect(stats.embeddings).toBe(2);
    expect(stats.indexPath).toContain(".rag-index.json");
    expect(stats.indexSizeBytes).toBeGreaterThan(0);

    const size = await vector.getIndexSize();
    expect(size).toBeGreaterThan(0);

    const chunks = await vector.getChunkCount();
    expect(chunks).toBe(2);
  });

  it("should support searchByEmbedding without calling external services", async () => {
    const results = await vector.searchByEmbedding([1, 0, 0], 1);
    expect(results).toHaveLength(1);
    expect(results[0].file).toBe("src/a.ts");
    expect(results[0].chunk).toContain("function a");
    expect(results[0].score).toBeGreaterThan(0.9);
  });
});

