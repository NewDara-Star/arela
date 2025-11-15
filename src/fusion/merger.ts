import type {
  FusionOptions,
  FusedResult,
  FusedItem,
  MemoryItem,
  ScoredItem,
} from "./types.js";
import type { RoutingResult } from "../meta-rag/types.js";
import { RelevanceScorer } from "./scorer.js";
import { SemanticDeduplicator } from "./dedup.js";

/**
 * ResultMerger - Merges results from multiple memory layers
 *
 * Pipeline:
 * 1. Collect items from all layers
 * 2. Score by relevance
 * 3. Deduplicate similar items
 * 4. Sort by score
 * 5. Filter by minimum score
 * 6. Truncate to token limit
 */
export class ResultMerger {
  private scorer: RelevanceScorer;
  private deduplicator: SemanticDeduplicator;

  constructor() {
    this.scorer = new RelevanceScorer();
    this.deduplicator = new SemanticDeduplicator();
  }

  /**
   * Merge results from multiple layers into a single ranked list
   */
  merge(routingResult: RoutingResult, options: FusionOptions): FusedResult {
    const startTime = Date.now();

    // Apply deduplication threshold if provided
    if (options.deduplicationThreshold !== undefined) {
      this.deduplicator.setThreshold(options.deduplicationThreshold);
    }

    // 1. Collect all items from all layers
    const allItems = this.collectItems(routingResult);

    // 2. Score items by relevance
    const scored = this.scorer.score(routingResult.query, allItems);

    // 3. Deduplicate similar items (keeps highest scores)
    const deduplicated = this.deduplicator.deduplicate(scored);

    // 4. Sort by score (descending)
    const sorted = deduplicated.sort((a, b) => b.score - a.score);

    // 5. Filter by minimum score
    const minScore = options.minScore ?? 0.3;
    const filtered = sorted.filter((item) => item.score >= minScore);

    // 6. Truncate to token limit
    const maxTokens = options.maxTokens ?? 10000;
    const truncated = this.truncateToTokens(filtered, maxTokens);

    const fusionTime = Date.now() - startTime;

    return {
      items: truncated,
      stats: {
        totalItems: allItems.length,
        deduplicatedItems: deduplicated.length,
        finalItems: truncated.length,
        estimatedTokens: this.estimateTokens(truncated),
        fusionTime,
      },
    };
  }

  /**
   * Collect all items from routing result
   */
  private collectItems(routingResult: RoutingResult): MemoryItem[] {
    const allItems: MemoryItem[] = [];

    for (const layerResult of routingResult.results) {
      // Skip layers with errors
      if (layerResult.error || !layerResult.items) {
        continue;
      }

      // Extract weight for this layer
      const layerWeight =
        routingResult.classification.weights[layerResult.layer] ?? 1.0;

      // Handle different item formats
      const items = this.normalizeItems(
        layerResult.items,
        layerResult.layer,
        layerWeight
      );

      allItems.push(...items);
    }

    return allItems;
  }

  /**
   * Normalize items to consistent MemoryItem format
   */
  private normalizeItems(
    items: any,
    layer: string,
    layerWeight: number
  ): MemoryItem[] {
    if (!items) return [];

    // Handle array of items
    if (Array.isArray(items)) {
      return items
        .map((item) => this.normalizeItem(item, layer, layerWeight))
        .filter((item): item is MemoryItem => item !== null);
    }

    // Handle single item
    const normalized = this.normalizeItem(items, layer, layerWeight);
    return normalized ? [normalized] : [];
  }

  /**
   * Normalize a single item
   */
  private normalizeItem(
    item: any,
    layer: string,
    layerWeight: number
  ): MemoryItem | null {
    if (!item) return null;

    // If already a MemoryItem
    if (item.content !== undefined) {
      return {
        content: item.content,
        timestamp: item.timestamp,
        layer: item.layer || layer,
        layerWeight: item.layerWeight || layerWeight,
        metadata: item.metadata || {},
      };
    }

    // If it's a string
    if (typeof item === "string") {
      return {
        content: item,
        layer: layer as any,
        layerWeight,
        metadata: {},
      };
    }

    // If it's an object with text/message field
    if (typeof item === "object") {
      const content =
        item.text ||
        item.message ||
        item.data ||
        item.value ||
        JSON.stringify(item);

      return {
        content,
        timestamp: item.timestamp || item.created_at || item.createdAt,
        layer: layer as any,
        layerWeight,
        metadata: item,
      };
    }

    return null;
  }

  /**
   * Truncate items to fit within token limit
   */
  private truncateToTokens(
    items: ScoredItem[],
    maxTokens: number
  ): FusedItem[] {
    const result: FusedItem[] = [];
    let tokens = 0;

    for (const item of items) {
      const itemTokens = this.estimateItemTokens(item);

      if (tokens + itemTokens > maxTokens) {
        break;
      }

      result.push({
        content: this.getContent(item),
        score: item.score,
        layer: item.layer as any,
        metadata: item.metadata || {},
      });

      tokens += itemTokens;
    }

    return result;
  }

  /**
   * Estimate tokens for a single item
   */
  private estimateItemTokens(item: MemoryItem): number {
    const content = this.getContent(item);
    // Rough estimate: ~4 chars per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Estimate total tokens in items
   */
  private estimateTokens(items: FusedItem[]): number {
    return items.reduce((total, item) => {
      return total + this.estimateItemTokens(item);
    }, 0);
  }

  /**
   * Extract content from item
   */
  private getContent(item: MemoryItem): string {
    if (typeof item.content === "string") {
      return item.content;
    }
    if (item.content && typeof item.content === "object") {
      return JSON.stringify(item.content);
    }
    return "";
  }

  /**
   * Apply diversity boosting (prioritize items from different layers)
   */
  private applyDiversityBoost(
    items: ScoredItem[],
    diversityWeight: number
  ): ScoredItem[] {
    if (diversityWeight === 0) return items;

    const layerCounts: Record<string, number> = {};

    return items.map((item) => {
      const layer = item.layer || "unknown";
      layerCounts[layer] = (layerCounts[layer] || 0) + 1;

      // Reduce score for items from over-represented layers
      const penalty = Math.log(layerCounts[layer] + 1) * diversityWeight;
      const adjustedScore = Math.max(0, item.score - penalty);

      return {
        ...item,
        score: adjustedScore,
      };
    });
  }
}
