/**
 * Graph Slice - Database Wrapper
 */

import Database from "better-sqlite3";
import path from "node:path";
import { SCHEMA_SQL } from "./schema.js";

export class GraphDB {
    private db!: Database.Database;
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    async init() {
        // Use Guarded Ops for directory creation (can't import ops.ts here due to circular dep? check later)
        // Wait, DB is low level. We should probably inject the DB path or use a safe method.
        // But we are in slices/graph. ops.ts is in slices/fs. No circular dependency (fs -> graph is unlikely).
        // Let's use dynamic import or just fs-extra but guarded?
        // NO. The guard bans fs-extra imports.
        // We MUST import { createDirectoryOp } from '../fs/ops.js'

        // This file imports 'fs-extra' currently. We must remove that.
    }

    // Wait, better to factory method.
    static async create(projectPath: string): Promise<GraphDB> {
        const instance = new GraphDB(projectPath);
        await instance.initialize();
        return instance;
    }

    private async initialize() {
        const dbDir = path.join(this.projectPath, ".arela");
        // We need to use createDirectoryOp. 
        // We can't use it directly here if we want to remove 'fs-extra' import.
        const { createDirectoryOp } = await import('../fs/ops.js');
        await createDirectoryOp(dbDir);

        const dbPath = path.join(dbDir, "graph.db");
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");

        // Initialize schema
        this.db.exec(SCHEMA_SQL);
    }

    getFiles() {
        return this.db.prepare("SELECT * FROM files").all() as Array<{ id: number; path: string }>;
    }

    getFileId(filepath: string): number | undefined {
        const row = this.db.prepare("SELECT id FROM files WHERE path = ?").get(filepath) as { id: number } | undefined;
        return row?.id;
    }

    insertFile(filepath: string): number {
        const info = this.db.prepare("INSERT OR IGNORE INTO files (path) VALUES (?)").run(filepath);
        if (info.changes === 0) {
            return this.getFileId(filepath)!;
        }
        return info.lastInsertRowid as number;
    }

    addImport(sourceId: number, targetId: number, type: "static" | "dynamic" = "static") {
        this.db.prepare("INSERT OR IGNORE INTO imports (source_file_id, target_file_id, type) VALUES (?, ?, ?)").run(sourceId, targetId, type);
    }

    // Find what imports this file (Upstream)
    getUpstream(fileId: number) {
        return this.db.prepare(`
      SELECT f.path 
      FROM imports i 
      JOIN files f ON f.id = i.source_file_id 
      WHERE i.target_file_id = ?
    `).all(fileId) as Array<{ path: string }>;
    }

    // Find what this file imports (Downstream)
    getDownstream(fileId: number) {
        return this.db.prepare(`
      SELECT f.path 
      FROM imports i 
      JOIN files f ON f.id = i.target_file_id 
      WHERE i.source_file_id = ?
    `).all(fileId) as Array<{ path: string }>;
    }

    // Get all imports for visualization
    getAllImports() {
        return this.db.prepare(`
            SELECT 
                f1.path as source,
                f2.path as target,
                i.type as type
            FROM imports i
            JOIN files f1 ON f1.id = i.source_file_id
            JOIN files f2 ON f2.id = i.target_file_id
        `).all() as Array<{ source: string; target: string; type: string }>;
    }

    close() {
        this.db.close();
    }

    reset() {
        this.db.exec("DELETE FROM imports; DELETE FROM symbols; DELETE FROM files;");
    }
}
