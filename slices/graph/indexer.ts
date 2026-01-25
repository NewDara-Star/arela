/**
 * Graph Slice - Indexer
 * Scans codebase and populates graph
 */

import path from "node:path";
import { GraphDB } from "./db.js";
import { listDirectoryStructuredOp, readFileOp, fileExistsOp } from "../fs/ops.js";
import { getIgnoreGlobs, shouldIgnorePath } from "../shared/ignore.js";

type ImportType = "static" | "dynamic";
type ImportRef = { specifier: string; type: ImportType };
type TsconfigPaths = Record<string, string[]>;
type Tsconfig = {
    baseUrl?: string;
    paths?: TsconfigPaths;
};

const STATIC_IMPORT_RE = /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

export async function indexCodebase(
    projectPath: string,
    onProgress?: (current: number, total: number, file: string) => void
) {
    const db = await GraphDB.create(projectPath);

    // 1. Scan all files
    const ignoreGlobs = await getIgnoreGlobs(projectPath);
    const files = await findAllFiles(projectPath, projectPath, ignoreGlobs);

    // 2. Reset graph for fresh index
    db.reset();

    // 3. Parse imports
    const tsconfig = await loadTsconfig(projectPath);
    let i = 0;
    for (const file of files) {
        i += 1;
        if (onProgress) onProgress(i, files.length, file);
        const content = await readFileOp(file);
        const sourcePath = path.relative(projectPath, file);
        const sourceId = db.insertFile(sourcePath);

        const imports = extractImports(content);
        for (const imp of imports) {
            const resolved = await resolveImportPath(projectPath, file, imp.specifier, tsconfig);
            if (!resolved) continue;
            const targetPath = path.relative(projectPath, resolved);
            const targetId = db.insertFile(targetPath);
            db.addImport(sourceId, targetId, imp.type);
        }
    }

    db.close();
    return files.length;
}

// Helper: Recursive file finding using Structured Op
async function findAllFiles(dir: string, projectPath: string, ignoreGlobs: string[]): Promise<string[]> {
    const entries = await listDirectoryStructuredOp(dir);
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = entry.path; // Already absolute
        const relativePath = path.relative(projectPath, fullPath);
        if (shouldIgnorePath(relativePath, ignoreGlobs)) continue;

        if (entry.type === 'directory') {
            if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name.startsWith(".")) continue;
            files.push(...(await findAllFiles(fullPath, projectPath, ignoreGlobs)));
        } else {
            if (
                entry.name.endsWith(".ts") ||
                entry.name.endsWith(".tsx") ||
                entry.name.endsWith(".js") ||
                entry.name.endsWith(".jsx") ||
                entry.name.endsWith(".mjs") ||
                entry.name.endsWith(".cjs") ||
                entry.name.endsWith(".mts") ||
                entry.name.endsWith(".cts")
            ) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function extractImports(content: string): ImportRef[] {
    const results: ImportRef[] = [];
    const seen = new Set<string>();

    const push = (specifier: string, type: ImportType) => {
        const key = `${type}:${specifier}`;
        if (seen.has(key)) return;
        seen.add(key);
        results.push({ specifier, type });
    };

    for (const match of content.matchAll(STATIC_IMPORT_RE)) {
        push(match[1], "static");
    }
    for (const match of content.matchAll(DYNAMIC_IMPORT_RE)) {
        push(match[1], "dynamic");
    }
    for (const match of content.matchAll(REQUIRE_RE)) {
        push(match[1], "dynamic");
    }

    return results;
}

async function loadTsconfig(projectPath: string): Promise<Tsconfig> {
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    if (!await fileExistsOp(tsconfigPath)) return {};

    try {
        const raw = await readFileOp(tsconfigPath);
        const cleaned = stripJsonComments(raw);
        const parsed = JSON.parse(cleaned);
        const compilerOptions = parsed.compilerOptions || {};
        const baseUrl = compilerOptions.baseUrl;
        const paths = compilerOptions.paths;
        return { baseUrl, paths };
    } catch {
        return {};
    }
}

function stripJsonComments(input: string): string {
    const withoutBlock = input.replace(/\/\*[\s\S]*?\*\//g, "");
    const withoutLine = withoutBlock.replace(/^\s*\/\/.*$/gm, "");
    return withoutLine;
}

async function resolveImportPath(
    projectPath: string,
    sourceFile: string,
    specifier: string,
    tsconfig: Tsconfig
): Promise<string | null> {
    // Relative
    if (specifier.startsWith(".")) {
        return await resolveFileCandidate(path.resolve(path.dirname(sourceFile), specifier));
    }

    // Absolute-from-root import ("/src/...")
    if (specifier.startsWith("/")) {
        const abs = path.resolve(projectPath, "." + specifier);
        const resolved = await resolveFileCandidate(abs);
        if (resolved) return resolved;
    }

    // Paths aliases
    const pathMatch = await resolvePathAlias(projectPath, specifier, tsconfig);
    if (pathMatch) return pathMatch;

    // baseUrl fallback (only if file exists)
    if (tsconfig.baseUrl) {
        const abs = path.resolve(projectPath, tsconfig.baseUrl, specifier);
        const resolved = await resolveFileCandidate(abs);
        if (resolved) return resolved;
    }

    return null; // external package or unresolved
}

async function resolvePathAlias(projectPath: string, specifier: string, tsconfig: Tsconfig): Promise<string | null> {
    if (!tsconfig.paths) return null;
    const baseUrl = tsconfig.baseUrl ? path.resolve(projectPath, tsconfig.baseUrl) : projectPath;

    for (const [pattern, targets] of Object.entries(tsconfig.paths)) {
        const { match, wildcard } = matchAlias(pattern, specifier);
        if (!match) continue;

        for (const target of targets) {
            const replaced = wildcard !== null ? target.replace("*", wildcard) : target;
            const abs = path.resolve(baseUrl, replaced);
            const resolved = await resolveFileCandidate(abs);
            if (resolved) return resolved;
        }
    }

    return null;
}

function matchAlias(pattern: string, specifier: string): { match: boolean; wildcard: string | null } {
    const starIndex = pattern.indexOf("*");
    if (starIndex === -1) {
        return { match: pattern === specifier, wildcard: null };
    }

    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return { match: false, wildcard: null };
    const wildcard = specifier.slice(prefix.length, specifier.length - suffix.length);
    return { match: true, wildcard };
}

async function resolveFileCandidate(basePath: string): Promise<string | null> {
    const hasExt = !!path.extname(basePath);
    const candidates: string[] = [];

    if (hasExt) {
        candidates.push(basePath);
    } else {
        candidates.push(basePath + ".ts", basePath + ".tsx", basePath + ".js", basePath + ".jsx", basePath + ".mts", basePath + ".cts", basePath + ".mjs", basePath + ".cjs");
        candidates.push(path.join(basePath, "index.ts"), path.join(basePath, "index.tsx"), path.join(basePath, "index.js"), path.join(basePath, "index.jsx"));
    }

    for (const candidate of candidates) {
        if (await fileExistsOp(candidate)) return candidate;
    }

    return null;
}
