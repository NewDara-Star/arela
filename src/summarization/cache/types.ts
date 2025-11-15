import type { SemanticContract } from "../extractor/types.js";
import type { TechnicalSummary } from "../synthesizer/types.js";

export interface CacheEntry {
  semanticHash: string;
  summary: TechnicalSummary;
  /**
   * Original semantic contract metadata for debugging/inspection.
   * Not used for hashing to avoid circular dependencies.
   */
  contract?: SemanticContract;
  cachedAt: string;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  /**
   * Approximate dollar savings from avoided LLM calls.
   */
  savings: number;
  /**
   * Cache hit rate as percentage (0-100).
   */
  hitRate?: number;
}

