/**
 * Graph Slice - Database Schema
 */

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    hash TEXT,
    last_indexed INTEGER,
    complexity_score INTEGER
  );

  CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file_id INTEGER NOT NULL,
    target_file_id INTEGER NOT NULL,
    type TEXT, -- 'static', 'dynamic'
    FOREIGN KEY(source_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(target_file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(source_file_id, target_file_id)
  );

  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    kind TEXT, -- 'function', 'class', 'variable'
    line_start INTEGER,
    line_end INTEGER,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
  CREATE INDEX IF NOT EXISTS idx_imports_source ON imports(source_file_id);
  CREATE INDEX IF NOT EXISTS idx_imports_target ON imports(target_file_id);
  CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
`;
