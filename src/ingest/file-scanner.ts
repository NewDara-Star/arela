/**
 * File Scanner - Scans directories for TypeScript/JavaScript files
 */

import glob from "fast-glob";
import path from "path";
import fs from "fs";

const SUPPORTED_EXTENSIONS = [
  // JavaScript/TypeScript
  '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs',
  // Python
  '.py',
  // Go
  '.go',
  // Rust
  '.rs',
  // Ruby
  '.rb',
  // PHP
  '.php',
  // Java
  '.java',
  // C#
  '.cs',
  // C/C++
  '.c', '.cpp', '.h', '.hpp',
  // Swift
  '.swift',
  // Kotlin
  '.kt',
];
const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/test/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
  '.arela/**'
];

/**
 * Scan a directory for TypeScript/JavaScript files
 */
export async function scanDirectory(
  repoPath: string,
  options?: {
    ignore?: string[];
    verbose?: boolean;
  }
): Promise<string[]> {
  const absolutePath = path.resolve(repoPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory not found: ${absolutePath}`);
  }

  const ignorePatterns = [...IGNORED_PATTERNS, ...(options?.ignore ?? [])];

  try {
    const files = await glob(`**/*{${SUPPORTED_EXTENSIONS.join(',')}}`, {
      cwd: absolutePath,
      ignore: ignorePatterns,
      absolute: false,
    });

    return files.filter(file => {
      // Filter by supported extensions
      const ext = path.extname(file);
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
  } catch (error) {
    throw new Error(`Failed to scan directory ${absolutePath}: ${error}`);
  }
}

/**
 * Get line count of a file
 */
export function getLineCount(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Determine file type based on path and content
 */
export function determineFileType(
  filePath: string,
  content?: string
): 'component' | 'service' | 'controller' | 'util' | 'hook' | 'type' | 'config' | 'other' {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();

  // Type definitions
  if (fileName.endsWith('.d.ts')) return 'type';

  // Configuration files
  if (
    fileName.includes('config') ||
    fileName === 'vite.config.ts' ||
    fileName === 'tsconfig.json' ||
    fileName === 'jest.config.ts'
  ) {
    return 'config';
  }

  // React Hooks
  if (fileName.startsWith('use') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
    return 'hook';
  }

  // Components
  if (
    fileName.endsWith('.component.ts') ||
    fileName.endsWith('.component.tsx') ||
    dirPath.includes('component') ||
    dirPath.includes('components') ||
    (fileName[0] === fileName[0].toUpperCase() && fileName.endsWith('.tsx'))
  ) {
    return 'component';
  }

  // Services
  if (
    fileName.endsWith('.service.ts') ||
    dirPath.includes('service') ||
    dirPath.includes('services')
  ) {
    return 'service';
  }

  // Controllers
  if (
    fileName.endsWith('.controller.ts') ||
    dirPath.includes('controller') ||
    dirPath.includes('controllers')
  ) {
    return 'controller';
  }

  // Utilities
  if (
    fileName.includes('util') ||
    fileName.includes('helper') ||
    dirPath.includes('util') ||
    dirPath.includes('utils')
  ) {
    return 'util';
  }

  return 'other';
}
