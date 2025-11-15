import { describe, it, expect } from "vitest";
import type { SemanticContract } from "../../src/summarization/extractor/types.js";
import {
  LLMSynthesizer,
} from "../../src/summarization/synthesizer/index.js";

describe("LLMSynthesizer - CODEX-002 LLM Synthesizer", () => {
  const baseContract: SemanticContract = {
    filePath: "src/utils/math.ts",
    description: "Utility functions for basic arithmetic operations.",
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
      linesOfCode: 10,
      extractedAt: new Date().toISOString(),
    },
  };

  it("synthesizes a technical summary using mocked LLM", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        mainResponsibility: "Provides basic arithmetic utility functions.",
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
      });

    const synthesizer = new LLMSynthesizer({ llmCaller: mockLLM });

    const summary = await synthesizer.synthesize(baseContract);

    expect(summary.filePath).toBe(baseContract.filePath);
    expect(summary.mainResponsibility).toBe(
      "Provides basic arithmetic utility functions.",
    );
    expect(summary.publicAPI).toEqual(["add"]);
    expect(summary.ioContracts).toEqual([
      {
        name: "add",
        definition: "add(a: number, b: number): number",
      },
    ]);
    expect(summary.dependencies).toBe("None");
    expect(summary.sideEffects).toBe("None - pure functions");
    expect(summary.keyAlgorithms).toBe("Simple arithmetic");

    expect(summary.metadata.tokenCount).toBeGreaterThan(0);
    expect(summary.metadata.compressionRatio).toBeGreaterThan(0);
    expect(typeof summary.metadata.synthesizedAt).toBe("string");
  });

  it("falls back to local summarization when no LLM is configured", async () => {
    const synthesizer = new LLMSynthesizer({ forceLocal: true });

    const summary = await synthesizer.synthesize(baseContract);

    expect(summary.filePath).toBe(baseContract.filePath);
    expect(summary.publicAPI).toContain("add");
    expect(summary.ioContracts.length).toBeGreaterThan(0);
    expect(summary.dependencies.length).toBeGreaterThan(0);
    expect(summary.sideEffects.length).toBeGreaterThan(0);
    expect(summary.metadata.tokenCount).toBeGreaterThan(0);
    expect(summary.metadata.compressionRatio).toBeGreaterThan(0);
  });
});

