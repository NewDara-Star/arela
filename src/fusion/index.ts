import type {
  FusionOptions,
  FusedResult,
  FusionEngineConfig,
} from "./types.js";
import type { RoutingResult } from "../meta-rag/types.js";
import { ResultMerger } from "./merger.js";

/**
 * FusionEngine - Main engine for fusing multi-layer memory results
 *
 * Combines results from multiple memory layers into a single ranked,
 * deduplicated list optimized for LLM context.
 *
 * Features:
 * - Relevance scoring (semantic + keyword + layer weight + recency)
 * - Semantic deduplication (removes similar items)
 * - Token limiting (fits within context window)
 * - Layer diversity (ensures multi-layer representation)
 * - Quality filtering (minimum score threshold)
 *
 * Example:
 * ```typescript
 * const fusion = new FusionEngine();
 * const routingResult = await router.route("Continue working on auth");
 * const fusedResult = await fusion.fuse(routingResult, {
 *   maxTokens: 10000,
 *   minScore: 0.3,
 * });
 * ```
 */
export class FusionEngine {
  private merger: ResultMerger;
  private config: FusionEngineConfig;
  private defaults: Required<FusionOptions>;

  constructor(config: FusionEngineConfig = {}) {
    this.config = config;
    this.merger = new ResultMerger();

    // Set default options
    this.defaults = {
      maxTokens: 10000,
      minScore: 0.3,
      diversityWeight: 0.2,
      deduplicationThreshold: 0.85,
    };

    // Override with config defaults if provided
    if (config.defaults) {
      this.defaults = { ...this.defaults, ...config.defaults };
    }
  }

  /**
   * Fuse routing results into optimal context for LLM
   *
   * @param routingResult - Results from MemoryRouter
   * @param options - Fusion options (merged with defaults)
   * @returns Fused result with ranked items and stats
   */
  async fuse(
    routingResult: RoutingResult,
    options: FusionOptions = {}
  ): Promise<FusedResult> {
    // Merge options with defaults
    const fusionOptions: FusionOptions = {
      ...this.defaults,
      ...options,
    };

    if (this.config.verbose) {
      console.log(
        `[FusionEngine] Fusing results for query: "${routingResult.query}"`
      );
      console.log(`[FusionEngine] Options:`, fusionOptions);
    }

    // Perform fusion
    const result = this.merger.merge(routingResult, fusionOptions);

    if (this.config.verbose) {
      console.log(`[FusionEngine] Fusion complete:`, result.stats);
    }

    return result;
  }

  /**
   * Synchronous version of fuse (for compatibility)
   */
  fuseSync(
    routingResult: RoutingResult,
    options: FusionOptions = {}
  ): FusedResult {
    const fusionOptions: FusionOptions = {
      ...this.defaults,
      ...options,
    };

    return this.merger.merge(routingResult, fusionOptions);
  }

  /**
   * Get current default options
   */
  getDefaults(): Required<FusionOptions> {
    return { ...this.defaults };
  }

  /**
   * Update default options
   */
  setDefaults(options: Partial<FusionOptions>): void {
    this.defaults = { ...this.defaults, ...options };
  }

  /**
   * Enable/disable verbose logging
   */
  setVerbose(verbose: boolean): void {
    this.config.verbose = verbose;
  }
}

// Re-export types for convenience
export type {
  FusionOptions,
  FusedResult,
  FusedItem,
  FusionStats,
  FusionEngineConfig,
  MemoryItem,
  ScoredItem,
} from "./types.js";

export { RelevanceScorer } from "./scorer.js";
export { SemanticDeduplicator } from "./dedup.js";
export { ResultMerger } from "./merger.js";
