import { QueryClassifier } from "./meta-rag/classifier.js";
import { MemoryRouter } from "./meta-rag/router.js";
import { FusionEngine } from "./fusion/index.js";
import { HexiMemory } from "./memory/hexi-memory.js";
import type { ClassificationResult } from "./meta-rag/types.js";
import type { FusedItem } from "./fusion/types.js";

export interface ContextRouterOptions {
  heximemory: HexiMemory;
  classifier: QueryClassifier;
  router: MemoryRouter;
  fusion: FusionEngine;
  maxTokens?: number; // Default: 10000
  debug?: boolean; // Default: false
}

export interface ContextResponse {
  query: string;
  classification: ClassificationResult;
  routing: {
    layers: string[];
    reasoning: string;
  };
  context: FusedItem[];
  stats: {
    classificationTime: number;
    retrievalTime: number;
    fusionTime: number;
    totalTime: number;
    tokensEstimated: number;
  };
}

/**
 * ContextRouter - End-to-end context routing orchestrator
 *
 * Integrates:
 * 1. QueryClassifier (OpenAI/Ollama) - Classify query type
 * 2. MemoryRouter - Route to appropriate layers
 * 3. FusionEngine - Deduplicate and merge results
 *
 * Example:
 * ```typescript
 * const router = new ContextRouter({ heximemory, classifier, router, fusion });
 * await router.init();
 * const response = await router.route({ query: "Continue working on auth" });
 * ```
 */
export class ContextRouter {
  private heximemory: HexiMemory;
  private classifier: QueryClassifier;
  private router: MemoryRouter;
  private fusion: FusionEngine;
  private maxTokens: number;
  private debug: boolean;

  constructor(options: ContextRouterOptions) {
    this.heximemory = options.heximemory;
    this.classifier = options.classifier;
    this.router = options.router;
    this.fusion = options.fusion;
    this.maxTokens = options.maxTokens || 10000;
    this.debug = options.debug || false;
  }

  /**
   * Initialize all components
   */
  async init(): Promise<void> {
    await this.classifier.init();
    if (this.debug) {
      console.log("✅ ContextRouter initialized");
    }
  }

  /**
   * Route a query to optimal context
   */
  async route(options: { query: string; maxTokens?: number }): Promise<ContextResponse> {
    const { query, maxTokens = this.maxTokens } = options;
    const startTotal = Date.now();

    if (this.debug) {
      console.log(`\n🔍 Routing query: "${query}"`);
    }

    // Step 1: Classify
    const startClassify = Date.now();
    const classification = await this.classifier.classify(query);
    const classificationTime = Date.now() - startClassify;

    if (this.debug) {
      console.log(`  📊 Classification: ${classification.type} (${classification.confidence})`);
      console.log(`  🎯 Layers: ${classification.layers.join(", ")}`);
      console.log(`  ⏱️  ${classificationTime}ms`);
    }

    // Step 2: Route
    const startRoute = Date.now();
    const routingResult = await this.router.route(query);
    const retrievalTime = Date.now() - startRoute;

    if (this.debug) {
      console.log(`  🔄 Routed to ${routingResult.results.length} layers`);
      console.log(`  ⏱️  ${retrievalTime}ms`);
    }

    // Step 3: Fuse
    const startFuse = Date.now();
    const fusedResult = await this.fusion.fuse(routingResult, { maxTokens });
    const fusionTime = Date.now() - startFuse;

    if (this.debug) {
      console.log(`  🔥 Fused ${fusedResult.stats.totalItems} → ${fusedResult.stats.finalItems} items`);
      console.log(`  💾 Estimated tokens: ${fusedResult.stats.estimatedTokens}`);
      console.log(`  ⏱️  ${fusionTime}ms`);
    }

    const totalTime = Date.now() - startTotal;

    if (this.debug) {
      console.log(`  ✅ Total: ${totalTime}ms\n`);
    }

    return {
      query,
      classification,
      routing: {
        layers: classification.layers,
        reasoning: classification.reasoning,
      },
      context: fusedResult.items,
      stats: {
        classificationTime,
        retrievalTime,
        fusionTime,
        totalTime,
        tokensEstimated: fusedResult.stats.estimatedTokens,
      },
    };
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    totalQueries: number;
    avgClassificationTime: number;
    avgRetrievalTime: number;
    avgFusionTime: number;
    avgTotalTime: number;
  } {
    // TODO: Track stats
    return {
      totalQueries: 0,
      avgClassificationTime: 0,
      avgRetrievalTime: 0,
      avgFusionTime: 0,
      avgTotalTime: 0,
    };
  }
}

