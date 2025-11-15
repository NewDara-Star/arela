import type { ScoredItem } from "./types.js";
import { RelevanceScorer } from "./scorer.js";

/**
 * SemanticDeduplicator - Removes semantically similar/duplicate items
 *
 * Uses cosine similarity to detect duplicates. When duplicates are found,
 * keeps the item with the higher score.
 */
export class SemanticDeduplicator {
  private scorer: RelevanceScorer;
  private threshold: number;

  constructor(threshold: number = 0.85) {
    this.scorer = new RelevanceScorer();
    this.threshold = threshold; // 85% similarity = duplicate
  }

  /**
   * Remove semantically similar items
   * Keeps highest-scoring item from each duplicate group
   */
  deduplicate(items: ScoredItem[]): ScoredItem[] {
    if (items.length === 0) return [];

    // Sort by score descending - process highest scored items first
    const sorted = [...items].sort((a, b) => b.score - a.score);

    const unique: ScoredItem[] = [];

    for (const item of sorted) {
      const isDuplicate = this.isDuplicate(item, unique);

      if (!isDuplicate) {
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Check if item is duplicate of any existing unique items
   */
  private isDuplicate(item: ScoredItem, uniqueItems: ScoredItem[]): boolean {
    const content1 = this.getContent(item);
    if (!content1) return false;

    for (const existing of uniqueItems) {
      const content2 = this.getContent(existing);
      if (!content2) continue;

      const similarity = this.scorer.cosineSimilarity(content1, content2);

      if (similarity >= this.threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract content from item
   */
  private getContent(item: ScoredItem): string {
    if (typeof item.content === "string") {
      return item.content;
    }
    if (item.content && typeof item.content === "object") {
      return JSON.stringify(item.content);
    }
    return "";
  }

  /**
   * Set deduplication threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Find duplicate groups in items (for debugging/analysis)
   */
  findDuplicateGroups(items: ScoredItem[]): ScoredItem[][] {
    const groups: ScoredItem[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      if (processed.has(i)) continue;

      const group: ScoredItem[] = [items[i]];
      processed.add(i);

      const content1 = this.getContent(items[i]);
      if (!content1) continue;

      // Find all duplicates of this item
      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j)) continue;

        const content2 = this.getContent(items[j]);
        if (!content2) continue;

        const similarity = this.scorer.cosineSimilarity(content1, content2);

        if (similarity >= this.threshold) {
          group.push(items[j]);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Get deduplication statistics
   */
  getStats(
    original: ScoredItem[],
    deduplicated: ScoredItem[]
  ): {
    originalCount: number;
    deduplicatedCount: number;
    removedCount: number;
    deduplicationRate: number;
  } {
    const originalCount = original.length;
    const deduplicatedCount = deduplicated.length;
    const removedCount = originalCount - deduplicatedCount;
    const deduplicationRate =
      originalCount > 0 ? removedCount / originalCount : 0;

    return {
      originalCount,
      deduplicatedCount,
      removedCount,
      deduplicationRate,
    };
  }
}
