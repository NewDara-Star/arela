/**
 * Graph Slice - Database Wrapper
 */

import Database from "better-sqlite3";
import fs from "fs-extra";
import path from "node:path";
import { SCHEMA_SQL } from "./schema.js";

export class GraphDB {
    private db: Database.Database;

    constructor(projectPath: string) {
        const dbDir = path.join(projectPath, ".arela");
        fs.ensureDirSync(dbDir);

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

    addImport(sourceId: number, targetId: number) {
        this.db.prepare("INSERT OR IGNORE INTO imports (source_file_id, target_file_id) VALUES (?, ?)").run(sourceId, targetId);
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
                f2.path as target
            FROM imports i
            JOIN files f1 ON f1.id = i.source_file_id
            JOIN files f2 ON f2.id = i.target_file_id
        `).all() as Array<{ source: string; target: string }>;
    }

    close() {
        this.db.close();
    }
}
