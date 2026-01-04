/**
 * Graph Slice - Indexer
 * Scans codebase and populates graph
 */

import fs from "fs-extra";
import path from "node:path";
import { GraphDB } from "./db.js";

// Simple Regex for Imports in TS/JS
// Matches: import ... from "..."
const IMPORT_REGEX = /import\s+[\s\S]*?from\s+["']([^"']+)["']/g;
// Matches: import("...")
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

export async function indexCodebase(projectPath: string) {
    const db = new GraphDB(projectPath);

    // 1. Scan all files
    const files = await findAllFiles(projectPath);

    // 2. Register all files first (so we have IDs)
    console.log(`Indexing ${files.length} files...`);
    const pathToId = new Map<string, number>();

    for (const file of files) {
        const relativePath = path.relative(projectPath, file);
        const id = db.insertFile(relativePath);
        pathToId.set(relativePath, id);
    }

    // 3. Parse imports
    for (const file of files) {
        const content = await fs.readFile(file, "utf-8");
        const sourcePath = path.relative(projectPath, file);
        const sourceId = pathToId.get(sourcePath)!;

        // Find imports
        const imports = [
            ...content.matchAll(IMPORT_REGEX),
            ...content.matchAll(DYNAMIC_IMPORT_REGEX)
        ];

        for (const match of imports) {
            const importPath = match[1];

            // Resolve path
            const resolved = resolveImport(sourcePath, importPath);
            if (resolved && pathToId.has(resolved)) {
                const targetId = pathToId.get(resolved)!;
                db.addImport(sourceId, targetId);
            }
        }
    }

    db.close();
    return files.length;
}

// Helper: Recursive file finding
async function findAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name.startsWith(".")) continue;
            files.push(...(await findAllFiles(fullPath)));
        } else {
            if (entry.name.endsWith(".ts") || entry.name.endsWith(".js") || entry.name.endsWith(".tsx")) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

// Helper: Resolve relative imports
function resolveImport(sourceFile: string, importPath: string): string | null {
    if (!importPath.startsWith(".")) return null; // Ignore packages for now

    const sourceDir = path.dirname(sourceFile);
    let resolved = path.join(sourceDir, importPath);

    // Handle ESM imports having .js extension but mapping to .ts files on disk
    if (resolved.endsWith(".js")) {
        // We optimistically assume it maps to .ts for this TS-based graph
        return resolved.replace(/\.js$/, ".ts");
    }

    // Simplistic extension handling
    if (!resolved.endsWith(".ts") && !resolved.endsWith(".js") && !resolved.endsWith(".tsx")) {
        resolved += ".ts"; // Try TS first
    }

    return resolved;
}
