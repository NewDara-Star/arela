/**
 * Graph Slice - Indexer
 * Scans codebase and populates graph
 */

import path from "node:path";
import { GraphDB } from "./db.js";
import { listDirectoryStructuredOp, readFileOp } from "../fs/ops.js";

// ... (regex same)

export async function indexCodebase(projectPath: string) {
    const db = await GraphDB.create(projectPath);

    // 1. Scan all files
    const files = await findAllFiles(projectPath);

    // ... (rest of logic same until reading file)

    // ...

    // 3. Parse imports
    for (const file of files) {
        const content = await readFileOp(file);
        const sourcePath = path.relative(projectPath, file);
        // ... (rest same)
    }

    db.close();
    return files.length;
}

// Helper: Recursive file finding using Structured Op
async function findAllFiles(dir: string): Promise<string[]> {
    const entries = await listDirectoryStructuredOp(dir);
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = entry.path; // Already absolute

        if (entry.type === 'directory') {
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
