/**
 * Cohesion calculator - measures intra-module/feature connections
 * Higher cohesion is better (files in the same module are more related)
 */

import { DirectoryAnalysis } from "./types.js";

export interface CohesionAnalysis {
  totalImports: number;
  internalImports: number; // imports within same directory
  externalImports: number; // imports outside directory
  cohesion: number; // 0-100
  directoryScores: Map<string, number>;
}

/**
 * Calculate cohesion score for modules/features
 *
 * Algorithm:
 * 1. For each directory, count internal vs external imports
 * 2. Internal imports = connections within the directory (good)
 * 3. External imports = dependencies outside the directory (scattered)
 * 4. Score = (internalImports / totalImports) * 100
 *
 * Score scale:
 * 0-20: Very scattered (files in module are unrelated)
 * 21-40: Scattered (some related files)
 * 41-60: Moderate (reasonably grouped)
 * 61-80: Good (tightly grouped)
 * 81-100: Excellent (highly cohesive)
 *
 * Note: For feature-based (vertical) architectures, high cohesion is very important
 * For layer-based (horizontal) architectures, high internal cohesion per layer indicates
 * that files within each layer are tightly related (which can be good or bad depending on context)
 */
export function calculateCohesion(
  imports: Array<{ from: string; to: string | null; fromDir: string; toDir?: string }>,
  directories: Map<string, DirectoryAnalysis>
): CohesionAnalysis {
  let totalImports = 0;
  let internalImports = 0;
  let externalImports = 0;
  const directoryScores = new Map<string, number>();

  // Initialize directory scores
  for (const dir of directories.values()) {
    directoryScores.set(dir.path, 0);
  }

  // Analyze each import
  const importsByDir = new Map<string, { internal: number; external: number }>();

  for (const imp of imports) {
    if (!imp.to || !imp.fromDir) continue;

    totalImports++;

    if (!importsByDir.has(imp.fromDir)) {
      importsByDir.set(imp.fromDir, { internal: 0, external: 0 });
    }

    // Check if this is an internal import
    if (imp.toDir === imp.fromDir) {
      internalImports++;
      importsByDir.get(imp.fromDir)!.internal++;
    } else {
      externalImports++;
      importsByDir.get(imp.fromDir)!.external++;
    }
  }

  // Calculate cohesion score per directory
  for (const [dir, counts] of importsByDir) {
    const dirTotal = counts.internal + counts.external;
    const score = dirTotal > 0 ? Math.round((counts.internal / dirTotal) * 100) : 50;
    directoryScores.set(dir, score);
  }

  // Calculate overall cohesion
  const overallCohesion =
    totalImports > 0 ? Math.round((internalImports / totalImports) * 100) : 50;

  return {
    totalImports,
    internalImports,
    externalImports,
    cohesion: overallCohesion,
    directoryScores,
  };
}

/**
 * Identify directories with low cohesion (scattered files)
 */
export function detectCohesionIssues(
  analysis: CohesionAnalysis,
  directories: Map<string, DirectoryAnalysis>
): Array<{ severity: 'critical' | 'warning'; message: string; directory: string; score: number }> {
  const issues: Array<{ severity: 'critical' | 'warning'; message: string; directory: string; score: number }> = [];

  // Check overall cohesion
  if (analysis.cohesion < 20) {
    issues.push({
      severity: "critical",
      message: "Very low overall cohesion - files are scattered across directories",
      directory: "overall",
      score: analysis.cohesion,
    });
  } else if (analysis.cohesion < 40) {
    issues.push({
      severity: "warning",
      message: "Low overall cohesion - files should be better grouped",
      directory: "overall",
      score: analysis.cohesion,
    });
  }

  // Check individual directory cohesion
  for (const [dir, score] of analysis.directoryScores) {
    if (score < 20) {
      issues.push({
        severity: "critical",
        message: `Very low cohesion in ${dir} - files are scattered`,
        directory: dir,
        score,
      });
    } else if (score < 30 && directories.get(dir)?.type === "feature") {
      // For feature directories, we expect higher cohesion
      issues.push({
        severity: "warning",
        message: `Low cohesion in feature ${dir} - consider consolidating related files`,
        directory: dir,
        score,
      });
    }
  }

  return issues;
}

/**
 * Estimate feature cohesion as percentage of features with good cohesion
 */
export function calculateFeatureCohesion(
  analysis: CohesionAnalysis,
  directories: Map<string, DirectoryAnalysis>
): number {
  let featureCount = 0;
  let goodFeatureCount = 0;

  for (const dir of directories.values()) {
    if (dir.type === "feature" || dir.type === "module") {
      featureCount++;
      const score = analysis.directoryScores.get(dir.path) || 0;
      if (score >= 50) {
        goodFeatureCount++;
      }
    }
  }

  return featureCount > 0
    ? Math.round((goodFeatureCount / featureCount) * 100)
    : 50;
}

/**
 * Calculate shared state/utility usage
 * High usage of shared utilities can indicate poor cohesion
 */
export function detectSharedStateIssues(
  imports: Array<{ from: string; to: string | null; fromDir: string; toDir?: string }>,
  directories: Map<string, DirectoryAnalysis>
): Array<{ directory: string; count: number; files: string[] }> {
  const sharedImports = new Map<string, Set<string>>();

  // Identify utilities/shared directories
  const utilDirs = Array.from(directories.values())
    .filter(d => d.type === "layer" && (d.path.includes("util") || d.path.includes("shared")))
    .map(d => d.path);

  if (utilDirs.length === 0) {
    return [];
  }

  // Track which directories import from utils
  for (const imp of imports) {
    if (imp.toDir && utilDirs.includes(imp.toDir) && imp.fromDir !== imp.toDir) {
      if (!sharedImports.has(imp.toDir)) {
        sharedImports.set(imp.toDir, new Set());
      }
      sharedImports.get(imp.toDir)!.add(imp.from);
    }
  }

  // Return directories with high shared state usage
  return Array.from(sharedImports)
    .filter(([_, files]) => files.size > 5)
    .map(([dir, files]) => ({
      directory: dir,
      count: files.size,
      files: Array.from(files).slice(0, 5),
    }));
}
