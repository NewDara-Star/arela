import path from "node:path";
import fs from "fs-extra";
import { buildIndex, search, type BuildIndexOptions } from "../rag/index.js";
import type { SemanticResult, VectorStats } from "./types.js";

const DEFAULT_TOP_K = 5;

/**
 * Search result used by the Hexi-004 Vector Memory wrapper.
 * This is a thin wrapper over the underlying RAG index results.
 */
export interface VectorSearchResult {
  file: string;
  chunk: string;
  score: number;
  lineStart: number;
  lineEnd: number;
}

export class VectorMemory {
  constructor(private readonly cwd: string = process.cwd()) {}

  private get indexPath(): string {
    return path.join(this.cwd, ".arela", ".rag-index.json");
  }

  /**
   * Hexi-004: Initialization wrapper.
   * For the current implementation, construction with `cwd` is enough,
   * so this is effectively a no-op that verifies the project path.
   */
  async init(projectPath: string): Promise<void> {
    // Keep behaviour simple: just ensure the index directory exists.
    const expectedDir = path.dirname(this.indexPath);
    if (projectPath && path.resolve(projectPath) !== path.resolve(this.cwd)) {
      // Caller passed a different project path than the one used by the instance.
      // We don't throw here to remain backwards compatible; we simply trust `cwd`.
    }
    await fs.ensureDir(expectedDir);
  }

  async isReady(): Promise<boolean> {
    return fs.pathExists(this.indexPath);
  }

  async getStats(): Promise<VectorStats> {
    if (!(await this.isReady())) {
      return {
        ready: false,
        filesIndexed: 0,
        embeddings: 0,
        indexPath: this.indexPath,
      };
    }

    const index = await fs.readJson(this.indexPath);
    const files = new Set<string>();
    for (const embedding of index.embeddings ?? []) {
      if (embedding.file) {
        files.add(embedding.file);
      }
    }

    let indexSizeBytes: number | undefined;
    try {
      const stats = await fs.stat(this.indexPath);
      indexSizeBytes = stats.size;
    } catch {
      indexSizeBytes = undefined;
    }

    return {
      ready: true,
      filesIndexed: files.size,
      embeddings: index.embeddings?.length ?? 0,
      model: index.model,
      lastIndexedAt: index.timestamp,
      indexPath: this.indexPath,
      indexSizeBytes,
    };
  }

  async rebuildIndex(options?: Partial<BuildIndexOptions>): Promise<VectorStats> {
    await buildIndex({
      cwd: this.cwd,
      ...(options ?? {}),
    } as BuildIndexOptions);

    return this.getStats();
  }

  /**
   * Existing semantic query used by Tri-Memory.
   */
  async query(question: string, topK: number = DEFAULT_TOP_K): Promise<SemanticResult[]> {
    if (!(await this.isReady())) {
      throw new Error(
        "Vector memory is not initialized. Run `arela index` or `arela memory init --refresh-vector` first."
      );
    }

    const results = await search(question, { cwd: this.cwd }, topK);
    return results.map((item) => ({
      file: item.file,
      snippet: summarizeSnippet(item.chunk),
      score: Number(item.score?.toFixed(4) ?? 0),
    }));
  }

  /**
   * Hexi-004: Wrapper search API that returns full chunks with basic source info.
   */
  async search(queryText: string, limit: number = DEFAULT_TOP_K): Promise<VectorSearchResult[]> {
    if (!(await this.isReady())) {
      throw new Error(
        "Vector memory is not initialized. Run `arela index` or `arela memory init --refresh-vector` first."
      );
    }

    const results = await search(queryText, { cwd: this.cwd }, limit);
    return results.map((item) => ({
      file: item.file,
      chunk: item.chunk,
      score: Number(item.score?.toFixed(4) ?? 0),
      // Line information is not currently tracked in the index.
      lineStart: 0,
      lineEnd: 0,
    }));
  }

  /**
   * Hexi-004: Search by a pre-computed embedding vector.
   * This avoids re-generating embeddings via Ollama for advanced Meta-RAG flows.
   */
  async searchByEmbedding(embedding: number[], limit: number = DEFAULT_TOP_K): Promise<VectorSearchResult[]> {
    if (!(await this.isReady())) {
      throw new Error(
        "Vector memory is not initialized. Run `arela index` or `arela memory init --refresh-vector` first."
      );
    }

    const index = await fs.readJson(this.indexPath);
    const results: VectorSearchResult[] = (index.embeddings ?? []).map(
      (item: { file: string; chunk: string; embedding: number[] }) => ({
        file: item.file,
        chunk: item.chunk,
        score: cosineSimilarity(embedding, item.embedding),
        lineStart: 0,
        lineEnd: 0,
      })
    );

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Hexi-004: Convenience helper to get index size in bytes.
   */
  async getIndexSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.indexPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Hexi-004: Convenience helper to get total chunk count.
   */
  async getChunkCount(): Promise<number> {
    if (!(await this.isReady())) {
      return 0;
    }

    const index = await fs.readJson(this.indexPath);
    return index.embeddings?.length ?? 0;
  }
}

function summarizeSnippet(chunk: string): string {
  const normalized = chunk.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157)}...`;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
