/**
 * Graph Builder - Constructs dependency graph from analyzed files
 */

import path from "path";
import fs from "fs";
import { GraphDB } from "./storage.js";
import { FileAnalysis, FileNode } from "./types.js";

/**
 * Build the dependency graph from analyzed files
 */
export async function buildGraph(
  analyses: FileAnalysis[],
  repoPath: string,
  db: GraphDB,
  onProgress?: (message: string) => void
): Promise<void> {
  const totalFiles = analyses.length;

  onProgress?.(`Building graph from ${totalFiles} analyzed files...`);

  // Extract Go module name if this is a Go project
  const goModuleName = extractGoModuleName(repoPath);

  // Phase 1: Add all files to the database
  const fileIdMap = new Map<string, number>();
  const functionIdMap = new Map<string, number>();

  db.beginTransaction();

  try {
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      onProgress?.(`Adding files to graph (${i + 1}/${totalFiles})...`);

      // Add file
      const fileNode: FileNode = {
        path: analysis.filePath,
        repoPath,
        type: analysis.type,
        lines: analysis.lines,
      };

      const fileId = db.addFile(fileNode);
      fileIdMap.set(analysis.filePath, fileId);

      // Add functions from this file
      for (const fn of analysis.functions) {
        const functionId = db.addFunction(fileId, fn);
        const functionKey = `${analysis.filePath}::${fn.name}`;
        functionIdMap.set(functionKey, functionId);
      }

      // Add API endpoints
      for (const endpoint of analysis.apiEndpoints) {
        endpoint.fileId = fileId;
        db.addApiEndpoint(endpoint);
      }

      // Add API calls
      for (const call of analysis.apiCalls) {
        db.addApiCall(fileId, call);
      }
    }

    // Phase 2: Resolve and add import relationships
    onProgress?.(`Resolving import relationships...`);

    for (const analysis of analyses) {
      const fromFileId = fileIdMap.get(analysis.filePath);
      if (!fromFileId) continue;

      for (const imp of analysis.imports) {
        // Try to resolve the import to a file
        const resolvedPath = resolveImport(imp.from, analysis.filePath, repoPath, goModuleName, fileIdMap);
        const toFileId = resolvedPath ? fileIdMap.get(resolvedPath) : null;

        db.addImport(
          fromFileId,
          toFileId ?? null,
          imp.from,
          imp.type,
          imp.names,
          imp.line
        );
      }
    }

    // Phase 3: Resolve and add function call relationships
    onProgress?.(`Resolving function calls...`);

    for (const analysis of analyses) {
      const fromFileId = fileIdMap.get(analysis.filePath);
      if (!fromFileId) continue;

      for (const fn of analysis.functions) {
        const functionKey = `${analysis.filePath}::${fn.name}`;
        const functionId = functionIdMap.get(functionKey);
        if (!functionId) continue;

        // Analyze function body for calls (simple pattern matching)
        // For now, we'll do a basic resolution based on function names
        // A more sophisticated approach would parse the AST again
        const potentialCalls = findPotentialFunctionCalls(fn.name, analysis);

        for (const callInfo of potentialCalls) {
          // Try to find the called function
          let calledFunctionId: number | null = null;

          // Check in same file first
          const sameFunctionKey = `${analysis.filePath}::${callInfo.name}`;
          calledFunctionId = functionIdMap.get(sameFunctionKey) ?? null;

          // Try imported modules
          if (!calledFunctionId) {
            for (const imp of analysis.imports) {
              const resolvedPath = resolveImport(imp.from, analysis.filePath, repoPath, goModuleName, fileIdMap);
              if (resolvedPath && imp.names.includes(callInfo.name)) {
                const importedFunctionKey = `${resolvedPath}::${callInfo.name}`;
                calledFunctionId = functionIdMap.get(importedFunctionKey) ?? null;
                if (calledFunctionId) break;
              }
            }
          }

          db.addFunctionCall(
            functionId,
            calledFunctionId,
            callInfo.name,
            callInfo.line
          );
        }
      }
    }

    db.commit();
  } catch (error) {
    db.rollback();
    throw error;
  }
}

/**
 * Resolve an import path to an absolute file path
 * Handles various import patterns: relative paths, node_modules, aliases
 * Supports TypeScript, JavaScript, Python, Go, Rust, and more
 */
function resolveImport(
  importPath: string,
  fromFilePath: string,
  repoPath: string,
  goModuleName?: string | null,
  fileIdMap?: Map<string, number>
): string | null {
  // Detect language from file extension
  const fileExt = path.extname(fromFilePath);
  const language = detectLanguage(fileExt);

  // Handle Python imports
  if (language === 'python') {
    return resolvePythonImport(importPath, fromFilePath, repoPath);
  }

  // Handle Go imports
  if (language === 'go') {
    return resolveGoImport(importPath, fromFilePath, repoPath, goModuleName, fileIdMap);
  }

  // Handle Rust imports
  if (language === 'rust') {
    return resolveRustImport(importPath, fromFilePath, repoPath);
  }

  // Handle TypeScript/JavaScript imports
  return resolveJsImport(importPath, fromFilePath, repoPath);
}

/**
 * Extract Go module name from go.mod file
 * Returns the module name (e.g., "zombie-survival" from "module zombie-survival")
 * Returns null if go.mod doesn't exist or is not a Go project
 */
function extractGoModuleName(repoPath: string): string | null {
  try {
    const goModPath = path.join(repoPath, 'go.mod');

    if (!fs.existsSync(goModPath)) {
      return null;
    }

    const content = fs.readFileSync(goModPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('module ')) {
        // Extract module name (e.g., "module zombie-survival" -> "zombie-survival")
        const moduleName = trimmed.substring(7).trim();
        return moduleName;
      }
    }
  } catch (error) {
    // If there's an error reading go.mod, just return null
    // This allows other language projects to work without issues
  }

  return null;
}

/**
 * Detect language from file extension
 */
function detectLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.mts': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.java': 'java',
    '.cs': 'csharp',
    '.cpp': 'cpp',
    '.c': 'c',
    '.swift': 'swift',
    '.kt': 'kotlin',
  };
  return langMap[ext] || 'unknown';
}

/**
 * Resolve TypeScript/JavaScript imports
 */
function resolveJsImport(
  importPath: string,
  fromFilePath: string,
  repoPath: string
): string | null {
  // Skip node_modules imports
  if (!importPath.startsWith('.')) {
    return null;
  }

  // Resolve relative imports
  const fromDir = path.dirname(fromFilePath);
  let resolvedPath = path.join(fromDir, importPath);

  // Normalize to repo-relative path
  const repoRelative = path.relative(repoPath, resolvedPath);

  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '/index.ts', '/index.tsx', '/index.js'];

  for (const ext of extensions) {
    const candidatePath = repoRelative.endsWith(ext) ? repoRelative : `${repoRelative}${ext}`;
    if (!repoRelative.includes('node_modules')) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Resolve Python imports
 * Handles: from .module import X, from ..parent import Y, import package.module
 */
function resolvePythonImport(
  importPath: string,
  fromFilePath: string,
  repoPath: string
): string | null {
  // Skip standard library and external packages
  const stdLibs = ['sys', 'os', 'json', 'datetime', 'typing', 'pathlib', 'collections', 're', 'argparse', 'logging'];
  const externalPackages = ['django', 'flask', 'fastapi', 'requests', 'numpy', 'pandas', 'psycopg2', 'sqlalchemy', 'pydantic'];
  
  if (stdLibs.includes(importPath.split('.')[0]) || externalPackages.includes(importPath.split('.')[0])) {
    return null;
  }

  const fromDir = path.dirname(fromFilePath);

  // Handle relative imports: .module or ..parent.module
  if (importPath.startsWith('.')) {
    const levels = importPath.match(/^\.+/)?.[0].length || 0;
    const modulePath = importPath.substring(levels);

    // Go up 'levels - 1' directories (one dot = same dir)
    let targetDir = fromDir;
    for (let i = 1; i < levels; i++) {
      targetDir = path.dirname(targetDir);
    }

    // Convert module path to file path
    const filePath = modulePath.replace(/\./g, path.sep);
    const resolvedPath = path.join(targetDir, filePath);
    const repoRelative = path.relative(repoPath, resolvedPath);

    // Try .py and __init__.py
    const candidates = [
      `${repoRelative}.py`,
      path.join(repoRelative, '__init__.py'),
    ];

    for (const candidate of candidates) {
      if (!candidate.includes('node_modules') && !candidate.includes('venv')) {
        return candidate;
      }
    }
  }

  // Handle absolute imports: package.module.submodule
  // Convert dots to path separators
  const filePath = importPath.replace(/\./g, path.sep);
  
  // Try from repo root
  const candidates = [
    `${filePath}.py`,
    path.join(filePath, '__init__.py'),
  ];

  for (const candidate of candidates) {
    if (!candidate.includes('venv') && !candidate.includes('site-packages')) {
      return candidate;
    }
  }

  return null;
}

/**
 * Resolve Go imports
 * Handles: relative imports, module-prefixed imports, and external packages
 */
function resolveGoImport(
  importPath: string,
  fromFilePath: string,
  repoPath: string,
  goModuleName?: string | null,
  fileIdMap?: Map<string, number>
): string | null {
  // Skip standard library imports (single word or stdlib packages)
  if (!importPath.includes('/')) {
    return null;
  }

  // Handle relative imports (e.g., ./sibling, ../parent)
  if (importPath.startsWith('.')) {
    const fromDir = path.dirname(fromFilePath);
    const resolvedPath = path.join(fromDir, importPath);
    const relPath = path.relative(repoPath, resolvedPath);

    // Look for .go files in the resolved directory
    if (fileIdMap) {
      for (const [filePath] of fileIdMap.entries()) {
        if (filePath.startsWith(relPath + '/') && filePath.endsWith('.go')) {
          return filePath;
        }
        // Also check if it matches the directory directly
        if (path.dirname(filePath) === relPath && filePath.endsWith('.go')) {
          return filePath;
        }
      }
    }

    return null;
  }

  // Handle module-prefixed imports (e.g., module-name/package/subpackage)
  if (goModuleName && importPath.startsWith(goModuleName + '/')) {
    // Strip the module prefix to get the relative path
    const relativePath = importPath.substring(goModuleName.length + 1);

    // Look for any .go file in that directory
    if (fileIdMap) {
      for (const [filePath] of fileIdMap.entries()) {
        // Check if this file is in the target directory
        if (filePath.startsWith(relativePath + '/') && filePath.endsWith('.go')) {
          return filePath;
        }
        // Check if the file is directly in the target directory (package-level)
        if (path.dirname(filePath) === relativePath && filePath.endsWith('.go')) {
          return filePath;
        }
      }
    }

    return null;
  }

  // Handle external module imports (e.g., github.com/user/repo/package)
  // Only process internal paths if they look like they're part of this repo
  const parts = importPath.split('/');
  if (parts.length > 3 && !importPath.includes('github.com') && !importPath.includes('gitlab.com')) {
    // Might be a monorepo or multi-module setup
    const internalPath = parts.slice(3).join('/');

    if (fileIdMap) {
      for (const [filePath] of fileIdMap.entries()) {
        if (filePath.startsWith(internalPath + '/') && filePath.endsWith('.go')) {
          return filePath;
        }
        if (path.dirname(filePath) === internalPath && filePath.endsWith('.go')) {
          return filePath;
        }
      }
    }

    return null;
  }

  // External packages (github.com, etc.) remain unresolved
  return null;
}

/**
 * Resolve Rust imports
 */
function resolveRustImport(
  importPath: string,
  fromFilePath: string,
  repoPath: string
): string | null {
  // Skip external crates
  if (!importPath.startsWith('crate::') && !importPath.startsWith('super::') && !importPath.startsWith('self::')) {
    return null;
  }

  // Handle crate:: (from root)
  if (importPath.startsWith('crate::')) {
    const modulePath = importPath.substring(7).replace(/::/g, '/');
    return `src/${modulePath}.rs`;
  }

  // Handle super:: (parent module)
  if (importPath.startsWith('super::')) {
    const fromDir = path.dirname(fromFilePath);
    const parentDir = path.dirname(fromDir);
    const modulePath = importPath.substring(7).replace(/::/g, '/');
    const resolvedPath = path.join(parentDir, modulePath);
    return `${path.relative(repoPath, resolvedPath)}.rs`;
  }

  // Handle self:: (current module)
  if (importPath.startsWith('self::')) {
    const fromDir = path.dirname(fromFilePath);
    const modulePath = importPath.substring(6).replace(/::/g, '/');
    const resolvedPath = path.join(fromDir, modulePath);
    return `${path.relative(repoPath, resolvedPath)}.rs`;
  }

  return null;
}

/**
 * Find potential function calls in a function (simple heuristic)
 * In a real implementation, this would re-parse the function body
 */
function findPotentialFunctionCalls(
  functionName: string,
  analysis: FileAnalysis
): Array<{ name: string; line: number }> {
  // This is a simplified implementation
  // A more sophisticated approach would re-analyze the function body
  const calls: Array<{ name: string; line: number }> = [];

  // Look for common function call patterns
  // This is a basic heuristic and should be improved
  const localFunctionNames = analysis.functions.map(f => f.name);

  // In a real implementation, we would:
  // 1. Get the function body from the AST
  // 2. Find all CallExpression nodes
  // 3. Extract the function names being called
  // For now, return empty array

  return calls;
}

/**
 * Get statistics about the built graph
 */
export function getGraphStats(db: GraphDB): {
  modules: number;
  components: number;
  services: number;
  apiEndpoints: number;
} {
  const stats = {
    modules: 0,
    components: 0,
    services: 0,
    apiEndpoints: 0,
  };

  try {
    stats.modules = (db.query('SELECT COUNT(DISTINCT path) as count FROM files')[0]?.count || 0) as number;
    stats.components = (db.query("SELECT COUNT(*) as count FROM files WHERE type = 'component'")[0]?.count || 0) as number;
    stats.services = (db.query("SELECT COUNT(*) as count FROM files WHERE type = 'service'")[0]?.count || 0) as number;
    stats.apiEndpoints = (db.query('SELECT COUNT(*) as count FROM api_endpoints')[0]?.count || 0) as number;
  } catch (error) {
    // Return partial stats if there's an error
  }

  return stats;
}
