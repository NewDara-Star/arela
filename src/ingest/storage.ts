/**
 * GraphDB - SQLite interface for storing and querying codebase graph
 */

import Database from "better-sqlite3";
import path from "path";
import { FileNode, FunctionNode, FunctionCall, ApiEndpoint, ApiCall } from "./types.js";

export class GraphDB {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema() {
    // Files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        repo TEXT NOT NULL,
        type TEXT NOT NULL,
        lines INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_files_repo ON files(repo);
      CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
    `);

    // Functions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS functions (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        is_exported BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_functions_file_id ON functions(file_id);
      CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name);
    `);

    // Imports table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY,
        from_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        to_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
        to_module TEXT,
        import_type TEXT,
        imported_names TEXT,
        line_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_imports_from ON imports(from_file_id);
      CREATE INDEX IF NOT EXISTS idx_imports_to ON imports(to_file_id);
    `);

    // Function calls table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS function_calls (
        id INTEGER PRIMARY KEY,
        caller_function_id INTEGER NOT NULL REFERENCES functions(id) ON DELETE CASCADE,
        callee_function_id INTEGER REFERENCES functions(id) ON DELETE SET NULL,
        callee_name TEXT,
        line_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_function_calls_caller ON function_calls(caller_function_id);
      CREATE INDEX IF NOT EXISTS idx_function_calls_callee ON function_calls(callee_function_id);
    `);

    // API endpoints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_endpoints (
        id INTEGER PRIMARY KEY,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        function_id INTEGER REFERENCES functions(id) ON DELETE SET NULL,
        line_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_api_endpoints_file ON api_endpoints(file_id);
      CREATE INDEX IF NOT EXISTS idx_api_endpoints_method_path ON api_endpoints(method, path);
    `);

    // API calls table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_calls (
        id INTEGER PRIMARY KEY,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        line_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_api_calls_file ON api_calls(file_id);
      CREATE INDEX IF NOT EXISTS idx_api_calls_method_url ON api_calls(method, url);
    `);

    // Metadata table for tracking last ingest
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Add a file to the database
   */
  addFile(file: FileNode): number {
    const stmt = this.db.prepare(`
      INSERT INTO files (path, repo, type, lines)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        type = excluded.type,
        lines = excluded.lines,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);

    const result = stmt.get(file.path, file.repoPath, file.type, file.lines) as { id: number };
    return result.id;
  }

  /**
   * Add a function to the database
   */
  addFunction(fileId: number, func: FunctionNode): number {
    const stmt = this.db.prepare(`
      INSERT INTO functions (name, file_id, line_start, line_end, is_exported)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      func.name,
      fileId,
      func.lineStart,
      func.lineEnd,
      func.isExported ? 1 : 0
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Add an import relationship
   */
  addImport(
    fromFileId: number,
    toFileId: number | null,
    toModule: string | null,
    importType: string,
    importedNames: string[],
    line: number
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO imports (from_file_id, to_file_id, to_module, import_type, imported_names, line_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fromFileId,
      toFileId,
      toModule,
      importType,
      JSON.stringify(importedNames),
      line
    );
  }

  /**
   * Add a function call relationship
   */
  addFunctionCall(
    callerFunctionId: number,
    calleeFunctionId: number | null,
    calleeName: string | null,
    line: number
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO function_calls (caller_function_id, callee_function_id, callee_name, line_number)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(callerFunctionId, calleeFunctionId, calleeName, line);
  }

  /**
   * Add an API endpoint
   */
  addApiEndpoint(endpoint: ApiEndpoint): void {
    const stmt = this.db.prepare(`
      INSERT INTO api_endpoints (method, path, file_id, function_id, line_number)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(endpoint.method, endpoint.path, endpoint.fileId, endpoint.functionId, endpoint.line);
  }

  /**
   * Add an API call
   */
  addApiCall(fileId: number, call: ApiCall): void {
    const stmt = this.db.prepare(`
      INSERT INTO api_calls (method, url, file_id, line_number)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(call.method, call.url, fileId, call.line);
  }

  /**
   * Get file ID by path
   */
  getFileId(filePath: string): number | null {
    const stmt = this.db.prepare('SELECT id FROM files WHERE path = ?');
    const result = stmt.get(filePath) as { id: number } | undefined;
    return result?.id ?? null;
  }

  /**
   * Get function ID by name and file ID
   */
  getFunctionId(fileId: number, functionName: string): number | null {
    const stmt = this.db.prepare(
      'SELECT id FROM functions WHERE file_id = ? AND name = ?'
    );
    const result = stmt.get(fileId, functionName) as { id: number } | undefined;
    return result?.id ?? null;
  }

  /**
   * Query the database
   */
  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as any[];
  }

  /**
   * Execute raw SQL
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Begin transaction
   */
  beginTransaction(): void {
    this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  commit(): void {
    this.db.exec('COMMIT');
  }

  /**
   * Rollback transaction
   */
  rollback(): void {
    this.db.exec('ROLLBACK');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    filesCount: number;
    functionsCount: number;
    importsCount: number;
    functionCallsCount: number;
    apiEndpointsCount: number;
    apiCallsCount: number;
  } {
    const stats = {
      filesCount: (this.db.prepare('SELECT COUNT(*) as count FROM files').get() as any).count,
      functionsCount: (this.db.prepare('SELECT COUNT(*) as count FROM functions').get() as any).count,
      importsCount: (this.db.prepare('SELECT COUNT(*) as count FROM imports').get() as any).count,
      functionCallsCount: (this.db.prepare('SELECT COUNT(*) as count FROM function_calls').get() as any).count,
      apiEndpointsCount: (this.db.prepare('SELECT COUNT(*) as count FROM api_endpoints').get() as any).count,
      apiCallsCount: (this.db.prepare('SELECT COUNT(*) as count FROM api_calls').get() as any).count,
    };
    return stats;
  }

  /**
   * Clear all data (for refresh)
   */
  clear(): void {
    this.db.exec(`
      DELETE FROM function_calls;
      DELETE FROM api_calls;
      DELETE FROM api_endpoints;
      DELETE FROM imports;
      DELETE FROM functions;
      DELETE FROM files;
    `);
  }

  /**
   * Update metadata (e.g., last_ingest_time)
   */
  setMetadata(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO metadata (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
  }

  /**
   * Get metadata value
   */
  getMetadata(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
  }

  /**
   * Check if graph is stale (> 24 hours old)
   */
  isStale(maxAgeHours: number = 24): boolean {
    const lastIngest = this.getMetadata('last_ingest_time');
    if (!lastIngest) return true; // Never ingested

    const lastIngestTime = new Date(lastIngest).getTime();
    const now = Date.now();
    const ageHours = (now - lastIngestTime) / (1000 * 60 * 60);

    return ageHours > maxAgeHours;
  }

  /**
   * Get all files
   */
  getAllFiles(): Array<{ id: number; path: string; repo: string; type: string; lines: number }> {
    const stmt = this.db.prepare('SELECT id, path, repo, type, lines FROM files');
    return stmt.all() as any[];
  }

  /**
   * Get all imports with file details
   */
  getAllImports(): Array<{
    id: number;
    from_file_id: number;
    to_file_id: number | null;
    from_module?: string;
    to_module: string | null;
    from_file?: { path: string };
    to_file?: { path: string };
  }> {
    const stmt = this.db.prepare(`
      SELECT
        i.id,
        i.from_file_id,
        i.to_file_id,
        i.to_module,
        ff.path as from_path,
        tf.path as to_path
      FROM imports i
      LEFT JOIN files ff ON i.from_file_id = ff.id
      LEFT JOIN files tf ON i.to_file_id = tf.id
    `);
    const results = stmt.all() as any[];
    return results.map(r => ({
      id: r.id,
      from_file_id: r.from_file_id,
      to_file_id: r.to_file_id,
      to_module: r.to_module,
      from_file: r.from_path ? { path: r.from_path } : undefined,
      to_file: r.to_path ? { path: r.to_path } : undefined,
    }));
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
