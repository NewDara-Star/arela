import { ContextCompressor } from "./interface.js";

export class JsonCompressor implements ContextCompressor {
  compress(data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`JSON compression failed: ${message}`);
    }
  }

  decompress(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`JSON decompression failed: ${message}`);
    }
  }

  getTokenCount(data: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    // For accurate counting, use tiktoken later
    return Math.ceil(data.length / 4);
  }

  getName(): string {
    return "json";
  }
}

