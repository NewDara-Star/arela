/**
 * Directory pattern detection for horizontal vs vertical architecture
 */

import path from "path";
import { DirectoryAnalysis, DirectoryType } from "./types.js";

// Patterns that indicate horizontal (layered) architecture
const HORIZONTAL_PATTERNS = [
  /^components?$/i,
  /^containers?$/i,
  /^pages?$/i,
  /^services?$/i,
  /^controllers?$/i,
  /^models?$/i,
  /^views?$/i,
  /^routes?$/i,
  /^middleware?$/i,
  /^utils?$/i,
  /^helpers?$/i,
  /^hooks?$/i,
  /^store$/i,
  /^reducers?$/i,
  /^actions?$/i,
  /^types?$/i,
  /^interfaces?$/i,
  /^schemas?$/i,
  /^constants?$/i,
  /^config$/i,
  /^lib$/i,
];

// Patterns that indicate vertical (feature/slice) architecture
const VERTICAL_PATTERNS = [
  /^features?$/i,
  /^modules?$/i,
  /^slices?$/i,
  /^domains?$/i,
  /^sections?$/i,
  /^products?$/i,
];

export interface DirectoryStats {
  path: string;
  depth: number;
  fileName: string;
  isLayerDir: boolean;
  isFeatureDir: boolean;
  fileCount: number;
}

/**
 * Analyze directory structure and classify as layer or feature directory
 */
export function analyzeDirectoryStructure(
  files: Array<{ path: string; type: string }>
): Map<string, DirectoryAnalysis> {
  const dirStats = new Map<string, DirectoryStats>();

  // Scan all files and extract directory information
  for (const file of files) {
    const parts = file.path.split("/").filter(p => p && p !== ".");

    // Analyze each directory level
    for (let i = 1; i <= parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");

      if (!dirStats.has(dirPath)) {
        const fileName = parts[i - 1];
        const isLayerDir = HORIZONTAL_PATTERNS.some(p => p.test(fileName));
        const isFeatureDir = VERTICAL_PATTERNS.some(p => p.test(fileName));

        dirStats.set(dirPath, {
          path: dirPath,
          depth: i,
          fileName,
          isLayerDir,
          isFeatureDir,
          fileCount: 0,
        });
      }

      const stat = dirStats.get(dirPath)!;
      stat.fileCount++;
    }
  }

  const result = new Map<string, DirectoryAnalysis>();

  for (const [dirPath, stat] of dirStats) {
    // Only include top-level directories (depth <= 2 for meaningful analysis)
    if (stat.depth > 2) continue;

    let type: DirectoryType = "other";
    if (stat.isLayerDir) {
      type = "layer";
    } else if (stat.isFeatureDir) {
      type = "feature";
    } else if (dirPath.includes("/")) {
      // If it's a subdirectory of a feature, it's a module
      const parent = dirPath.split("/")[0];
      const parentIsFeature = VERTICAL_PATTERNS.some(p => p.test(parent));
      if (parentIsFeature) {
        type = "module";
      }
    }

    result.set(dirPath, {
      path: dirPath,
      type,
      fileCount: stat.fileCount,
      internalImports: 0, // Will be calculated during coupling analysis
      externalImports: 0,
      importedBy: 0,
    });
  }

  return result;
}

/**
 * Determine if architecture is primarily horizontal or vertical
 */
export function classifyArchitecture(
  directories: Map<string, DirectoryAnalysis>
): { type: 'horizontal' | 'vertical' | 'hybrid'; score: number } {
  let layerDirs = 0;
  let featureDirs = 0;
  let moduleDirs = 0;

  for (const dir of directories.values()) {
    if (dir.type === "layer") layerDirs++;
    else if (dir.type === "feature") featureDirs++;
    else if (dir.type === "module") moduleDirs++;
  }

  const total = layerDirs + featureDirs + moduleDirs;
  if (total === 0) {
    return { type: "hybrid", score: 50 };
  }

  const layerPercentage = (layerDirs / total) * 100;
  const featurePercentage = (featureDirs / total) * 100;

  // Determine architecture type
  if (layerPercentage > 60) {
    return { type: "horizontal", score: Math.round(layerPercentage) };
  } else if (featurePercentage > 60) {
    return { type: "vertical", score: Math.round(featurePercentage) };
  } else {
    return { type: "hybrid", score: 50 };
  }
}

/**
 * Extract top-level directories from file paths
 */
export function getTopLevelDirs(filePaths: string[]): Set<string> {
  const dirs = new Set<string>();

  for (const filePath of filePaths) {
    // Find first directory after any common prefixes
    const normalizedPath = filePath.replace(/\\/g, "/");
    const parts = normalizedPath.split("/").filter(p => p && !p.startsWith("."));

    if (parts.length > 0) {
      // Skip common root directories
      if (parts[0] !== "src" && parts[0] !== "lib" && parts[0] !== "app") {
        dirs.add(parts[0]);
      } else if (parts.length > 1) {
        dirs.add(parts[1]);
      }
    }
  }

  return dirs;
}

/**
 * Detect if a directory follows a layer pattern
 */
export function isLayerDirectory(dirName: string): boolean {
  return HORIZONTAL_PATTERNS.some(p => p.test(dirName));
}

/**
 * Detect if a directory follows a feature pattern
 */
export function isFeatureDirectory(dirName: string): boolean {
  return VERTICAL_PATTERNS.some(p => p.test(dirName));
}
