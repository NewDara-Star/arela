/**
 * Main Architecture Analyzer
 * Detects horizontal vs vertical architecture and generates recommendations
 */

import path from "path";
import fs from "fs-extra";
import { GraphDB } from "../ingest/storage.js";
import {
  ArchitectureReport,
  ArchitectureType,
  ArchitectureScore,
  RepoAnalysis,
  AnalyzeOptions,
  CouplingCohesionScores,
  ArchitectureIssue,
  DirectoryAnalysis,
} from "./types.js";
import {
  analyzeDirectoryStructure,
  classifyArchitecture,
  getTopLevelDirs,
} from "./patterns.js";
import { calculateCoupling, detectCouplingIssues } from "./coupling.js";
import { calculateCohesion, detectCohesionIssues } from "./cohesion.js";
import {
  analyzeRepoRelationships,
  matchApiCalls,
  calculateApiDriftPercentage,
} from "./multi-repo.js";

export interface ArchitectureAnalysisInput {
  paths: string[];
  options?: AnalyzeOptions;
}

/**
 * Main function to analyze architecture across repositories
 */
export async function analyzeArchitecture(
  paths: string[],
  options?: AnalyzeOptions
): Promise<ArchitectureReport> {
  const startTime = Date.now();
  const repositories: RepoAnalysis[] = [];
  const allIssues: ArchitectureIssue[] = [];

  // Analyze each repository
  for (const repoPath of paths) {
    // Try multiple database locations
    let dbPath = path.join(repoPath, ".arela", "memory", "graph.db");
    if (!fs.existsSync(dbPath)) {
      dbPath = path.join(repoPath, ".arela", "graph.db");
    }

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `No RAG index found at ${repoPath}. Run 'arela ingest codebase' or 'arela index' first.`
      );
    }

    const db = new GraphDB(dbPath);
    const repoAnalysis = analyzeRepository(db, repoPath);
    repositories.push(repoAnalysis);
    allIssues.push(...repoAnalysis.issues);
  }

  // Determine overall architecture
  const overallArchitecture = determineOverallArchitecture(repositories);
  const overallScores = calculateOverallScores(repositories);
  const globalMetrics = calculateGlobalMetrics(repositories);

  // Generate recommendations
  const recommendations = generateRecommendations(
    overallArchitecture,
    globalMetrics,
    repositories
  );

  // Calculate effort estimates
  const effort = estimateEffort(globalMetrics, repositories.length);

  const report: ArchitectureReport = {
    timestamp: new Date().toISOString(),
    repositories,
    overallArchitecture,
    overallScores,
    globalMetrics,
    issues: allIssues,
    apiDrift: [],
    recommendations,
    effort,
  };

  return report;
}

/**
 * Analyze a single repository
 */
function analyzeRepository(db: GraphDB, repoPath: string): RepoAnalysis {
  const repoName = path.basename(repoPath);

  // Get all files from the database
  const files = db.getAllFiles();
  const imports = db.getAllImports();

  // Analyze directory structure
  const directories = analyzeDirectoryStructure(
    files.map(f => ({ path: f.path, type: f.type }))
  );

  // Classify architecture
  const { type: architectureType, score: architectureScore } =
    classifyArchitecture(directories);

  // Calculate coupling and cohesion
  const importMap = imports.map(imp => ({
    from: imp.from_module || imp.from_file?.path || "unknown",
    to: imp.to_module || imp.to_file?.path || "unknown",
    fromDir: extractDir(imp.from_file?.path || ""),
    toDir: extractDir(imp.to_file?.path || ""),
  }));

  const couplingAnalysis = calculateCoupling(importMap, directories);
  const cohesionAnalysis = calculateCohesion(importMap, directories);

  // Detect issues
  const couplingIssues = detectCouplingIssues(couplingAnalysis, directories);
  const cohesionIssues = detectCohesionIssues(cohesionAnalysis, directories);

  const allIssues: ArchitectureIssue[] = [
    ...couplingIssues.map(issue => ({
      severity: issue.severity,
      title: `Coupling: ${issue.message}`,
      description: issue.message,
      recommendation: getCouplingSuggestion(issue.severity),
    })),
    ...cohesionIssues.map(issue => ({
      severity: issue.severity,
      title: `Cohesion: ${issue.message}`,
      description: issue.message,
      affectedDirs: [issue.directory],
      recommendation: getCohesionSuggestion(issue.severity),
    })),
  ];

  // Add feature-specific issues
  if (architectureType === "horizontal") {
    allIssues.push({
      severity: "warning",
      title: "Horizontal Architecture Detected",
      description:
        "This repository uses a layer-based (horizontal) architecture. Consider migrating to vertical slice architecture for better scalability.",
      recommendation:
        "Review Feature 6.2 (Slice Detection) to identify optimal slice boundaries",
    });
  }

  const scores: ArchitectureScore = {
    horizontal: architectureType === "horizontal" ? architectureScore : 100 - architectureScore,
    vertical: architectureType === "vertical" ? architectureScore : 100 - architectureScore,
  };

  const metrics: CouplingCohesionScores = {
    coupling: couplingAnalysis.coupling,
    cohesion: cohesionAnalysis.cohesion,
  };

  return {
    name: repoName,
    path: repoPath,
    architecture: architectureType,
    scores,
    metrics,
    directories: Array.from(directories.values()),
    issues: allIssues,
  };
}

/**
 * Extract directory name from file path
 */
function extractDir(filePath: string): string {
  if (!filePath) return "root";
  const parts = filePath.split("/").filter(p => p && !p.startsWith("."));
  if (parts[0] === "src" || parts[0] === "lib" || parts[0] === "app") {
    return parts[1] || parts[0];
  }
  return parts[0] || "root";
}

/**
 * Determine overall architecture type from repositories
 */
function determineOverallArchitecture(repos: RepoAnalysis[]): ArchitectureType {
  let horizontalCount = 0;
  let verticalCount = 0;
  let hybridCount = 0;

  for (const repo of repos) {
    if (repo.architecture === "horizontal") horizontalCount++;
    else if (repo.architecture === "vertical") verticalCount++;
    else hybridCount++;
  }

  if (horizontalCount > verticalCount) {
    return "horizontal";
  } else if (verticalCount > horizontalCount) {
    return "vertical";
  } else {
    return "hybrid";
  }
}

/**
 * Calculate overall scores
 */
function calculateOverallScores(repos: RepoAnalysis[]): ArchitectureScore {
  let totalHorizontal = 0;
  let totalVertical = 0;

  for (const repo of repos) {
    totalHorizontal += repo.scores.horizontal;
    totalVertical += repo.scores.vertical;
  }

  const avgHorizontal = repos.length > 0 ? Math.round(totalHorizontal / repos.length) : 50;
  const avgVertical = repos.length > 0 ? Math.round(totalVertical / repos.length) : 50;

  return {
    horizontal: avgHorizontal,
    vertical: avgVertical,
  };
}

/**
 * Calculate global metrics
 */
function calculateGlobalMetrics(repos: RepoAnalysis[]): CouplingCohesionScores {
  let totalCoupling = 0;
  let totalCohesion = 0;

  for (const repo of repos) {
    totalCoupling += repo.metrics.coupling;
    totalCohesion += repo.metrics.cohesion;
  }

  return {
    coupling: repos.length > 0 ? Math.round(totalCoupling / repos.length) : 50,
    cohesion: repos.length > 0 ? Math.round(totalCohesion / repos.length) : 50,
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  architecture: ArchitectureType,
  metrics: CouplingCohesionScores,
  repos: RepoAnalysis[]
): string[] {
  const recommendations: string[] = [];

  // Architecture-based recommendations
  if (architecture === "horizontal") {
    recommendations.push("🎯 Migrate to Vertical Slice Architecture (VSA)");
    recommendations.push(
      "📊 High coupling and low cohesion indicate layer separation issues"
    );
    recommendations.push(
      "🔄 Consider feature-based organization to improve maintainability"
    );
  } else if (architecture === "vertical") {
    recommendations.push("✅ Good vertical architecture detected");
    if (metrics.coupling > 60) {
      recommendations.push(
        "⚠️  Even with vertical architecture, coupling is high - review cross-slice dependencies"
      );
    }
  }

  // Coupling-based recommendations
  if (metrics.coupling > 80) {
    recommendations.push(
      "🚨 Critical coupling detected - immediate refactoring recommended"
    );
  } else if (metrics.coupling > 60) {
    recommendations.push(
      "⚠️  High coupling - consider breaking down tightly coupled modules"
    );
  }

  // Cohesion-based recommendations
  if (metrics.cohesion < 30) {
    recommendations.push(
      "💔 Low cohesion - files within modules/features are scattered"
    );
    recommendations.push(
      "🗂️  Reorganize related files to improve feature grouping"
    );
  } else if (metrics.cohesion < 50) {
    recommendations.push(
      "📋 Fair cohesion - consider improving feature organization"
    );
  }

  // Multi-repo specific
  if (repos.length > 1) {
    recommendations.push("🔗 Run 'arela detect slices' for detailed slice analysis");
  }

  // Next steps
  recommendations.push("📈 Next: Run 'arela detect slices' to identify optimal slices");

  return recommendations;
}

/**
 * Estimate effort for VSA migration
 */
function estimateEffort(
  metrics: CouplingCohesionScores,
  repoCount: number
): { estimated: string; breakeven: string; roi3Year: number } {
  // Effort estimation based on coupling and cohesion
  const complexity = metrics.coupling + (100 - metrics.cohesion);
  const baseWeeks = 4;
  const complexityFactor = complexity / 100;
  const estimatedWeeks = Math.round(baseWeeks * (1 + complexityFactor * 2));

  // Multi-repo adds complexity
  const adjustedWeeks = Math.round(estimatedWeeks * (1 + (repoCount - 1) * 0.3));

  // Breakeven estimation
  const monthsPerWeek = 0.25;
  const breakEvenMonths = Math.round(adjustedWeeks * monthsPerWeek * 2);

  // 3-year ROI (rough estimate)
  const roi3Year = Math.round((36 / breakEvenMonths) * 100);

  return {
    estimated: `${Math.max(2, adjustedWeeks - 2)}-${adjustedWeeks + 2} weeks`,
    breakeven: `${breakEvenMonths}-${breakEvenMonths + 2} months`,
    roi3Year: Math.min(500, Math.max(100, roi3Year)),
  };
}

/**
 * Get coupling issue suggestion
 */
function getCouplingSuggestion(
  severity: "critical" | "warning"
): string {
  if (severity === "critical") {
    return "Immediate refactoring required - break down tightly coupled modules";
  } else {
    return "Consider architectural improvements - reduce cross-module dependencies";
  }
}

/**
 * Get cohesion issue suggestion
 */
function getCohesionSuggestion(
  severity: "critical" | "warning"
): string {
  if (severity === "critical") {
    return "Reorganize files - related code should be co-located in features/modules";
  } else {
    return "Improve module organization - group related functionality together";
  }
}
