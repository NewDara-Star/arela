/**
 * Extract API endpoints from backend code via Graph DB
 */
import Database from 'better-sqlite3';
import { ApiEndpoint, FileInfo } from './types';

/**
 * Extract all backend endpoints from Graph DB
 */
export function extractEndpoints(dbPath: string): ApiEndpoint[] {
  const db = new Database(dbPath);

  try {
    // Query api_endpoints table
    const stmt = db.prepare(`
      SELECT
        id,
        method,
        path,
        file_id,
        function_id,
        line_number,
        created_at
      FROM api_endpoints
      ORDER BY method, path
    `);

    const rows: any[] = stmt.all() as any[];

    return rows.map(ep => ({
      id: ep.id,
      method: ep.method.toUpperCase(),
      path: normalizePath(ep.path),
      fileId: ep.file_id,
      functionId: ep.function_id,
      lineNumber: ep.line_number,
      createdAt: ep.created_at,
    } as ApiEndpoint));
  } finally {
    db.close();
  }
}

/**
 * Extract backend endpoints by slice
 */
export function extractEndpointsBySlice(
  dbPath: string,
  sliceNames: string[]
): Map<string, ApiEndpoint[]> {
  const db = new Database(dbPath);

  try {
    const result = new Map<string, ApiEndpoint[]>();

    // For each slice, find endpoints
    for (const sliceName of sliceNames) {
      // Query endpoints that match slice (by path pattern)
      const stmt = db.prepare(`
        SELECT
          id,
          method,
          path,
          file_id,
          function_id,
          line_number,
          created_at
        FROM api_endpoints
        WHERE path LIKE ?
        ORDER BY method, path
      `);

      // Use slice name as path prefix (e.g., /api/users, /api/workouts)
      const pattern = `/api/${sliceName}%`;
      const rows: any[] = stmt.all(pattern) as any[];

      result.set(
        sliceName,
        rows.map(ep => ({
          id: ep.id,
          method: ep.method.toUpperCase(),
          path: normalizePath(ep.path),
          fileId: ep.file_id,
          functionId: ep.function_id,
          lineNumber: ep.line_number,
          createdAt: ep.created_at,
        } as ApiEndpoint))
      );
    }

    return result;
  } finally {
    db.close();
  }
}

/**
 * Get unique slices from endpoints
 */
export function detectSlices(dbPath: string): string[] {
  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(`
      SELECT DISTINCT
        SUBSTR(path, 6, INSTR(SUBSTR(path, 6), '/') - 1) as slice
      FROM api_endpoints
      WHERE path LIKE '/api/%'
      ORDER BY slice
    `);

    const rows: any[] = stmt.all() as any[];
    return rows
      .map(r => r.slice)
      .filter(s => s && s.length > 0);
  } finally {
    db.close();
  }
}

/**
 * Get file info for endpoints
 */
export function getFileInfo(dbPath: string, fileIds: number[]): Map<number, FileInfo> {
  if (fileIds.length === 0) {
    return new Map();
  }

  const db = new Database(dbPath);

  try {
    const placeholders = fileIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT id, path, language, is_backend, is_frontend, created_at
      FROM files
      WHERE id IN (${placeholders})
    `);

    const rows: any[] = stmt.all(...fileIds) as any[];
    const result = new Map<number, FileInfo>();

    for (const row of rows) {
      result.set(row.id, {
        id: row.id,
        path: row.path,
        language: row.language,
        isBackend: row.is_backend,
        isFrontend: row.is_frontend,
        createdAt: row.created_at,
      });
    }

    return result;
  } finally {
    db.close();
  }
}

/**
 * Normalize API path to standard format
 * Converts {id} or $id to :id
 */
function normalizePath(path: string): string {
  return path
    // Convert {param} to :param
    .replace(/\{([^}]+)\}/g, ':$1')
    // Convert $param to :param
    .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, ':$1');
}
