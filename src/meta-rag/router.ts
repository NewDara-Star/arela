import { HexiMemory, MemoryLayer } from "../memory/hexi-memory.js";
import { QueryClassifier } from "./classifier.js";
import type { RoutingResult, LayerResult } from "./types.js";

export interface MemoryRouterOptions {
  heximemory: HexiMemory;
  classifier: QueryClassifier;
  timeout?: number; // Per-layer timeout (default: 50ms)
  cache?: boolean; // Enable caching (default: true)
}

/**
 * MemoryRouter - Routes queries to appropriate memory layers based on classification
 *
 * Features:
 * - Automatic layer selection via QueryClassifier
 * - Parallel execution across multiple layers (Promise.all)
 * - Timeout handling (50ms default per layer)
 * - Graceful error handling (continues with partial results)
 * - Result caching (5-minute TTL)
 * - Performance tracking
 *
 * Example:
 * ```typescript
 * const router = new MemoryRouter({ heximemory, classifier });
 * const result = await router.route("Continue working on auth");
 * // Returns: { classification, results, stats }
 * ```
 */
export class MemoryRouter {
  private heximemory: HexiMemory;
  private classifier: QueryClassifier;
  private timeout: number;
  private cache: Map<string, RoutingResult>;
  private cacheEnabled: boolean;

  constructor(options: MemoryRouterOptions) {
    this.heximemory = options.heximemory;
    this.classifier = options.classifier;
    this.timeout = options.timeout || 50;
    this.cacheEnabled = options.cache !== false; // Default true
    this.cache = new Map();
  }

  /**
   * Route a query to appropriate memory layers
   */
  async route(query: string): Promise<RoutingResult> {
    const start = Date.now();

    // Check cache
    if (this.cacheEnabled && this.cache.has(query)) {
      const cached = this.cache.get(query)!;
      return {
        ...cached,
        stats: { ...cached.stats, cacheHit: true },
      };
    }

    // Classify query
    const classification = await this.classifier.classify(query);

    // Query layers in parallel
    const layerPromises = classification.layers.map((layer) =>
      this.queryLayer(layer, query, classification.weights[layer])
    );

    const results = await Promise.all(layerPromises);

    const routingResult: RoutingResult = {
      query,
      classification,
      results,
      stats: {
        totalTime: Date.now() - start,
        layersQueried: results.length,
        cacheHit: false,
      },
    };

    // Cache result
    if (this.cacheEnabled) {
      this.cache.set(query, routingResult);
      setTimeout(() => this.cache.delete(query), 5 * 60 * 1000); // 5-minute TTL
    }

    return routingResult;
  }

  /**
   * Query a single memory layer with timeout
   */
  private async queryLayer(
    layer: MemoryLayer,
    query: string,
    weight: number
  ): Promise<LayerResult> {
    const start = Date.now();

    try {
      // Race between query and timeout
      const items = await Promise.race([
        this.queryLayerImpl(layer, query),
        this.timeoutPromise(this.timeout),
      ]);

      return {
        layer,
        items,
        time: Date.now() - start,
        weight,
      };
    } catch (error) {
      return {
        layer,
        items: null,
        time: Date.now() - start,
        weight,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Implementation of layer-specific queries
   * Maps each layer to its corresponding HexiMemory method
   */
  private async queryLayerImpl(
    layer: MemoryLayer,
    query: string
  ): Promise<any> {
    switch (layer) {
      case MemoryLayer.SESSION:
        return await this.heximemory.querySession(query);
      case MemoryLayer.PROJECT:
        return await this.heximemory.queryProject(query);
      case MemoryLayer.USER:
        return await this.heximemory.queryUser(query);
      case MemoryLayer.VECTOR:
        return await this.heximemory.queryVector(query);
      case MemoryLayer.GRAPH:
        return await this.heximemory.queryGraph(query);
      case MemoryLayer.GOVERNANCE:
        return await this.heximemory.queryGovernance(query);
      default:
        throw new Error(`Unknown layer: ${layer}`);
    }
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache contents (for debugging)
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}
