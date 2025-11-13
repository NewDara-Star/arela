/**
 * Format and report contract generation results
 */
import pc from 'picocolors';
import { ContractReport, SliceGroup, DriftIssue } from './types';

/**
 * Display contract generation report
 */
export function displayContractReport(report: ContractReport): void {
  console.log(pc.bold(pc.cyan('\n🔍 API Contract Analysis Results\n')));

  // Summary statistics
  displaySummary(report);

  // Matched endpoints
  displayMatches(report);

  // Drift issues
  displayDrift(report);

  // Slice details
  if (report.slices.length > 0) {
    displaySlices(report.slices);
  }

  // Footer
  displayFooter(report);
}

/**
 * Display summary statistics
 */
function displaySummary(report: ContractReport): void {
  console.log(pc.gray('Summary:'));
  console.log(
    pc.cyan(`  📊 Backend Endpoints: ${report.totalEndpoints}`)
  );
  console.log(
    pc.cyan(`  📊 Frontend API Calls: ${report.totalCalls}`)
  );
  console.log(
    pc.green(`  ✅ Matched: ${report.matchedCount} (${calculatePercentage(report.matchedCount, report.totalEndpoints)}%)`)
  );

  if (report.unmatchedCalls.length > 0) {
    console.log(
      pc.yellow(`  ⚠️  Unmatched Calls: ${report.unmatchedCalls.length}`)
    );
  }

  if (report.unmatchedEndpoints.length > 0) {
    console.log(
      pc.yellow(`  ⚠️  Unmatched Endpoints: ${report.unmatchedEndpoints.length}`)
    );
  }

  console.log('');
}

/**
 * Display matched endpoints
 */
function displayMatches(report: ContractReport): void {
  if (report.matchedCount === 0) {
    console.log(pc.yellow('❌ No matched endpoints found\n'));
    return;
  }

  console.log(pc.bold(`✅ Matched Endpoints (${report.matchedCount}):`));

  // Show first 10 matches
  const matchCount = Math.min(10, report.matchedCount);

  // Reconstruct matches from slices for display
  let displayedCount = 0;
  for (const slice of report.slices) {
    for (const match of slice.matches) {
      if (displayedCount < matchCount) {
        const method = match.endpoint.method.padEnd(6);
        const path = match.endpoint.path;
        const calls = match.calls.length;
        console.log(
          `   ${pc.cyan(method)} ${path} ${pc.gray(`(${calls} call${calls !== 1 ? 's' : ''})`)}`
        );
        displayedCount++;
      }
    }
  }

  if (report.matchedCount > matchCount) {
    console.log(pc.gray(`   ... and ${report.matchedCount - matchCount} more`));
  }

  console.log('');
}

/**
 * Display drift issues
 */
function displayDrift(report: ContractReport): void {
  if (report.driftIssues.length === 0) {
    console.log(pc.green('✅ No drift issues detected!\n'));
    return;
  }

  console.log(pc.bold(pc.red(`❌ Schema Drift Detected (${report.driftIssues.length}):`)));

  // Group by severity
  const bySeverity = groupDriftBySeverity(report.driftIssues);

  // Display critical issues
  if (bySeverity.critical.length > 0) {
    console.log(pc.red(`\n  🔴 Critical (${bySeverity.critical.length}):`));
    for (const issue of bySeverity.critical.slice(0, 3)) {
      console.log(`    ${issue.message}`);
      if (issue.suggestion) {
        console.log(pc.gray(`    💡 ${issue.suggestion}`));
      }
    }
    if (bySeverity.critical.length > 3) {
      console.log(pc.gray(`    ... and ${bySeverity.critical.length - 3} more`));
    }
  }

  // Display high severity issues
  if (bySeverity.high.length > 0) {
    console.log(pc.yellow(`\n  🟠 High (${bySeverity.high.length}):`));
    for (const issue of bySeverity.high.slice(0, 3)) {
      console.log(`    ${issue.message}`);
      if (issue.suggestion) {
        console.log(pc.gray(`    💡 ${issue.suggestion}`));
      }
    }
    if (bySeverity.high.length > 3) {
      console.log(pc.gray(`    ... and ${bySeverity.high.length - 3} more`));
    }
  }

  // Display medium severity issues
  if (bySeverity.medium.length > 0) {
    console.log(pc.blue(`\n  🟡 Medium (${bySeverity.medium.length}):`));
    for (const issue of bySeverity.medium.slice(0, 2)) {
      console.log(`    ${issue.message}`);
      if (issue.suggestion) {
        console.log(pc.gray(`    💡 ${issue.suggestion}`));
      }
    }
    if (bySeverity.medium.length > 2) {
      console.log(pc.gray(`    ... and ${bySeverity.medium.length - 2} more`));
    }
  }

  console.log('');
}

/**
 * Display slice details
 */
function displaySlices(slices: SliceGroup[]): void {
  console.log(pc.bold(`📦 Contracts Per Slice (${slices.length}):`));

  for (const slice of slices) {
    const endpointCount = slice.endpoints.length;
    const matchCount = slice.matches.length;
    const driftCount = slice.drift.length;

    let icon = '✅';
    if (driftCount > 0) {
      icon = pc.red('❌');
    } else if (matchCount === 0) {
      icon = pc.yellow('⚠️ ');
    }

    console.log(
      `   ${icon} ${slice.name.padEnd(15)} ${endpointCount} endpoints, ${matchCount} matched, ${driftCount} drift issues`
    );
  }

  console.log('');
}

/**
 * Display footer with next steps
 */
function displayFooter(report: ContractReport): void {
  console.log(pc.bold('📋 Next Steps:'));

  if (report.driftIssues.length > 0) {
    console.log(pc.yellow('  1. Fix schema drift issues'));
    console.log(pc.gray(`     - ${report.driftIssues.length} issue${report.driftIssues.length !== 1 ? 's' : ''} to resolve`));
  }

  console.log(pc.cyan('  2. Review generated OpenAPI specs'));
  console.log(pc.gray(`     - ${report.specs.length} spec${report.specs.length !== 1 ? 's' : ''} generated`));

  console.log(pc.cyan('  3. Set up contract testing'));
  console.log(pc.gray('     - Use Dredd or Prism for validation'));

  console.log(pc.cyan('  4. Generate documentation'));
  console.log(pc.gray('     - Use Swagger UI with generated specs'));

  console.log(
    pc.gray(`\n⏱️  Analysis completed in ${report.duration}ms\n`)
  );
}

/**
 * Group drift issues by severity
 */
function groupDriftBySeverity(
  issues: DriftIssue[]
): { critical: DriftIssue[]; high: DriftIssue[]; medium: DriftIssue[]; low: DriftIssue[] } {
  return {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };
}

/**
 * Calculate percentage
 */
function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Export results as JSON
 */
export function reportToJson(report: ContractReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export results as CSV
 */
export function reportToCsv(report: ContractReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Slice,Endpoints,Calls,Matched,Drift');

  // Slice data
  for (const slice of report.slices) {
    lines.push(
      `${slice.name},${slice.endpoints.length},${slice.calls.length},${slice.matches.length},${slice.drift.length}`
    );
  }

  // Total
  lines.push(
    `TOTAL,${report.totalEndpoints},${report.totalCalls},${report.matchedCount},${report.driftIssues.length}`
  );

  return lines.join('\n');
}

/**
 * Create summary statistics
 */
export function getSummaryStats(report: ContractReport) {
  return {
    title: 'API Contract Generation Summary',
    timestamp: report.generatedAt,
    duration: `${report.duration}ms`,
    stats: {
      totalEndpoints: report.totalEndpoints,
      totalCalls: report.totalCalls,
      matchedPercentage: `${calculatePercentage(report.matchedCount, report.totalEndpoints)}%`,
      driftIssuesCount: report.driftIssues.length,
      sliceCount: report.slices.length,
      specCount: report.specs.length,
    },
  };
}
