import path from "node:path";
import fs from "fs-extra";
import { GraphDB } from "../ingest/storage.js";
import type { DependencyEdge, GraphStats, ImpactAnalysis } from "./types.js";

/**
 * Hexi-005: File node wrapper for graph memory.
 */
export interface GraphFileNode {
  path: string;
  repoPath: string;
  language: string;
  size: number;
}

/**
 * Hexi-005: Import edge wrapper.
 */
export interface GraphImport {
  source: string;
  target: string;
  type: "internal" | "external";
}

/**
 * Hexi-005: Function node wrapper.
 */
export interface GraphFunctionNode {
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
}

export class GraphMemory {
  constructor(private readonly cwd: string = process.cwd()) {}

  private get dbPath(): string {
    return path.join(this.cwd, ".arela", "memory", "graph.db");
  }

  /**
   * Hexi-005: Initialization wrapper.
   * Construction with `cwd` is sufficient today; this simply ensures the directory exists.
   */
  async init(projectPath: string): Promise<void> {
    if (projectPath && path.resolve(projectPath) !== path.resolve(this.cwd)) {
      // Keep backwards compatible – we don't enforce equality here.
    }
    await fs.ensureDir(path.dirname(this.dbPath));
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
      let lastUpdatedAt: number | undefined;
      try {
        const stats = await fs.stat(this.dbPath);
        lastUpdatedAt = stats.mtimeMs;
      } catch {
        lastUpdatedAt = undefined;
      }

      return {
        ready: true,
        files: summary.filesCount,
        imports: summary.importsCount,
        functions: summary.functionsCount,
        functionCalls: summary.functionCallsCount,
        apiEndpoints: summary.apiEndpointsCount,
        apiCalls: summary.apiCallsCount,
        dbPath: this.dbPath,
        lastUpdatedAt,
      };
    } finally {
      db.close();
    }
  }

  /**
   * Existing impact analysis used by Tri-Memory.
   */
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

  /**
   * Hexi-005: Get a single file node by path.
   */
  async getFile(pathOrIdentifier: string): Promise<GraphFileNode | undefined> {
    if (!(await this.isReady())) {
      return undefined;
    }

    const normalized = this.normalizePath(pathOrIdentifier);
    const db = new GraphDB(this.dbPath);
    try {
      const rows = db.query("SELECT path, repo, type, lines FROM files WHERE path = ?", [normalized]) as Array<{
        path: string;
        repo: string;
        type: string;
        lines: number;
      }>;

      if (rows.length === 0) {
        return undefined;
      }

      const row = rows[0];
      return {
        path: row.path,
        repoPath: row.repo,
        language: inferLanguageFromPath(row.path),
        size: row.lines ?? 0,
      };
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Get all files, optionally filtered by repo path.
   */
  async getFiles(repoPaths?: string[]): Promise<GraphFileNode[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const db = new GraphDB(this.dbPath);
    try {
      let sql = "SELECT path, repo, type, lines FROM files";
      const params: string[] = [];
      if (repoPaths && repoPaths.length > 0) {
        const placeholders = repoPaths.map(() => "?").join(", ");
        sql += ` WHERE repo IN (${placeholders})`;
        params.push(...repoPaths);
      }

      const rows = db.query(sql, params) as Array<{ path: string; repo: string; type: string; lines: number }>;

      return rows.map((row) => ({
        path: row.path,
        repoPath: row.repo,
        language: inferLanguageFromPath(row.path),
        size: row.lines ?? 0,
      }));
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Simple file name search using LIKE on path.
   */
  async searchFiles(pattern: string): Promise<GraphFileNode[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const db = new GraphDB(this.dbPath);
    try {
      const rows = db.query(
        "SELECT path, repo, type, lines FROM files WHERE path LIKE ? ORDER BY path",
        [`%${pattern}%`]
      ) as Array<{ path: string; repo: string; type: string; lines: number }>;

      return rows.map((row) => ({
        path: row.path,
        repoPath: row.repo,
        language: inferLanguageFromPath(row.path),
        size: row.lines ?? 0,
      }));
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Get direct import edges from a file.
   */
  async getImports(filePath: string): Promise<GraphImport[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const normalized = this.normalizePath(filePath);
    const db = new GraphDB(this.dbPath);

    try {
      const fileId = db.getFileId(normalized);
      if (!fileId) {
        return [];
      }

      const rows = db.query(
        `
          SELECT
            ff.path as source,
            COALESCE(tf.path, i.to_module) as target,
            i.to_module as module_name
          FROM imports i
          JOIN files ff ON ff.id = i.from_file_id
          LEFT JOIN files tf ON tf.id = i.to_file_id
          WHERE i.from_file_id = ?
        `,
        [fileId]
      ) as Array<{ source: string; target: string; module_name: string | null }>;

      return rows
        .filter((row) => Boolean(row.target))
        .map((row) => ({
          source: row.source,
          target: row.target,
          type: isInternalPath(row.target) ? "internal" : "external",
        }));
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Get all files that import the given file.
   */
  async getImportedBy(filePath: string): Promise<string[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const normalized = this.normalizePath(filePath);
    const db = new GraphDB(this.dbPath);

    try {
      const fileId = db.getFileId(normalized);
      if (!fileId) {
        return [];
      }

      const rows = db.query(
        `
          SELECT DISTINCT ff.path as source
          FROM imports i
          JOIN files ff ON ff.id = i.from_file_id
          WHERE i.to_file_id = ?
        `,
        [fileId]
      ) as Array<{ source: string }>;

      return rows.map((row) => row.source);
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Get transitive dependencies (files this file depends on).
   */
  async getDependencies(filePath: string, depth: number = 1): Promise<string[]> {
    return this.walkDependencies(filePath, depth, "downstream");
  }

  /**
   * Hexi-005: Get transitive dependents (files that depend on this file).
   */
  async getDependents(filePath: string, depth: number = 1): Promise<string[]> {
    return this.walkDependencies(filePath, depth, "upstream");
  }

  /**
   * Hexi-005: Get functions in a file.
   */
  async getFunctions(filePath: string): Promise<GraphFunctionNode[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const normalized = this.normalizePath(filePath);
    const db = new GraphDB(this.dbPath);
    try {
      const fileId = db.getFileId(normalized);
      if (!fileId) {
        return [];
      }

      const rows = db.query(
        `
          SELECT name, line_start, line_end
          FROM functions
          WHERE file_id = ?
          ORDER BY line_start
        `,
        [fileId]
      ) as Array<{ name: string; line_start: number; line_end: number }>;

      return rows.map((row) => ({
        name: row.name,
        file: normalized,
        lineStart: row.line_start,
        lineEnd: row.line_end,
      }));
    } finally {
      db.close();
    }
  }

  /**
   * Hexi-005: Search functions by name (substring match).
   */
  async searchFunctions(name: string): Promise<GraphFunctionNode[]> {
    if (!(await this.isReady())) {
      return [];
    }

    const db = new GraphDB(this.dbPath);
    try {
      const rows = db.query(
        `
          SELECT f.name, f.line_start, f.line_end, files.path as file
          FROM functions f
          JOIN files ON files.id = f.file_id
          WHERE f.name LIKE ?
          ORDER BY files.path, f.line_start
        `,
        [`%${name}%`]
      ) as Array<{ name: string; line_start: number; line_end: number; file: string }>;

      return rows.map((row) => ({
        name: row.name,
        file: row.file,
        lineStart: row.line_start,
        lineEnd: row.line_end,
      }));
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

  private async walkDependencies(
    filePath: string,
    depth: number,
    direction: "upstream" | "downstream"
  ): Promise<string[]> {
    if (depth <= 0 || !(await this.isReady())) {
      return [];
    }

    const visited = new Set<string>();
    const queue: Array<{ path: string; level: number }> = [];
    const normalized = this.normalizePath(filePath);
    queue.push({ path: normalized, level: 0 });
    visited.add(normalized);

    const db = new GraphDB(this.dbPath);
    try {
      const results = new Set<string>();

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.level >= depth) {
          continue;
        }

        const fileId = db.getFileId(current.path);
        if (!fileId) {
          continue;
        }

        const neighbors =
          direction === "downstream"
            ? (db.query(
                `
                  SELECT DISTINCT f.path as file
                  FROM imports i
                  JOIN files f ON f.id = i.to_file_id
                  WHERE i.from_file_id = ?
                `,
                [fileId]
              ) as Array<{ file: string }>)
            : (db.query(
                `
                  SELECT DISTINCT f.path as file
                  FROM imports i
                  JOIN files f ON f.id = i.from_file_id
                  WHERE i.to_file_id = ?
                `,
                [fileId]
              ) as Array<{ file: string }>);

        for (const neighbor of neighbors) {
          if (!neighbor.file || visited.has(neighbor.file)) {
            continue;
          }
          visited.add(neighbor.file);
          results.add(neighbor.file);
          queue.push({ path: neighbor.file, level: current.level + 1 });
        }
      }

      return Array.from(results).sort();
    } finally {
      db.close();
    }
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

function inferLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "TypeScript";
    case ".js":
    case ".jsx":
      return "JavaScript";
    case ".py":
      return "Python";
    case ".go":
      return "Go";
    case ".rs":
      return "Rust";
    case ".java":
      return "Java";
    default:
      return "unknown";
  }
}

function isInternalPath(target: string): boolean {
  return target.startsWith(".") || target.startsWith("/") || target.includes("/");
}
