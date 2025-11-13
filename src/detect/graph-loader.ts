/**
 * Load graph from Graph DB
 */

import { GraphDB } from "../ingest/storage.js";
import type { Graph, FileNode, ImportEdge } from "./types.js";

/**
 * Load the complete graph from the Graph DB
 */
export function loadGraph(dbPath: string): Graph {
  const db = new GraphDB(dbPath);

  try {
    // Load all files as nodes
    const fileRows = db.query(
      `SELECT id, path, type FROM files ORDER BY id`
    ) as Array<{ id: number; path: string; type: string }>;

    // Create node map with degree counting
    const nodes: FileNode[] = [];
    const nodeMap = new Map<number, FileNode>();
    const pathToIdMap = createPathToIdMap(fileRows);

    // Initialize nodes
    for (const row of fileRows) {
      const node: FileNode = {
        id: row.id,
        path: row.path,
        type: row.type,
        degree: 0, // Will be updated below
      };
      nodes.push(node);
      nodeMap.set(row.id, node);
    }

    // Load all imports - both internal and resolvable
    const importRows = db.query(
      `SELECT from_file_id, to_file_id, to_module, COUNT(*) as weight
       FROM imports
       GROUP BY from_file_id, COALESCE(to_file_id, to_module)`
    ) as Array<{ from_file_id: number; to_file_id: number | null; to_module: string; weight: number }>;

    const edges: ImportEdge[] = [];

    // Calculate degrees and create edges
    for (const row of importRows) {
      const fromNode = nodeMap.get(row.from_file_id);
      if (!fromNode) continue;

      let toId: number | null = row.to_file_id;

      // Try to resolve to_module to a file ID
      if (!toId && row.to_module) {
        toId = resolveModuleToFileId(row.to_module, pathToIdMap);
      }

      if (toId) {
        const toNode = nodeMap.get(toId);
        if (toNode) {
          edges.push({
            from: row.from_file_id,
            to: toId,
            weight: row.weight,
          });

          // Update degrees
          fromNode.degree += row.weight;
          toNode.degree += row.weight;
        }
      }
    }

    return {
      nodes,
      edges,
    };
  } finally {
    db.close();
  }
}

/**
 * Create a map of file paths to IDs for quick lookup
 */
function createPathToIdMap(
  fileRows: Array<{ id: number; path: string; type: string }>
): Map<string, number> {
  const map = new Map<string, number>();

  for (const row of fileRows) {
    // Store all variations: .ts, .js, without extension
    const basePath = row.path.replace(/\.(ts|js)$/, "");
    map.set(basePath, row.id);
    map.set(row.path, row.id);
    map.set(basePath + ".ts", row.id);
    map.set(basePath + ".js", row.id);
  }

  return map;
}

/**
 * Try to resolve a module path to a file ID
 */
function resolveModuleToFileId(modulePath: string, pathToIdMap: Map<string, number>): number | null {
  // Remove leading ./ and handle relative imports
  let normalized = modulePath.replace(/^\.\//, "");

  // Try exact match
  if (pathToIdMap.has(normalized)) {
    return pathToIdMap.get(normalized) || null;
  }

  // Try with .ts extension
  if (pathToIdMap.has(normalized + ".ts")) {
    return pathToIdMap.get(normalized + ".ts") || null;
  }

  // Try with .js extension
  if (pathToIdMap.has(normalized + ".js")) {
    return pathToIdMap.get(normalized + ".js") || null;
  }

  // Try treating as directory with index.ts
  if (pathToIdMap.has(normalized + "/index.ts")) {
    return pathToIdMap.get(normalized + "/index.ts") || null;
  }

  // Try treating as directory with index.js
  if (pathToIdMap.has(normalized + "/index.js")) {
    return pathToIdMap.get(normalized + "/index.js") || null;
  }

  return null;
}

/**
 * Load graph for multiple repositories
 */
export function loadMultiRepoGraph(dbPath: string, repos?: string[]): Graph {
  const db = new GraphDB(dbPath);

  try {
    // Load files, optionally filtered by repo
    let query = `SELECT id, path, type FROM files`;
    const params: any[] = [];

    if (repos && repos.length > 0) {
      query += ` WHERE repo IN (${repos.map(() => "?").join(",")})`;
      params.push(...repos);
    }

    query += ` ORDER BY id`;

    const fileRows = db.query(query, params) as Array<{
      id: number;
      path: string;
      type: string;
    }>;

    const nodes: FileNode[] = [];
    const nodeMap = new Map<number, FileNode>();
    const nodeIds = new Set<number>();
    const pathToIdMap = createPathToIdMap(fileRows);

    // Initialize nodes
    for (const row of fileRows) {
      nodeIds.add(row.id);
      const node: FileNode = {
        id: row.id,
        path: row.path,
        type: row.type,
        degree: 0,
      };
      nodes.push(node);
      nodeMap.set(row.id, node);
    }

    // Load all imports - both internal and resolvable
    const importRows = db.query(
      `SELECT from_file_id, to_file_id, to_module, COUNT(*) as weight
       FROM imports
       GROUP BY from_file_id, COALESCE(to_file_id, to_module)`
    ) as Array<{ from_file_id: number; to_file_id: number | null; to_module: string; weight: number }>;

    const edges: ImportEdge[] = [];

    for (const row of importRows) {
      // Only include imports from files in our set
      if (!nodeIds.has(row.from_file_id)) continue;

      const fromNode = nodeMap.get(row.from_file_id);
      if (!fromNode) continue;

      let toId: number | null = row.to_file_id;

      // Try to resolve to_module to a file ID
      if (!toId && row.to_module) {
        toId = resolveModuleToFileId(row.to_module, pathToIdMap);
      }

      // Only include edges between files in our set
      if (toId && nodeIds.has(toId)) {
        const toNode = nodeMap.get(toId);
        if (toNode) {
          edges.push({
            from: row.from_file_id,
            to: toId,
            weight: row.weight,
          });

          fromNode.degree += row.weight;
          toNode.degree += row.weight;
        }
      }
    }

    return {
      nodes,
      edges,
    };
  } finally {
    db.close();
  }
}
