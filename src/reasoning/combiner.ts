import type { HopResult, CombinerOptions } from "./types.js";
import type { FusedItem } from "../fusion/types.js";

/**
 * ResultCombiner - Intelligently merges results from multiple hops
 *
 * Features:
 * - Deduplicates across hops
 * - Ranks by relevance and hop order
 * - Builds coherent narrative
 */
export class ResultCombiner {
  private options: Required<CombinerOptions>;

  constructor(options: CombinerOptions = {}) {
    this.options = {
      maxResults: options.maxResults ?? 20,
      includeSeparators: options.includeSeparators ?? true,
    };
  }

  /**
   * Combine results from all hops
   */
  combine(hops: HopResult[]): FusedItem[] {
    // Step 1: Deduplicate
    const deduplicated = this.deduplicate(hops);

    // Step 2: Rank by relevance and priority
    const ranked = this.rank(deduplicated);

    // Step 3: Build narrative
    const narrative = this.buildNarrative(ranked);

    // Step 4: Limit to max results
    return narrative.slice(0, this.options.maxResults);
  }

  /**
   * Remove duplicates across hops
   */
  deduplicate(hops: HopResult[]): HopResult[] {
    const seen = new Set<string>();
    const unique: HopResult[] = [];

    for (const hop of hops) {
      const filtered: FusedItem[] = [];

      for (const item of hop.context) {
        const key = this.generateKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          filtered.push(item);
        }
      }

      if (filtered.length > 0) {
        unique.push({
          ...hop,
          context: filtered,
        });
      }
    }

    return unique;
  }

  /**
   * Rank results by relevance and hop order
   */
  rank(hops: HopResult[]): HopResult[] {
    // Sort hops by priority (lower ID = higher priority)
    const sorted = hops.sort((a, b) => {
      const idA = parseInt(a.subQueryId);
      const idB = parseInt(b.subQueryId);
      return idA - idB;
    });

    // Within each hop, sort by relevance score
    return sorted.map((hop) => ({
      ...hop,
      context: hop.context.sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        return scoreB - scoreA; // Higher scores first
      }),
    }));
  }

  /**
   * Build coherent narrative from hops
   */
  buildNarrative(hops: HopResult[]): FusedItem[] {
    const narrative: FusedItem[] = [];

    for (const hop of hops) {
      // Add separator if enabled
      if (this.options.includeSeparators && hops.length > 1) {
        narrative.push({
          content: `--- Hop ${hop.subQueryId}: ${hop.subQuery} ---`,
          layer: hop.context[0]?.layer || ("session" as any),
          score: 1.0,
          metadata: { type: "separator", hopId: hop.subQueryId },
        });
      }

      // Add hop results
      narrative.push(...hop.context);
    }

    return narrative;
  }

  /**
   * Generate a unique key for a context item
   */
  private generateKey(item: FusedItem): string {
    // Use content + layer as key for deduplication
    const contentPreview = item.content.slice(0, 100);
    return `${item.layer}:${contentPreview}`;
  }

  /**
   * Calculate deduplication statistics
   */
  calculateDeduplicationRate(before: HopResult[], after: FusedItem[]): number {
    const totalBefore = before.reduce((sum, hop) => sum + hop.context.length, 0);
    const totalAfter = after.filter((item) => item.metadata?.type !== "separator").length;

    if (totalBefore === 0) return 0;

    return ((totalBefore - totalAfter) / totalBefore) * 100;
  }
}
