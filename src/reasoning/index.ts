/**
 * Multi-Hop Reasoning Module
 *
 * Breaks complex queries into simpler sub-queries and executes them
 * in an optimal order to build comprehensive context.
 */

export { QueryDecomposer } from "./decomposer.js";
export { MultiHopRouter } from "./multi-hop-router.js";
export { ResultCombiner } from "./combiner.js";

export type {
  SubQuery,
  DecompositionResult,
  ExecutionStrategy,
  HopResult,
  MultiHopResult,
  MultiHopStats,
  DecomposerOptions,
  MultiHopRouterOptions,
  CombinerOptions,
} from "./types.js";
