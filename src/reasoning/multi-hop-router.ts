import type { ContextRouter } from "../context-router.js";
import type {
  DecompositionResult,
  HopResult,
  MultiHopResult,
  MultiHopRouterOptions,
  SubQuery,
} from "./types.js";
import { ResultCombiner } from "./combiner.js";

/**
 * MultiHopRouter - Executes sub-queries and combines results
 *
 * Execution strategies:
 * - Sequential: Execute hops one by one (A → B → C)
 * - Parallel: Execute all hops concurrently (A, B, C)
 * - Hybrid: Mix of sequential and parallel
 */
export class MultiHopRouter {
  private contextRouter: ContextRouter;
  private combiner: ResultCombiner;
  private options: Required<MultiHopRouterOptions>;

  constructor(contextRouter: ContextRouter, options: MultiHopRouterOptions = {}) {
    this.contextRouter = contextRouter;
    this.combiner = new ResultCombiner();
    this.options = {
      maxConcurrentHops: options.maxConcurrentHops ?? 3,
      hopTimeout: options.hopTimeout ?? 10000,
    };
  }

  /**
   * Route a decomposed query through multiple hops
   */
  async route(decomposition: DecompositionResult): Promise<MultiHopResult> {
    const startTime = Date.now();
    const decompositionTime = 0; // Already done by decomposer

    // Execute hops based on strategy
    const startExecution = Date.now();
    let hops: HopResult[];

    switch (decomposition.strategy) {
      case "sequential":
        hops = await this.executeSequential(decomposition.subQueries);
        break;
      case "parallel":
        hops = await this.executeParallel(decomposition.subQueries);
        break;
      case "hybrid":
        hops = await this.executeHybrid(decomposition.subQueries);
        break;
      default:
        hops = await this.executeSequential(decomposition.subQueries);
    }

    const executionTime = Date.now() - startExecution;

    // Combine results
    const startCombination = Date.now();
    const originalHops = [...hops]; // Keep for dedup calc
    const combinedContext = this.combiner.combine(hops);
    const combinationTime = Date.now() - startCombination;

    // Calculate stats
    const totalTime = Date.now() - startTime;
    const deduplicationRate = this.combiner.calculateDeduplicationRate(
      originalHops,
      combinedContext
    );

    return {
      originalQuery: decomposition.originalQuery,
      decomposition,
      hops,
      combinedContext,
      stats: {
        totalHops: hops.length,
        totalTime,
        decompositionTime,
        executionTime,
        combinationTime,
        resultsPerHop: hops.length > 0 ? hops.reduce((sum, h) => sum + h.context.length, 0) / hops.length : 0,
        deduplicationRate,
        tokensEstimated: this.estimateTokens(combinedContext),
      },
    };
  }

  /**
   * Execute sub-queries sequentially
   */
  private async executeSequential(subQueries: SubQuery[]): Promise<HopResult[]> {
    const results: HopResult[] = [];

    // Sort by priority (higher first)
    const sorted = [...subQueries].sort((a, b) => b.priority - a.priority);

    for (const subQuery of sorted) {
      // Wait for dependencies to complete
      await this.waitForDependencies(subQuery.dependencies, results);

      // Execute hop
      const hop = await this.executeHop(subQuery);
      results.push(hop);
    }

    return results;
  }

  /**
   * Execute sub-queries in parallel
   */
  private async executeParallel(subQueries: SubQuery[]): Promise<HopResult[]> {
    // Execute all hops concurrently
    const promises = subQueries.map((subQuery) => this.executeHop(subQuery));

    return Promise.all(promises);
  }

  /**
   * Execute sub-queries using hybrid strategy
   */
  private async executeHybrid(subQueries: SubQuery[]): Promise<HopResult[]> {
    const results: HopResult[] = [];
    const executed = new Set<string>();

    // Group sub-queries by dependency level
    const levels = this.groupByDependencyLevel(subQueries);

    // Execute each level
    for (const level of levels) {
      // Within each level, execute in parallel (limited concurrency)
      const batches = this.createBatches(level, this.options.maxConcurrentHops);

      for (const batch of batches) {
        const promises = batch.map((subQuery) => this.executeHop(subQuery));
        const batchResults = await Promise.all(promises);

        results.push(...batchResults);
        batch.forEach((sq) => executed.add(sq.id));
      }
    }

    return results;
  }

  /**
   * Execute a single hop (sub-query)
   */
  private async executeHop(subQuery: SubQuery): Promise<HopResult> {
    const startTime = Date.now();

    try {
      // Use context router to get results
      const response = await Promise.race([
        this.contextRouter.route({ query: subQuery.query }),
        this.timeout(this.options.hopTimeout),
      ]);

      const executionTime = Date.now() - startTime;

      // Calculate relevance score
      const relevanceScore = this.calculateRelevance(response.context);

      return {
        subQueryId: subQuery.id,
        subQuery: subQuery.query,
        classification: response.classification,
        context: response.context,
        relevanceScore,
        executionTime,
      };
    } catch (error) {
      // Return empty result on error
      return {
        subQueryId: subQuery.id,
        subQuery: subQuery.query,
        classification: {
          query: subQuery.query,
          type: "general" as any,
          confidence: 0,
          layers: [],
          weights: {
            session: 0,
            project: 0,
            user: 0,
            vector: 0,
            graph: 0,
            governance: 0,
          },
          reasoning: "Error executing hop",
        },
        context: [],
        relevanceScore: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Wait for dependencies to complete
   */
  private async waitForDependencies(
    dependencies: string[],
    results: HopResult[]
  ): Promise<void> {
    // Check if all dependencies are satisfied
    const completed = new Set(results.map((r) => r.subQueryId));

    for (const depId of dependencies) {
      if (!completed.has(depId)) {
        // Wait a bit and check again (polling)
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.waitForDependencies(dependencies, results);
      }
    }
  }

  /**
   * Group sub-queries by dependency level
   * Level 0: No dependencies
   * Level 1: Depends on level 0
   * Level 2: Depends on level 1, etc.
   */
  private groupByDependencyLevel(subQueries: SubQuery[]): SubQuery[][] {
    const levels: SubQuery[][] = [];
    const processed = new Set<string>();

    let currentLevel = subQueries.filter((sq) => sq.dependencies.length === 0);

    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      currentLevel.forEach((sq) => processed.add(sq.id));

      // Find next level (queries whose dependencies are all processed)
      currentLevel = subQueries.filter(
        (sq) =>
          !processed.has(sq.id) &&
          sq.dependencies.every((dep) => processed.has(dep))
      );
    }

    return levels;
  }

  /**
   * Create batches for limited concurrency
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Calculate relevance score for context items
   */
  private calculateRelevance(context: any[]): number {
    if (context.length === 0) return 0;

    // Average of individual scores
    const totalScore = context.reduce((sum, item) => sum + (item.score || 0.5), 0);
    return totalScore / context.length;
  }

  /**
   * Estimate token count
   */
  private estimateTokens(context: any[]): number {
    // Rough estimate: 4 characters = 1 token
    const totalChars = context.reduce(
      (sum, item) => sum + (item.content?.length || 0),
      0
    );
    return Math.ceil(totalChars / 4);
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Hop timeout")), ms);
    });
  }
}
