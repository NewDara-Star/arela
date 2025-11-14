/**
 * Reporter Module
 * Formats flow analysis results for beautiful CLI output
 */

import pc from 'picocolors';
import fs from 'fs-extra';
import { FlowAnalysisResult } from './analyzer.js';

/**
 * Display complete analysis report in CLI
 */
export function reportAnalysis(result: FlowAnalysisResult): void {
  // Header
  console.log(pc.bold(pc.cyan('\n📊 FLOW ANALYSIS REPORT\n')));
  console.log(pc.gray(`Flow: ${result.flowName}`));
  console.log(pc.gray(`Generated: ${new Date(result.timestamp).toLocaleString()}\n`));

  // Quality Scores Section
  reportScores(result.analysis.scores);

  // Overview Section
  reportOverview(result.analysis);

  // Violations Section (if any)
  if (result.standardViolations.length > 0) {
    reportViolations(result.standardViolations);
  }

  // Refactor Proposals Section
  if (result.refactorProposals.length > 0) {
    reportRefactorProposals(result.refactorProposals);
  }

  // Recommendations Section
  reportRecommendations(result.analysis.recommendations);

  // Entry Points Section
  reportEntryPoints(result.entryPoints);

  // Execution Paths Section
  if (result.executionPaths.length > 0) {
    reportExecutionPaths(result.executionPaths);
  }

  // Footer
  console.log(pc.gray('\n' + '='.repeat(80)));
  console.log(pc.bold(pc.green('✨ Analysis complete!\n')));
}

/**
 * Report quality scores with visual indicators
 */
function reportScores(scores: any): void {
  console.log(pc.bold('📈 Quality Scores\n'));

  const categories = ['security', 'ux', 'architecture', 'performance'];
  for (const category of categories) {
    const score = scores[category];
    const bar = getScoreBar(score);
    const label = category.padEnd(15);

    console.log(`  ${label} ${bar} ${score}/100`);
  }

  // Overall score with emoji
  const overallScore = scores.overall;
  const emoji = getScoreEmoji(overallScore);
  console.log(`\n  ${'OVERALL'.padEnd(15)} ${emoji} ${overallScore}/100\n`);
}

/**
 * Report analysis overview
 */
function reportOverview(analysis: any): void {
  console.log(pc.bold('📋 Overview\n'));

  const stats = [
    { label: 'Entry Points', value: analysis.totalEntryPoints, icon: '🚪' },
    { label: 'Execution Paths', value: analysis.totalPaths, icon: '🔀' },
    { label: 'Violations Found', value: analysis.totalViolations, icon: '⚠️' },
    { label: 'Avg Path Depth', value: analysis.averagePathDepth, icon: '📏' },
  ];

  for (const stat of stats) {
    console.log(`  ${stat.icon} ${stat.label.padEnd(20)} ${pc.bold(String(stat.value))}`);
  }

  console.log('');
}

/**
 * Report violations grouped by category
 */
function reportViolations(violations: any[]): void {
  console.log(pc.bold('⚠️  Violations\n'));

  // Group by category
  const byCategory = new Map<string, any[]>();
  for (const violation of violations) {
    if (!byCategory.has(violation.category)) {
      byCategory.set(violation.category, []);
    }
    byCategory.get(violation.category)!.push(violation);
  }

  for (const [category, categoryViolations] of byCategory) {
    const criticalCount = categoryViolations.filter(v => v.severity === 'critical').length;
    const warningCount = categoryViolations.filter(v => v.severity === 'warning').length;

    const icon =
      category === 'security'
        ? '🔐'
        : category === 'ux'
          ? '🎨'
          : category === 'architecture'
            ? '🏗️'
            : '⚡';

    console.log(
      `  ${icon} ${pc.bold(category.toUpperCase())} - ${criticalCount} critical, ${warningCount} warnings`
    );

    // Show top 3 violations for this category
    for (const violation of categoryViolations.slice(0, 3)) {
      const icon = violation.severity === 'critical' ? '🔴' : '🟡';
      console.log(`     ${icon} ${violation.standard}`);
      console.log(`        💡 ${violation.refactorProposal}`);
    }

    if (categoryViolations.length > 3) {
      console.log(`     ... and ${categoryViolations.length - 3} more\n`);
    } else {
      console.log('');
    }
  }
}

/**
 * Report refactor proposals
 */
function reportRefactorProposals(proposals: any[]): void {
  console.log(pc.bold('🔨 Refactor Proposals\n'));

  // Sort by priority
  const sorted = [...proposals].sort((a, b) => b.priority - a.priority);

  for (const proposal of sorted.slice(0, 5)) {
    const priorityColor = proposal.priority >= 8 ? pc.red : proposal.priority >= 5 ? pc.yellow : pc.green;
    const complexityIcon =
      proposal.complexity === 'simple'
        ? '🟢'
        : proposal.complexity === 'medium'
          ? '🟡'
          : '🔴';

    console.log(`  ${complexityIcon} ${pc.bold(proposal.title)}`);
    console.log(`     ${priorityColor(`Priority: ${proposal.priority}/10`)}`);
    console.log(`     Effort: ${proposal.estimatedEffort}`);

    if (proposal.description) {
      console.log(`     ${proposal.description}`);
    }

    // Show first 2 implementation steps
    for (const step of proposal.implementationSteps.slice(0, 2)) {
      console.log(`     → ${step}`);
    }

    console.log('');
  }

  if (proposals.length > 5) {
    console.log(`  ... and ${proposals.length - 5} more proposals\n`);
  }
}

/**
 * Report recommendations
 */
function reportRecommendations(recommendations: string[]): void {
  if (recommendations.length === 0) return;

  console.log(pc.bold('💡 Recommendations\n'));

  for (const rec of recommendations) {
    console.log(`  ${rec}`);
  }

  console.log('');
}

/**
 * Report entry points
 */
function reportEntryPoints(entryPoints: any[]): void {
  if (entryPoints.length === 0) return;

  console.log(pc.bold('🚪 Entry Points\n'));

  // Group by type
  const byType = new Map<string, any[]>();
  for (const ep of entryPoints) {
    if (!byType.has(ep.type)) {
      byType.set(ep.type, []);
    }
    byType.get(ep.type)!.push(ep);
  }

  for (const [type, eps] of byType) {
    const icon =
      type === 'api_route'
        ? '🔌'
        : type === 'event_handler'
          ? '📌'
          : type === 'component_export'
            ? '⚛️'
            : type === 'page_route'
              ? '📄'
              : type === 'hook'
                ? '🪝'
                : '⚙️';

    console.log(`  ${icon} ${pc.bold(type.replace(/_/g, ' ').toUpperCase())} (${eps.length})`);

    for (const ep of eps.slice(0, 3)) {
      console.log(`     ${ep.name}`);
    }

    if (eps.length > 3) {
      console.log(`     ... and ${eps.length - 3} more`);
    }

    console.log('');
  }
}

/**
 * Report execution paths
 */
function reportExecutionPaths(paths: any[]): void {
  console.log(pc.bold('🔀 Execution Paths\n'));

  // Show sample paths
  for (const path of paths.slice(0, 3)) {
    console.log(`  ${pc.bold(path.startPoint)} → ${pc.bold(path.endPoint)}`);
    console.log(`  Path length: ${path.depth} steps`);
    console.log(`  Async calls: ${path.hasAsyncCalls ? '✅ Yes' : '❌ No'}`);

    if (path.potentialIssues.length > 0) {
      console.log(`  Issues:`);
      for (const issue of path.potentialIssues) {
        console.log(`    ⚠️  ${issue}`);
      }
    }

    console.log('');
  }

  if (paths.length > 3) {
    console.log(`  ... and ${paths.length - 3} more execution paths\n`);
  }
}

/**
 * Get visual score bar
 */
function getScoreBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  if (score >= 80) {
    return pc.green(bar);
  } else if (score >= 60) {
    return pc.yellow(bar);
  } else {
    return pc.red(bar);
  }
}

/**
 * Get emoji for score
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '🎉';
  if (score >= 80) return '✨';
  if (score >= 70) return '👍';
  if (score >= 60) return '⚠️';
  if (score >= 50) return '😕';
  return '🚨';
}

/**
 * Display brief summary (one-liner per category)
 */
export function reportBriefSummary(result: FlowAnalysisResult): void {
  console.log(pc.bold(pc.cyan('\n🎯 Quick Analysis Summary\n')));

  const { scores, recommendations } = result.analysis;

  // Scores
  console.log(
    pc.bold('Scores: ') +
      `Security ${scores.security}/100 | ` +
      `UX ${scores.ux}/100 | ` +
      `Architecture ${scores.architecture}/100 | ` +
      `Performance ${scores.performance}/100\n`
  );

  // Top issue
  if (result.standardViolations.length > 0) {
    const topIssue = result.standardViolations[0];
    console.log(
      `Top Issue: ${topIssue.severity.toUpperCase()} - ${topIssue.standard} in ${topIssue.location}\n`
    );
  }

  // Top recommendation
  if (recommendations.length > 0) {
    console.log(`Recommendation: ${recommendations[0]}\n`);
  }

  console.log('Run with --verbose for detailed report\n');
}

/**
 * Export results to JSON file
 */
export function exportJSON(result: FlowAnalysisResult, filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(pc.green(`✅ Report exported to ${filePath}`));
}

/**
 * Export results to Markdown file
 */
export function exportMarkdown(markdown: string, filePath: string): void {
  fs.writeFileSync(filePath, markdown);
  console.log(pc.green(`✅ Markdown report exported to ${filePath}`));
}

/**
 * Display spinner-style progress message
 */
export function showProgress(message: string): void {
  console.log(pc.cyan(`⏳ ${message}`));
}

/**
 * Display success message
 */
export function showSuccess(message: string): void {
  console.log(pc.green(`✅ ${message}`));
}

/**
 * Display error message
 */
export function showError(message: string): void {
  console.log(pc.red(`❌ ${message}`));
}
