import { MemoryLayer } from "../memory/hexi-memory.js";
import type { RoutingResult } from "../meta-rag/types.js";

/**
 * Options for the fusion engine
 */
export interface FusionOptions {
  /** Maximum tokens in final result (default: 10000) */
  maxTokens?: number;
  /** Minimum score threshold for items (default: 0.3) */
  minScore?: number;
  /** Weight for diversity across layers (default: 0.2) */
  diversityWeight?: number;
  /** Similarity threshold for deduplication (default: 0.85) */
  deduplicationThreshold?: number;
}

/**
 * Result from the fusion engine
 */
export interface FusedResult {
  /** Fused and ranked items */
  items: FusedItem[];
  /** Statistics about the fusion process */
  stats: FusionStats;
}

/**
 * A single fused item with score and metadata
 */
export interface FusedItem {
  /** Item content */
  content: string;
  /** Relevance score (0-1) */
  score: number;
  /** Source memory layer */
  layer: MemoryLayer;
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Statistics from the fusion process
 */
export interface FusionStats {
  /** Total items before fusion */
  totalItems: number;
  /** Items after deduplication */
  deduplicatedItems: number;
  /** Final items after all filtering */
  finalItems: number;
  /** Estimated tokens in final result */
  estimatedTokens: number;
  /** Fusion processing time (ms) */
  fusionTime?: number;
}

/**
 * Memory item structure (inferred from layer queries)
 */
export interface MemoryItem {
  /** Item content/text */
  content: string;
  /** Timestamp when created */
  timestamp?: number;
  /** Source layer */
  layer?: MemoryLayer;
  /** Layer weight from classification */
  layerWeight?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Scored memory item
 */
export interface ScoredItem extends MemoryItem {
  /** Relevance score (0-1) */
  score: number;
}

/**
 * Fusion engine configuration
 */
export interface FusionEngineConfig {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Default fusion options */
  defaults?: FusionOptions;
}
