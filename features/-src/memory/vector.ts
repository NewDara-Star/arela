import path from "node:path";
import fs from "fs-extra";
import { buildIndex, search, type BuildIndexOptions } from "../rag/index.js";
import type { SemanticResult, VectorStats } from "./types.js";

const DEFAULT_TOP_K = 5;

export class VectorMemory {
  constructor(private readonly cwd: string = process.cwd()) {}

  private get indexPath(): string {
    return path.join(this.cwd, ".arela", ".rag-index.json");
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

    return {
      ready: true,
      filesIndexed: files.size,
      embeddings: index.embeddings?.length ?? 0,
      model: index.model,
      lastIndexedAt: index.timestamp,
      indexPath: this.indexPath,
    };
  }

  async rebuildIndex(options?: Partial<BuildIndexOptions>): Promise<VectorStats> {
    await buildIndex({
      cwd: this.cwd,
      ...(options ?? {}),
    } as BuildIndexOptions);

    return this.getStats();
  }

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
}

function summarizeSnippet(chunk: string): string {
  const normalized = chunk.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157)}...`;
}
