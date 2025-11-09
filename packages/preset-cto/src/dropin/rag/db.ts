import Database from "better-sqlite3";
import path from "path";
import fs from "fs-extra";

let dbInstance: Database.Database | null = null;

export function getDb(cwd: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.join(cwd, ".arela", "rag.db");
  fs.ensureDirSync(path.dirname(dbPath));

  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");

  // Create tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      lang TEXT,
      mtime INTEGER NOT NULL,
      chunk INTEGER NOT NULL,
      text TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS vecs (
      id TEXT PRIMARY KEY,
      embedding BLOB NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_docs_path ON docs(path);
    CREATE INDEX IF NOT EXISTS idx_docs_kind ON docs(kind);
  `);

  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export interface DocChunk {
  id: string;
  path: string;
  kind: "code" | "config" | "doc";
  lang?: string;
  mtime: number;
  chunk: number;
  text: string;
}

export function upsertDoc(db: Database.Database, doc: DocChunk): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO docs (id, path, kind, lang, mtime, chunk, text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(doc.id, doc.path, doc.kind, doc.lang, doc.mtime, doc.chunk, doc.text);
}

export function upsertVec(db: Database.Database, id: string, embedding: Float32Array): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO vecs (id, embedding)
    VALUES (?, ?)
  `);
  
  const buffer = Buffer.from(embedding.buffer);
  stmt.run(id, buffer);
}

export function getDocsByPath(db: Database.Database, filePath: string): DocChunk[] {
  const stmt = db.prepare(`
    SELECT * FROM docs WHERE path = ? ORDER BY chunk
  `);
  
  return stmt.all(filePath) as DocChunk[];
}

export function getAllDocs(db: Database.Database): DocChunk[] {
  const stmt = db.prepare(`
    SELECT * FROM docs ORDER BY path, chunk
  `);
  
  return stmt.all() as DocChunk[];
}

export function deleteDocsByPath(db: Database.Database, filePath: string): void {
  const stmt = db.prepare(`DELETE FROM docs WHERE path = ?`);
  stmt.run(filePath);
}

export function getStats(db: Database.Database): {
  totalDocs: number;
  totalVecs: number;
  byKind: Record<string, number>;
} {
  const totalDocs = db.prepare(`SELECT COUNT(*) as count FROM docs`).get() as { count: number };
  const totalVecs = db.prepare(`SELECT COUNT(*) as count FROM vecs`).get() as { count: number };
  
  const byKindRows = db.prepare(`
    SELECT kind, COUNT(*) as count FROM docs GROUP BY kind
  `).all() as Array<{ kind: string; count: number }>;
  
  const byKind: Record<string, number> = {};
  for (const row of byKindRows) {
    byKind[row.kind] = row.count;
  }
  
  return {
    totalDocs: totalDocs.count,
    totalVecs: totalVecs.count,
    byKind,
  };
}
