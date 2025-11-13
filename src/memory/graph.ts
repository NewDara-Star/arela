import path from "node:path";
import fs from "fs-extra";
import { GraphDB } from "../ingest/storage.js";
import type { DependencyEdge, GraphStats, ImpactAnalysis } from "./types.js";

export class GraphMemory {
  constructor(private readonly cwd: string = process.cwd()) {}

  private get dbPath(): string {
    return path.join(this.cwd, ".arela", "memory", "graph.db");
  }

  async isReady(): Promise<boolean> {
    return fs.pathExists(this.dbPath);
  }

  async getStats(): Promise<GraphStats> {
    if (!(await this.isReady())) {
      return {
        ready: false,
        files: 0,
        imports: 0,
        functions: 0,
        functionCalls: 0,
        apiEndpoints: 0,
        apiCalls: 0,
        dbPath: this.dbPath,
      };
    }

    const db = new GraphDB(this.dbPath);
    try {
      const summary = db.getSummary();
      return {
        ready: true,
        files: summary.filesCount,
        imports: summary.importsCount,
        functions: summary.functionsCount,
        functionCalls: summary.functionCallsCount,
        apiEndpoints: summary.apiEndpointsCount,
        apiCalls: summary.apiCallsCount,
        dbPath: this.dbPath,
      };
    } finally {
      db.close();
    }
  }

  async impact(filePath: string): Promise<ImpactAnalysis> {
    if (!(await this.isReady())) {
      throw new Error(
        "Graph memory not initialized. Run `arela memory init --refresh-graph` or `arela ingest codebase` first."
      );
    }

    const normalized = this.normalizePath(filePath);
    const db = new GraphDB(this.dbPath);

    try {
      const fileId = db.getFileId(normalized);
      if (!fileId) {
        return {
          file: normalized,
          exists: false,
          upstream: [],
          downstream: [],
          fanIn: 0,
          fanOut: 0,
        };
      }

      const upstream = db.query(
        `
          SELECT f.path as file,
                 COUNT(*) as weight,
                 GROUP_CONCAT(DISTINCT COALESCE(i.import_type, 'unknown')) as import_types
          FROM imports i
          JOIN files f ON f.id = i.from_file_id
          WHERE i.to_file_id = ?
          GROUP BY f.path
          ORDER BY weight DESC, f.path ASC
        `,
        [fileId]
      );

      const downstream = db.query(
        `
          SELECT f.path as file,
                 COUNT(*) as weight,
                 GROUP_CONCAT(DISTINCT COALESCE(i.import_type, 'unknown')) as import_types
          FROM imports i
          JOIN files f ON f.id = i.to_file_id
          WHERE i.from_file_id = ?
          GROUP BY f.path
          ORDER BY weight DESC, f.path ASC
        `,
        [fileId]
      );

      const upstreamEdges = mapDependencyEdges(upstream);
      const downstreamEdges = mapDependencyEdges(downstream);

      return {
        file: normalized,
        exists: true,
        upstream: upstreamEdges,
        downstream: downstreamEdges,
        fanIn: upstreamEdges.reduce((sum, edge) => sum + edge.weight, 0),
        fanOut: downstreamEdges.reduce((sum, edge) => sum + edge.weight, 0),
      };
    } finally {
      db.close();
    }
  }

  async findSlice(identifier: string): Promise<string[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const normalized = this.normalizePath(identifier);
    const db = new GraphDB(this.dbPath);
    try {
      const targetIds = this.findCandidateFileIds(db, identifier);
      if (targetIds.length === 0) {
        return [];
      }

      const related = new Set<string>();
      related.add(normalized);
      for (const id of targetIds) {
        const neighbors = db.query(
          `
            SELECT DISTINCT f.path as file
            FROM imports i
            JOIN files f ON f.id = i.to_file_id
            WHERE i.from_file_id = ?
            UNION
            SELECT DISTINCT f2.path as file
            FROM imports i2
            JOIN files f2 ON f2.id = i2.from_file_id
            WHERE i2.to_file_id = ?
          `,
          [id, id]
        ) as Array<{ file: string }>;

        for (const neighbor of neighbors) {
          if (neighbor.file && neighbor.file !== normalized) {
            related.add(neighbor.file);
          }
        }
      }

      related.delete(normalized);
      return Array.from(related).sort();
    } finally {
      db.close();
    }
  }

  private findCandidateFileIds(db: GraphDB, identifier: string): number[] {
    const normalized = this.normalizePath(identifier);
    const candidates: number[] = [];
    const primaryId = db.getFileId(normalized);
    if (primaryId) {
      candidates.push(primaryId);
    }

    if (candidates.length === 0) {
      const basename = path.basename(normalized);
      const rows = db.query(
        `SELECT id FROM files WHERE path LIKE ? ORDER BY path LIMIT 25`,
        [`%${basename}%`]
      );
      for (const row of rows) {
        if (typeof row.id === "number") {
          candidates.push(row.id);
        }
      }
    }

    return candidates;
  }

  private normalizePath(filePath: string): string {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    const relative = path.relative(this.cwd, absolute);
    return relative.split(path.sep).join(path.posix.sep);
  }
}

function mapDependencyEdges(rows: Array<{ file: string; weight: number; import_types?: string }>): DependencyEdge[] {
  return rows
    .filter((row) => Boolean(row.file))
    .map((row) => ({
      file: row.file,
      reason: formatReason(row.import_types),
      weight: typeof row.weight === "number" ? row.weight : Number(row.weight ?? 0),
    }));
}

function formatReason(value?: string): string {
  if (!value) {
    return "imports";
  }
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "imports";
}
