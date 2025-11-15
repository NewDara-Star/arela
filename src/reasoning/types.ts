import type { FusedItem } from "../fusion/types.js";
import type { ClassificationResult } from "../meta-rag/types.js";

/**
 * A sub-query extracted from a complex query
 */
export interface SubQuery {
  id: string;
  query: string;
  dependencies: string[]; // IDs of queries that must complete first
  priority: number; // Higher = execute first
}

/**
 * Result of decomposing a query
 */
export interface DecompositionResult {
  isComplex: boolean; // Whether decomposition was needed
  originalQuery: string;
  subQueries: SubQuery[];
  strategy: ExecutionStrategy;
  reasoning?: string; // Why this decomposition was chosen
}

/**
 * Execution strategy for multi-hop reasoning
 */
export type ExecutionStrategy =
  | "sequential"  // Execute one after another (A → B → C)
  | "parallel"    // Execute all at once (A, B, C)
  | "hybrid";     // Mix of both (A → [B, C] → D)

/**
 * Result from executing a single hop
 */
export interface HopResult {
  subQueryId: string;
  subQuery: string;
  classification: ClassificationResult;
  context: FusedItem[];
  relevanceScore: number; // 0-1, how relevant to the sub-query
  executionTime: number; // ms
}

/**
 * Final multi-hop reasoning result
 */
export interface MultiHopResult {
  originalQuery: string;
  decomposition: DecompositionResult;
  hops: HopResult[];
  combinedContext: FusedItem[];
  stats: MultiHopStats;
}

/**
 * Statistics about multi-hop execution
 */
export interface MultiHopStats {
  totalHops: number;
  totalTime: number; // ms
  decompositionTime: number; // ms
  executionTime: number; // ms
  combinationTime: number; // ms
  resultsPerHop: number; // average
  deduplicationRate: number; // % of duplicates removed
  tokensEstimated: number; // total token count
}

/**
 * Options for query decomposer
 */
export interface DecomposerOptions {
  maxSubQueries?: number; // Default: 4
  minComplexityIndicators?: number; // Default: 2
  useOpenAI?: boolean; // Prefer OpenAI over Ollama
}

/**
 * Options for multi-hop router
 */
export interface MultiHopRouterOptions {
  maxConcurrentHops?: number; // Default: 3
  hopTimeout?: number; // ms, default: 10000
}

/**
 * Options for result combiner
 */
export interface CombinerOptions {
  maxResults?: number; // Default: 20
  includeSeparators?: boolean; // Add hop separators, default: true
}
