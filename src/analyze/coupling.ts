/**
 * Coupling calculator - measures cross-layer/cross-module dependencies
 * Lower coupling is better (less tightly coupled)
 */

import path from "path";
import { DirectoryAnalysis } from "./types.js";

export interface CouplingAnalysis {
  totalImports: number;
  crossDirectoryImports: number;
  crossLayerImports: number;
  coupling: number; // 0-100
  details: CouplingDetail[];
}

export interface CouplingDetail {
  from: string;
  to: string;
  count: number;
  isLayerViolation: boolean;
}

/**
 * Calculate coupling score from imports
 *
 * Algorithm:
 * 1. Count all imports in the codebase
 * 2. Identify cross-directory imports (dependencies between different dirs)
 * 3. For horizontal architectures, check if imports cross layers
 * 4. Score = (crossLayerImports / totalImports) * 100
 *
 * Score scale:
 * 0-20: Excellent (very loosely coupled)
 * 21-40: Good (loosely coupled)
 * 41-60: Fair (moderately coupled)
 * 61-80: Poor (tightly coupled)
 * 81-100: Critical (very tightly coupled)
 */
export function calculateCoupling(
  imports: Array<{ from: string; to: string | null; fromDir: string; toDir?: string }>,
  directories: Map<string, DirectoryAnalysis>
): CouplingAnalysis {
  const details: CouplingDetail[] = [];
  const couplingMap = new Map<string, number>();
  let totalImports = 0;
  let crossDirectoryImports = 0;
  let crossLayerImports = 0;

  // Analyze each import
  for (const imp of imports) {
    if (!imp.to) continue;

    totalImports++;

    // Check if this is a cross-directory import
    if (imp.fromDir && imp.toDir && imp.fromDir !== imp.toDir) {
      crossDirectoryImports++;

      // Check if this crosses a layer boundary
      const fromDir = directories.get(imp.fromDir);
      const toDir = directories.get(imp.toDir);

      // Cross-layer violations happen when:
      // 1. Both directories are layer-type directories
      // 2. They're at the same level in the hierarchy
      // 3. But the import violates expected dependency direction
      if (fromDir?.type === "layer" && toDir?.type === "layer") {
        const layerOrder = getLayerOrder(fromDir.path, toDir.path);
        if (layerOrder && layerOrder.violatesHierarchy) {
          crossLayerImports++;
        }
      }

      // Track coupling between directories
      const key = `${imp.fromDir} -> ${imp.toDir}`;
      couplingMap.set(key, (couplingMap.get(key) || 0) + 1);
    }
  }

  // Build details array
  for (const [key, count] of couplingMap) {
    const [from, to] = key.split(" -> ");
    const fromDir = directories.get(from);
    const toDir = directories.get(to);
    const isLayerViolation =
      fromDir?.type === "layer" &&
      toDir?.type === "layer" &&
      getLayerOrder(from, to)?.violatesHierarchy;

    details.push({
      from,
      to,
      count,
      isLayerViolation: isLayerViolation || false,
    });
  }

  // Calculate coupling score
  // More weight on cross-layer violations
  let couplingScore = 0;
  if (totalImports > 0) {
    const crossDirRatio = crossDirectoryImports / totalImports;
    const crossLayerRatio = crossLayerImports / totalImports;

    // Weighting: cross-directory imports count for 50% of score
    // cross-layer violations count for additional 50%
    couplingScore = crossDirRatio * 50 + crossLayerRatio * 50;
    couplingScore = Math.round(couplingScore * 100);
  }

  return {
    totalImports,
    crossDirectoryImports,
    crossLayerImports,
    coupling: Math.min(100, couplingScore),
    details,
  };
}

/**
 * Define layer hierarchy and check if imports violate it
 *
 * Typical layer order (top to bottom):
 * pages/containers -> components -> services -> utils/helpers
 *
 * Violations:
 * - pages importing from utils (skip a layer) is OK
 * - services importing from components is a violation
 * - utils importing from pages is a violation
 */
interface LayerHierarchy {
  order: number;
  violatesHierarchy: boolean;
}

const LAYER_HIERARCHY: Record<string, number> = {
  pages: 0,
  containers: 0,
  components: 1,
  views: 0,
  routes: 0,
  controllers: 0,
  services: 2,
  hooks: 1,
  middleware: 2,
  models: 2,
  schemas: 3,
  utils: 3,
  helpers: 3,
  lib: 3,
  constants: 4,
  types: 4,
  interfaces: 4,
  config: 4,
};

function getLayerOrder(fromDir: string, toDir: string): LayerHierarchy | null {
  const fromLayer = Object.entries(LAYER_HIERARCHY).find(([name]) =>
    fromDir.includes(name)
  );
  const toLayer = Object.entries(LAYER_HIERARCHY).find(([name]) =>
    toDir.includes(name)
  );

  if (!fromLayer || !toLayer) {
    return null;
  }

  const fromOrder = fromLayer[1];
  const toOrder = toLayer[1];

  // Violation: lower layer importing from higher layer (e.g., services importing from components)
  return {
    order: Math.abs(fromOrder - toOrder),
    violatesHierarchy: fromOrder > toOrder,
  };
}

/**
 * Extract directory from file path
 */
function extractDirectory(filePath: string): string {
  const parts = filePath.split("/").filter(p => p && !p.startsWith("."));
  // Return first meaningful directory (skip src, lib, app roots)
  if (parts[0] === "src" || parts[0] === "lib" || parts[0] === "app") {
    return parts[1] || parts[0];
  }
  return parts[0] || "root";
}

/**
 * Analyze import patterns and detect problematic dependencies
 */
export function detectCouplingIssues(
  analysis: CouplingAnalysis,
  directories: Map<string, DirectoryAnalysis>
): Array<{ severity: 'critical' | 'warning'; message: string; from: string; to: string }> {
  const issues: Array<{ severity: 'critical' | 'warning'; message: string; from: string; to: string }> = [];

  // High cross-directory imports indicate tight coupling
  if (analysis.crossDirectoryImports > analysis.totalImports * 0.7) {
    issues.push({
      severity: "critical",
      message: "Very high cross-directory dependencies detected",
      from: "overall",
      to: "overall",
    });
  } else if (analysis.crossDirectoryImports > analysis.totalImports * 0.5) {
    issues.push({
      severity: "warning",
      message: "High cross-directory dependencies detected",
      from: "overall",
      to: "overall",
    });
  }

  // Detect circular dependencies and violations
  for (const detail of analysis.details) {
    if (detail.isLayerViolation) {
      issues.push({
        severity: "warning",
        message: `Layer violation: ${detail.from} depends on ${detail.to} (${detail.count} times)`,
        from: detail.from,
        to: detail.to,
      });
    }

    // Check for excessive coupling between specific directories
    if (detail.count > 10) {
      issues.push({
        severity: "warning",
        message: `Excessive coupling: ${detail.from} -> ${detail.to} (${detail.count} imports)`,
        from: detail.from,
        to: detail.to,
      });
    }
  }

  return issues;
}
