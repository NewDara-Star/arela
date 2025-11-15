import { describe, it, expect } from "vitest";
import {
  JsonCompressor,
  createCompressor,
  getDefaultCompressor,
  type CompressionConfig,
} from "../../src/compression/index.js";

describe("JsonCompressor", () => {
  it("compresses and decompresses data losslessly", () => {
    const compressor = new JsonCompressor();
    const data = { test: "value", nested: { key: 123 } };

    const compressed = compressor.compress(data);
    const decompressed = compressor.decompress(compressed);

    expect(decompressed).toEqual(data);
  });

  it("counts tokens for compressed data", () => {
    const compressor = new JsonCompressor();
    const data = { test: "value" };

    const compressed = compressor.compress(data);
    const tokens = compressor.getTokenCount(compressed);

    expect(tokens).toBeGreaterThan(0);
  });

  it("throws on invalid JSON during decompression", () => {
    const compressor = new JsonCompressor();

    expect(() => compressor.decompress("invalid json")).toThrowError(
      /JSON decompression failed/,
    );
  });
});

describe("createCompressor", () => {
  it("creates JSON compressor from config", () => {
    const config: CompressionConfig = { type: "json" };
    const compressor = createCompressor(config);

    expect(compressor.getName()).toBe("json");
  });

  it("falls back to JSON when non-JSON compressor fails and fallback is enabled", () => {
    const config: CompressionConfig = { type: "toon", fallback: true };
    const compressor = createCompressor(config);

    expect(compressor.getName()).toBe("json");
  });

  it("throws when non-JSON compressor fails and fallback is disabled", () => {
    const config: CompressionConfig = { type: "toon", fallback: false };

    expect(() => createCompressor(config)).toThrowError(
      /TOON compressor not yet implemented/,
    );
  });
});

describe("getDefaultCompressor", () => {
  it("returns a JSON compressor", () => {
    const compressor = getDefaultCompressor();
    expect(compressor.getName()).toBe("json");
  });
});
