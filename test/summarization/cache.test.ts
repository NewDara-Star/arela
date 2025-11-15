import { describe, it, expect, beforeEach } from "vitest";
import path from "path";
import fs from "fs-extra";
import type { SemanticContract } from "../../src/summarization/extractor/types.js";
import type { TechnicalSummary } from "../../src/summarization/synthesizer/types.js";
import {
  computeSemanticHash,
  SemanticCache,
} from "../../src/summarization/cache/index.js";

const TEST_ROOT = path.join(process.cwd(), "test-tmp", "semantic-cache");

function createBaseContract(): SemanticContract {
  return {
    filePath: "src/utils/math.ts",
    description: "Utility functions for arithmetic.",
    exports: [
      {
        name: "add",
        kind: "function",
        jsDoc: "Adds two numbers together.",
        signature: {
          params: [
            { name: "a", type: "number", optional: false },
            { name: "b", type: "number", optional: false },
          ],
          returnType: "number",
          isAsync: false,
        },
      },
    ],
    imports: [],
    metadata: {
      language: "typescript",
      linesOfCode: 5,
      extractedAt: new Date().toISOString(),
    },
  };
}

function createSummary(suffix = ""): TechnicalSummary {
  return {
    filePath: "src/utils/math.ts",
    mainResponsibility: `Provides arithmetic utilities${suffix}`,
    publicAPI: ["add"],
    ioContracts: [
      {
        name: "add",
        definition: "add(a: number, b: number): number",
      },
    ],
    dependencies: "None",
    sideEffects: "None - pure functions",
    keyAlgorithms: "Simple arithmetic",
    metadata: {
      tokenCount: 42,
      compressionRatio: 2,
      synthesizedAt: new Date().toISOString(),
    },
  };
}

describe("SemanticCache - CODEX-003 Semantic Caching", () => {
  beforeEach(async () => {
    await fs.remove(TEST_ROOT);
    await fs.ensureDir(TEST_ROOT);
  });

  it("returns null on first access (cache miss) and then hits after set", async () => {
    const contract = createBaseContract();
    const cache = new SemanticCache(TEST_ROOT, {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
    });

    const first = await cache.get(contract);
    expect(first).toBeNull();

    const summary = createSummary();
    await cache.set(contract, summary);

    const second = await cache.get(contract);
    expect(second).toEqual(summary);
  });

  it("treats contracts with same public API but different comments as cache hits", async () => {
    const base = createBaseContract();
    const cache = new SemanticCache(TEST_ROOT, {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
    });

    const summary = createSummary();
    await cache.set(base, summary);

    const modified: SemanticContract = {
      ...base,
      description: "Updated description that should not affect semantics.",
      exports: [
        {
          ...base.exports[0],
          jsDoc: "Completely different JSDoc that is non-semantic.",
        },
      ],
    };

    // Sanity check: semantic hash should be identical
    const hash1 = computeSemanticHash(base);
    const hash2 = computeSemanticHash(modified);
    expect(hash1).toBe(hash2);

    const cached = await cache.get(modified);
    expect(cached).toEqual(summary);
  });

  it("treats contracts with changed signatures as cache misses", async () => {
    const base = createBaseContract();
    const cache = new SemanticCache(TEST_ROOT, {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
    });

    const summary = createSummary();
    await cache.set(base, summary);

    const changedSignature: SemanticContract = {
      ...base,
      exports: [
        {
          ...base.exports[0],
          signature: {
            ...base.exports[0].signature!,
            params: [
              { name: "a", type: "number", optional: false },
              // second parameter now optional to simulate API change
              { name: "b", type: "number", optional: true },
            ],
          },
        },
      ],
    };

    const hash1 = computeSemanticHash(base);
    const hash2 = computeSemanticHash(changedSignature);
    expect(hash1).not.toBe(hash2);

    const cached = await cache.get(changedSignature);
    expect(cached).toBeNull();
  });

  it("expires entries older than TTL and updates stats", async () => {
    const contract = createBaseContract();
    const cacheDir = path.join(TEST_ROOT, ".arela", "cache", "summaries");
    const cache = new SemanticCache(TEST_ROOT, {
      cacheDir,
    });

    const summary = createSummary();
    const hash = computeSemanticHash(contract);
    const cacheFile = path.join(cacheDir, `${hash}.json`);

    await fs.ensureDir(cacheDir);
    await fs.writeJSON(cacheFile, {
      semanticHash: hash,
      summary,
      cachedAt: new Date(0).toISOString(), // very old
      hits: 0,
    });

    const result = await cache.get(contract);
    expect(result).toBeNull();

    const stats = cache.getStats();
    expect(stats.misses).toBeGreaterThan(0);
    expect(stats.hits).toBe(0);
    expect(typeof stats.hitRate).toBe("number");
  });

  it("enforces maximum cache size by removing oldest entries", async () => {
    const cacheDir = path.join(TEST_ROOT, ".arela", "cache", "summaries");
    const cache = new SemanticCache(TEST_ROOT, {
      cacheDir,
      maxEntries: 3,
    });

    const contracts: SemanticContract[] = [];

    for (let i = 0; i < 5; i++) {
      const contract = {
        ...createBaseContract(),
        filePath: `src/utils/math-${i}.ts`,
      };
      contracts.push(contract);
      await cache.set(contract, createSummary(`#${i}`));
    }

    const files = await fs.readdir(cacheDir);
    expect(files.length).toBeLessThanOrEqual(3);
  });
});

