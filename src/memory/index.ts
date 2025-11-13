import path from "node:path";
import fs from "fs-extra";
import { VectorMemory } from "./vector.js";
import { GraphMemory } from "./graph.js";
import { AuditMemory, type AuditFilter } from "./audit.js";
import type {
  AuditEntry,
  AuditTrail,
  ImpactAnalysis,
  MemoryQueryResult,
  TriMemoryInitOptions,
  TriMemoryStats,
} from "./types.js";

export class TriMemory {
  private readonly vector: VectorMemory;
  private readonly graph: GraphMemory;
  private readonly audit: AuditMemory;

  constructor(private readonly cwd: string = process.cwd()) {
    this.vector = new VectorMemory(cwd);
    this.graph = new GraphMemory(cwd);
    this.audit = new AuditMemory(cwd);
  }

  async init(options?: TriMemoryInitOptions): Promise<TriMemoryStats> {
    await fs.ensureDir(path.join(this.cwd, ".arela", "memory"));

    if (options?.refreshGraph || !(await this.graph.isReady())) {
      const { ingestCodebase } = await import("../ingest/index.js");
      await ingestCodebase(this.cwd, {
        refresh: true,
        verbose: options?.verbose,
      });
    }

    if (options?.refreshVector) {
      await this.vector.rebuildIndex({
        progress: options.verbose,
      });
    }

    await this.audit.init();
    return this.getStats();
  }

  async query(question: string, topK?: number): Promise<MemoryQueryResult> {
    const semantic = await this.vector.query(question, topK);
    const relatedFiles = new Set<string>();

    for (const match of semantic) {
      const neighbors = await this.graph.findSlice(match.file);
      neighbors.forEach((file) => relatedFiles.add(file));
    }

    return {
      question,
      semantic,
      relatedFiles: Array.from(relatedFiles).sort(),
      timestamp: new Date().toISOString(),
    };
  }

  async impact(filePath: string): Promise<ImpactAnalysis> {
    return this.graph.impact(filePath);
  }

  async auditTrail(filter?: AuditFilter): Promise<AuditTrail> {
    return this.audit.getAuditTrail(filter);
  }

  async logDecision(entry: AuditEntry): Promise<void> {
    await this.audit.logDecision(entry);
  }

  async getStats(): Promise<TriMemoryStats> {
    const [vector, graph, audit] = await Promise.all([
      this.vector.getStats(),
      this.graph.getStats(),
      this.audit.getStats(),
    ]);

    return { vector, graph, audit };
  }
}

export type { AuditFilter } from "./audit.js";
export * from "./types.js";
