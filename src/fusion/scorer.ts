import type { MemoryItem, ScoredItem } from "./types.js";

/**
 * RelevanceScorer - Scores memory items by relevance to query
 *
 * Scoring factors:
 * 1. Semantic similarity (40%) - Using simple text similarity
 * 2. Keyword overlap (30%) - Direct word matches
 * 3. Layer confidence weight (20%) - From classifier
 * 4. Recency (10%) - Newer items preferred for Session/Project
 */
export class RelevanceScorer {
  /**
   * Score multiple items by relevance to query
   */
  score(query: string, items: MemoryItem[]): ScoredItem[] {
    const queryLower = query.toLowerCase();
    const queryWords = this.tokenize(queryLower);

    return items.map((item) => ({
      ...item,
      score: this.calculateScore(queryLower, queryWords, item),
    }));
  }

  /**
   * Calculate relevance score for a single item
   */
  private calculateScore(
    queryLower: string,
    queryWords: string[],
    item: MemoryItem
  ): number {
    const content = this.getItemContent(item);
    if (!content) return 0;

    const contentLower = content.toLowerCase();

    // 1. Semantic similarity (simple text similarity)
    const semanticScore = this.textSimilarity(queryLower, contentLower);

    // 2. Keyword overlap
    const keywordScore = this.keywordOverlap(queryWords, contentLower);

    // 3. Layer weight from classifier
    const layerWeight = item.layerWeight ?? 1.0;

    // 4. Recency score
    const recencyScore = this.recencyScore(item.timestamp);

    // Weighted combination
    const score =
      semanticScore * 0.4 +
      keywordScore * 0.3 +
      layerWeight * 0.2 +
      recencyScore * 0.1;

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Extract content from item (handles various formats)
   */
  private getItemContent(item: MemoryItem): string {
    if (typeof item.content === "string") {
      return item.content;
    }
    if (item.content && typeof item.content === "object") {
      return JSON.stringify(item.content);
    }
    return "";
  }

  /**
   * Calculate text similarity using character n-grams
   * Returns score between 0 and 1
   */
  private textSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Use character trigrams for similarity
    const ngrams1 = this.getNgrams(text1, 3);
    const ngrams2 = this.getNgrams(text2, 3);

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    // Calculate Jaccard similarity
    const intersection = new Set(
      [...ngrams1].filter((x) => ngrams2.has(x))
    );
    const union = new Set([...ngrams1, ...ngrams2]);

    return intersection.size / union.size;
  }

  /**
   * Generate character n-grams from text
   */
  private getNgrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    const normalized = text.trim();

    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.substring(i, i + n));
    }

    return ngrams;
  }

  /**
   * Calculate keyword overlap score
   * Returns score between 0 and 1
   */
  private keywordOverlap(queryWords: string[], content: string): number {
    if (queryWords.length === 0) return 0;

    const contentWords = this.tokenize(content);
    const contentSet = new Set(contentWords);

    const matches = queryWords.filter((word) => contentSet.has(word));
    return matches.length / queryWords.length;
  }

  /**
   * Calculate recency score based on timestamp
   * Returns score between 0 and 1
   */
  private recencyScore(timestamp?: number): number {
    if (!timestamp) return 0.5; // Neutral if no timestamp

    const now = Date.now();
    const age = now - timestamp;

    // Decay over 30 days
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const normalizedAge = Math.min(age, maxAge) / maxAge;

    return 1 - normalizedAge; // Newer = higher score
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2); // Filter short words
  }

  /**
   * Calculate cosine similarity between two texts
   * Alternative to textSimilarity using TF-IDF-like approach
   */
  cosineSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Create term frequency maps
    const tf1 = this.termFrequency(words1);
    const tf2 = this.termFrequency(words2);

    // Get all unique terms
    const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of allTerms) {
      const v1 = tf1[term] || 0;
      const v2 = tf2[term] || 0;

      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Calculate term frequency
   */
  private termFrequency(words: string[]): Record<string, number> {
    const tf: Record<string, number> = {};

    for (const word of words) {
      tf[word] = (tf[word] || 0) + 1;
    }

    // Normalize by document length
    const total = words.length;
    for (const word in tf) {
      tf[word] = tf[word] / total;
    }

    return tf;
  }
}
