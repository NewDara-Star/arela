import { describe, it, expect, beforeEach } from "vitest";
import path from "path";
import fs from "fs-extra";
import { CodeSummarizer } from "../../src/summarization/code-summarizer.js";

const TEST_ROOT = path.join(process.cwd(), "test-tmp", "e2e-summarization");

describe("CodeSummarizer - CASCADE-001 E2E Integration", () => {
  beforeEach(async () => {
    await fs.remove(TEST_ROOT);
    await fs.ensureDir(TEST_ROOT);
  });

  it("summarizes a real code file end-to-end", async () => {
    // Use a real file from the project
    const testFile = path.join(
      process.cwd(),
      "src/summarization/extractor/types.ts"
    );

    // Use forceLocal to avoid LLM calls in tests
    const { LLMSynthesizer } = await import("../../src/summarization/synthesizer/llm-synthesizer.js");
    const summarizer = new CodeSummarizer(process.cwd(), {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
      silent: true,
    });
    
    // Override synthesizer to use local mode
    (summarizer as any).synthesizer = new LLMSynthesizer({ forceLocal: true });

    const summary = await summarizer.summarize(testFile);

    // Verify summary structure
    expect(summary.filePath).toContain("types.ts");
    expect(summary.mainResponsibility).toBeDefined();
    expect(summary.mainResponsibility.length).toBeGreaterThan(10);
    expect(summary.publicAPI).toBeDefined();
    expect(summary.publicAPI.length).toBeGreaterThan(0);
    expect(summary.ioContracts).toBeDefined();
    expect(summary.dependencies).toBeDefined();
    expect(summary.sideEffects).toBeDefined();

    // Verify metadata
    expect(summary.metadata.tokenCount).toBeGreaterThan(0);
    expect(summary.metadata.compressionRatio).toBeGreaterThan(0);
    expect(summary.metadata.synthesizedAt).toBeDefined();
  });

  it("uses cache on second summarization (cache hit)", async () => {
    const testFile = path.join(
      process.cwd(),
      "src/summarization/extractor/types.ts"
    );

    const { LLMSynthesizer } = await import("../../src/summarization/synthesizer/llm-synthesizer.js");
    const summarizer = new CodeSummarizer(process.cwd(), {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
      silent: true,
    });
    (summarizer as any).synthesizer = new LLMSynthesizer({ forceLocal: true });

    // First call (cache miss)
    const summary1 = await summarizer.summarize(testFile);
    const stats1 = summarizer.getCacheStats();
    expect(stats1.misses).toBe(1);
    expect(stats1.hits).toBe(0);

    // Second call (cache hit)
    const summary2 = await summarizer.summarize(testFile);
    const stats2 = summarizer.getCacheStats();
    expect(stats2.hits).toBe(1);
    expect(stats2.misses).toBe(1);

    // Summaries should be identical
    expect(summary2).toEqual(summary1);

    // Hit rate should be 50% (1 hit, 1 miss)
    expect(stats2.hitRate).toBe(50);
  });

  it("summarizes multiple files in batch", async () => {
    const files = [
      "src/summarization/extractor/types.ts",
      "src/summarization/synthesizer/types.ts",
      "src/summarization/cache/types.ts",
    ];

    const { LLMSynthesizer } = await import("../../src/summarization/synthesizer/llm-synthesizer.js");
    const summarizer = new CodeSummarizer(process.cwd(), {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
      silent: true,
    });
    (summarizer as any).synthesizer = new LLMSynthesizer({ forceLocal: true });

    const results = await summarizer.summarizeBatch(files);

    expect(results.size).toBe(3);

    for (const [filePath, summary] of results) {
      expect(filePath).toBeDefined();
      expect(summary.mainResponsibility).toBeDefined();
      expect(summary.publicAPI).toBeDefined();
      expect(summary.metadata.tokenCount).toBeGreaterThan(0);
    }
  });

  it("bypasses cache when noCache option is true", async () => {
    const testFile = path.join(
      process.cwd(),
      "src/summarization/extractor/types.ts"
    );

    const { LLMSynthesizer } = await import("../../src/summarization/synthesizer/llm-synthesizer.js");
    const summarizer = new CodeSummarizer(process.cwd(), {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
      silent: true,
    });
    (summarizer as any).synthesizer = new LLMSynthesizer({ forceLocal: true });

    // First call with cache
    await summarizer.summarize(testFile);
    const stats1 = summarizer.getCacheStats();
    expect(stats1.misses).toBe(1);

    // Second call with noCache (should not hit cache)
    await summarizer.summarize(testFile, { noCache: true });
    const stats2 = summarizer.getCacheStats();
    
    // Stats should remain the same (cache was bypassed entirely)
    expect(stats2.misses).toBe(1); // No change because cache wasn't checked
    expect(stats2.hits).toBe(0);
  });

  it("handles non-existent files gracefully", async () => {
    const summarizer = new CodeSummarizer(process.cwd(), {
      cacheDir: path.join(TEST_ROOT, ".arela", "cache", "summaries"),
      silent: true,
    });

    await expect(
      summarizer.summarize("non-existent-file.ts")
    ).rejects.toThrow("File not found");
  });
});
