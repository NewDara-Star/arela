import type { ContextCompressor, CompressionConfig, CompressionType } from "./interface.js";
import { JsonCompressor } from "./json-compressor.js";

// Registry of available compressors
const compressors: Record<CompressionType, () => ContextCompressor> = {
  json: () => new JsonCompressor(),
  toon: () => {
    throw new Error("TOON compressor not yet implemented");
  },
};

/**
 * Create a compressor based on config
 */
export function createCompressor(config: CompressionConfig): ContextCompressor {
  const factory = compressors[config.type];

  if (!factory) {
    throw new Error(`Unknown compression type: ${config.type}`);
  }

  try {
    return factory();
  } catch (error) {
    if (config.fallback && config.type !== "json") {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  ${config.type} failed, falling back to JSON`);
      return new JsonCompressor();
    }
    throw error;
  }
}

/**
 * Default compressor (JSON)
 */
export function getDefaultCompressor(): ContextCompressor {
  return new JsonCompressor();
}

// Re-export types and implementations
export * from "./interface.js";
export { JsonCompressor } from "./json-compressor.js";

