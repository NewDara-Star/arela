/**
 * Flow Analyzer Module
 * Main orchestration for flow analysis:
 * - Discovers entry points
 * - Traces execution paths
 * - Checks standards
 * - Generates refactor proposals
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { discoverEntryPoints, EntryPoint } from './discovery.js';
import { traceExecutionPaths, TraceNode } from './tracer.js';
import { checkStandards, StandardViolation } from './standards.js';

export interface AnalysisConfig {
  cwd: string;
  flowName: string;
  verbose?: boolean;
}

export interface RefactorProposal {
  id: string;
  title: string;
  description: string;
  affectedFiles: string[];
  complexity: 'simple' | 'medium' | 'complex';
  priority: number;
  estimatedEffort: string;
  impact: {
    performance?: string;
    security?: string;
    ux?: string;
    architecture?: string;
  };
  implementationSteps: string[];
}

export interface FlowAnalysisResult {
  flowName: string;
  timestamp: string;
  entryPoints: EntryPoint[];
  executionPaths: any[];
  standardViolations: StandardViolation[];
  refactorProposals: RefactorProposal[];
  analysis: {
    totalEntryPoints: number;
    totalPaths: number;
    totalViolations: number;
    averagePathDepth: number;
    scores: {
      security: number;
      ux: number;
      architecture: number;
      performance: number;
      overall: number;
    };
    recommendations: string[];
  };
}

/**
 * Analyze a code flow from entry points through the codebase
 */
export async function analyzeFlow(config: AnalysisConfig): Promise<FlowAnalysisResult> {
  const startTime = Date.now();

  // Step 1: Discover entry points
  const discoveryResult = await discoverEntryPoints(config.cwd);
  const entryPoints = discoveryResult.entryPoints;

  // Step 2: Trace execution paths
  const executionPaths = [];
  const allNodes: TraceNode[] = [];

  for (const entryPoint of entryPoints) {
    try {
      const traceResult = await traceExecutionPaths(config.cwd, entryPoint.name);
      executionPaths.push(...traceResult.executionPaths);
      allNodes.push(...traceResult.nodes);
    } catch (error) {
      if (config.verbose) {
        console.error(`Failed to trace ${entryPoint.name}:`, error);
      }
    }
  }

  // Step 3: Check standards across all files
  const standardViolations: StandardViolation[] = [];
  const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: config.cwd,
    ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
  });

  for (const file of allFiles) {
    const filePath = path.join(config.cwd, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = checkStandards(content, file);
      standardViolations.push(...result.violations);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Step 4: Calculate scores
  const scores = calculateScores(standardViolations);

  // Step 5: Generate refactor proposals
  const refactorProposals = generateRefactorProposals(
    entryPoints,
    executionPaths,
    standardViolations,
    allFiles
  );

  // Step 6: Generate recommendations
  const recommendations = generateRecommendations(
    standardViolations,
    refactorProposals,
    scores
  );

  // Step 7: Calculate average path depth
  const avgPathDepth =
    executionPaths.length > 0
      ? executionPaths.reduce((sum, p) => sum + p.depth, 0) / executionPaths.length
      : 0;

  return {
    flowName: config.flowName,
    timestamp: new Date().toISOString(),
    entryPoints,
    executionPaths,
    standardViolations,
    refactorProposals,
    analysis: {
      totalEntryPoints: entryPoints.length,
      totalPaths: executionPaths.length,
      totalViolations: standardViolations.length,
      averagePathDepth: Math.round(avgPathDepth * 10) / 10,
      scores,
      recommendations,
    },
  };
}

/**
 * Calculate quality scores based on standard violations
 */
function calculateScores(violations: StandardViolation[]): any {
  const categories = ['security', 'ux', 'architecture', 'performance'];
  const scores: Record<string, number> = {};

  for (const category of categories) {
    const categoryViolations = violations.filter(v => v.category === category);
    const criticalCount = categoryViolations.filter(v => v.severity === 'critical').length;
    const warningCount = categoryViolations.filter(v => v.severity === 'warning').length;

    // Calculate score: 100 - (critical * 20 + warning * 5)
    let score = 100 - (criticalCount * 20 + warningCount * 5);
    score = Math.max(0, Math.min(100, score));

    scores[category] = score;
  }

  scores.overall = Math.round(
    (scores.security + scores.ux + scores.architecture + scores.performance) / 4
  );

  return scores;
}

/**
 * Generate actionable refactor proposals
 */
function generateRefactorProposals(
  entryPoints: EntryPoint[],
  executionPaths: any[],
  violations: StandardViolation[],
  files: string[]
): RefactorProposal[] {
  const proposals: RefactorProposal[] = [];
  let proposalId = 1;

  // Group violations by affected files
  const violationsByFile = new Map<string, StandardViolation[]>();
  for (const violation of violations) {
    if (!violationsByFile.has(violation.location)) {
      violationsByFile.set(violation.location, []);
    }
    violationsByFile.get(violation.location)!.push(violation);
  }

  // Create proposals for groups of violations
  for (const [filePath, fileViolations] of violationsByFile) {
    const criticalViolations = fileViolations.filter((v: StandardViolation) => v.severity === 'critical');
    const warningViolations = fileViolations.filter((v: StandardViolation) => v.severity === 'warning');

    // Security refactor proposal
    if (criticalViolations.length > 0) {
      const securityViolations = criticalViolations.filter((v: StandardViolation) => v.category === 'security');
      if (securityViolations.length > 0) {
        proposals.push({
          id: `refactor_sec_${proposalId++}`,
          title: `Security Hardening: ${path.basename(filePath)}`,
          description: `Address ${securityViolations.length} security vulnerabilities`,
          affectedFiles: [filePath],
          complexity: 'medium',
          priority: 10,
          estimatedEffort: '2-4 hours',
          impact: {
            security: `Fix ${securityViolations.length} critical issues`,
          },
          implementationSteps: securityViolations.map((v: StandardViolation) => v.refactorProposal),
        });
      }
    }

    // Architecture refactor proposal
    const archViolations = fileViolations.filter((v: StandardViolation) => v.category === 'architecture');
    if (archViolations.length >= 2) {
      proposals.push({
        id: `refactor_arch_${proposalId++}`,
        title: `Architecture Improvement: ${path.basename(filePath)}`,
        description: `Improve module structure and dependencies`,
        affectedFiles: [filePath],
        complexity: 'complex',
        priority: 7,
        estimatedEffort: '4-8 hours',
        impact: {
          architecture: 'Better modularity and testability',
          performance: 'Reduced coupling',
        },
        implementationSteps: archViolations.map((v: StandardViolation) => v.refactorProposal),
      });
    }

    // Performance optimization proposal
    const perfViolations = fileViolations.filter((v: StandardViolation) => v.category === 'performance');
    if (perfViolations.length >= 1) {
      proposals.push({
        id: `refactor_perf_${proposalId++}`,
        title: `Performance Optimization: ${path.basename(filePath)}`,
        description: `Optimize runtime performance`,
        affectedFiles: [filePath],
        complexity: 'simple',
        priority: 6,
        estimatedEffort: '1-2 hours',
        impact: {
          performance: 'Improved load times and responsiveness',
        },
        implementationSteps: perfViolations.map((v: StandardViolation) => v.refactorProposal),
      });
    }
  }

  // Generate holistic proposals based on execution paths
  if (executionPaths.length > 5) {
    proposals.push({
      id: `refactor_flow_${proposalId++}`,
      title: 'Simplify Execution Flow',
      description: `Reduce complexity from ${executionPaths.length} execution paths to fewer, clearer flows`,
      affectedFiles: Array.from(new Set(executionPaths.flatMap(p => p.path))),
      complexity: 'complex',
      priority: 8,
      estimatedEffort: '8-16 hours',
      impact: {
        architecture: 'Simpler, more maintainable code flow',
        performance: 'Reduced cognitive load',
      },
      implementationSteps: [
        'Map out critical vs. optional execution paths',
        'Extract common patterns into reusable functions',
        'Consider using a state machine for complex flows',
        'Add comprehensive logging for debugging',
      ],
    });
  }

  // Entry point consolidation
  if (entryPoints.length > 10) {
    proposals.push({
      id: `refactor_ep_${proposalId++}`,
      title: 'Consolidate Entry Points',
      description: `Consolidate ${entryPoints.length} entry points into unified interfaces`,
      affectedFiles: entryPoints.map(ep => ep.path),
      complexity: 'medium',
      priority: 5,
      estimatedEffort: '4-6 hours',
      impact: {
        architecture: 'Unified API surface',
      },
      implementationSteps: [
        'Identify entry point patterns',
        'Create routing/dispatch layer',
        'Consolidate handler signatures',
        'Update call sites',
      ],
    });
  }

  return proposals.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate high-level recommendations
 */
function generateRecommendations(
  violations: StandardViolation[],
  proposals: RefactorProposal[],
  scores: any
): string[] {
  const recommendations: string[] = [];

  // Security recommendations
  if (scores.security < 70) {
    recommendations.push(
      '🔐 Security audit needed: Add input validation, secrets management, and error handling'
    );
  }

  // Architecture recommendations
  if (scores.architecture < 70) {
    recommendations.push(
      '🏗️  Refactor for better architecture: Reduce coupling, improve modularity, and add types'
    );
  }

  // Performance recommendations
  if (scores.performance < 70) {
    recommendations.push(
      '⚡ Performance optimizations available: Add memoization, lazy loading, and debouncing'
    );
  }

  // UX recommendations
  if (scores.ux < 70) {
    recommendations.push(
      '🎨 Improve user experience: Add loading states, error messages, and accessibility'
    );
  }

  // Overall quality
  if (scores.overall < 60) {
    recommendations.push(
      '⚠️  Overall code quality is below target. Start with highest priority refactoring proposals.'
    );
  } else if (scores.overall >= 80) {
    recommendations.push(
      '✨ Good code quality! Focus on top-priority proposals for continuous improvement.'
    );
  }

  // Based on violations
  if (violations.length > 20) {
    recommendations.push(
      '📋 High number of violations detected. Consider systematic refactoring approach.'
    );
  }

  // Based on proposals
  if (proposals.filter(p => p.priority >= 8).length > 0) {
    recommendations.push(
      '🎯 Critical improvements available. Prioritize high-impact refactoring proposals.'
    );
  }

  return recommendations;
}

/**
 * Export analysis result as JSON for further processing
 */
export function exportAnalysis(result: FlowAnalysisResult, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
}

/**
 * Generate a markdown report
 */
export function generateMarkdownReport(result: FlowAnalysisResult): string {
  let report = `# Flow Analysis Report: ${result.flowName}\n\n`;
  report += `**Generated**: ${new Date(result.timestamp).toLocaleString()}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Overall Score | ${result.analysis.scores.overall}/100 |\n`;
  report += `| Security | ${result.analysis.scores.security}/100 |\n`;
  report += `| UX | ${result.analysis.scores.ux}/100 |\n`;
  report += `| Architecture | ${result.analysis.scores.architecture}/100 |\n`;
  report += `| Performance | ${result.analysis.scores.performance}/100 |\n`;
  report += `| Entry Points | ${result.analysis.totalEntryPoints} |\n`;
  report += `| Execution Paths | ${result.analysis.totalPaths} |\n`;
  report += `| Violations Found | ${result.analysis.totalViolations} |\n\n`;

  // Recommendations
  report += `## Recommendations\n\n`;
  for (const rec of result.analysis.recommendations) {
    report += `- ${rec}\n`;
  }
  report += `\n`;

  // Top Violations
  report += `## Top Violations\n\n`;
  const topViolations = result.standardViolations.slice(0, 10);
  for (const violation of topViolations) {
    report += `### ${violation.standard} (${violation.severity})\n`;
    report += `- **File**: ${violation.location}\n`;
    report += `- **Description**: ${violation.description}\n`;
    report += `- **Fix**: ${violation.refactorProposal}\n\n`;
  }

  // Refactor Proposals
  report += `## Refactor Proposals\n\n`;
  for (const proposal of result.refactorProposals.slice(0, 5)) {
    report += `### ${proposal.title}\n`;
    report += `- **Complexity**: ${proposal.complexity}\n`;
    report += `- **Estimated Effort**: ${proposal.estimatedEffort}\n`;
    report += `- **Priority**: ${proposal.priority}/10\n`;
    report += `- **Steps**:\n`;
    for (const step of proposal.implementationSteps.slice(0, 3)) {
      report += `  1. ${step}\n`;
    }
    report += `\n`;
  }

  return report;
}
