/**
 * Extract API calls from frontend code via Graph DB
 */
import Database from 'better-sqlite3';
import { ApiCall, FileInfo } from './types';

/**
 * Extract all API calls from frontend code
 */
export function extractCalls(dbPath: string): ApiCall[] {
  const db = new Database(dbPath);

  try {
    // Query api_calls table
    const stmt = db.prepare(`
      SELECT
        id,
        method,
        url,
        file_id,
        line_number,
        created_at
      FROM api_calls
      ORDER BY method, url
    `);

    const rows: any[] = stmt.all() as any[];

    return rows.map(call => ({
      id: call.id,
      method: call.method.toUpperCase(),
      url: normalizeUrl(call.url),
      fileId: call.file_id,
      lineNumber: call.line_number,
      createdAt: call.created_at,
    } as ApiCall));
  } finally {
    db.close();
  }
}

/**
 * Extract API calls by slice
 */
export function extractCallsBySlice(
  dbPath: string,
  sliceNames: string[]
): Map<string, ApiCall[]> {
  const db = new Database(dbPath);

  try {
    const result = new Map<string, ApiCall[]>();

    // For each slice, find calls
    for (const sliceName of sliceNames) {
      // Query calls that match slice (by url pattern)
      const stmt = db.prepare(`
        SELECT
          id,
          method,
          url,
          file_id,
          line_number,
          created_at
        FROM api_calls
        WHERE url LIKE ?
        ORDER BY method, url
      `);

      // Use slice name as path prefix
      const pattern = `/api/${sliceName}%`;
      const rows: any[] = stmt.all(pattern) as any[];

      result.set(
        sliceName,
        rows.map(c => ({
          id: c.id,
          method: c.method.toUpperCase(),
          url: normalizeUrl(c.url),
          fileId: c.file_id,
          lineNumber: c.line_number,
          createdAt: c.created_at,
        } as ApiCall))
      );
    }

    return result;
  } finally {
    db.close();
  }
}

/**
 * Get file info for calls
 */
export function getCallFileInfo(dbPath: string, fileIds: number[]): Map<number, FileInfo> {
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
 * Normalize API URL to standard path format
 * Converts dynamic segments to :param
 */
function normalizeUrl(url: string): string {
  // Remove query parameters
  let path = url.split('?')[0];

  // Remove hash fragments
  path = path.split('#')[0];

  // Convert template literals ${...} to :param
  path = path.replace(/\$\{([^}]+)\}/g, ':param');

  // Convert numeric IDs to :id
  path = path.replace(/\/\d+(?=\/|$)/g, '/:id');

  // Convert UUIDs to :uuid
  path = path.replace(/\/[a-f0-9-]{36}(?=\/|$)/gi, '/:uuid');

  // Convert hex IDs to :id
  path = path.replace(/\/[a-f0-9]{8,}(?=\/|$)/gi, '/:id');

  // Convert {param} to :param (in case some are formatted this way)
  path = path.replace(/\{([^}]+)\}/g, ':$1');

  return path;
}

/**
 * Extract path from various URL formats
 */
export function extractPathFromUrl(url: string): string {
  // Handle fetch(url) where url is a string
  // Handle fetch(`/api/...`) where url is a template literal
  // Handle fetch('/api/...') where url is a regular string

  // Remove protocol if present
  let path = url.replace(/^https?:\/\/[^\/]+/, '');

  // Get just the path part
  path = path.split('?')[0].split('#')[0];

  return path;
}