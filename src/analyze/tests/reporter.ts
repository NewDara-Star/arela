/**
 * Reporter for the Test Strategy Optimizer
 */

import path from "path";
import fs from "fs-extra";
import pc from "picocolors";
import { TestStrategyReport } from "./types.js";

/**
 * Pretty-print the analysis to stdout
 */
export function reportTestStrategy(report: TestStrategyReport, verbose = false): void {
  console.log(pc.bold(pc.cyan("\n🧪 Analyzing test strategy...\n")));

  const stats = report.stats;
  console.log(pc.bold("📊 Test Statistics:"));
  console.log(pc.gray(`   - Total tests: ${stats.totalTests}`));
  console.log(
    pc.gray(
      `   - Unit tests: ${stats.unitTests} (${formatPercent(stats.unitTests, stats.totalTests)})`
    )
  );
  console.log(
    pc.gray(
      `   - Integration tests: ${stats.integrationTests} (${formatPercent(stats.integrationTests, stats.totalTests)})`
    )
  );
  console.log(pc.gray(`   - Test files: ${stats.testFiles}`));
  console.log(
    pc.gray(
      `   - Average test time: ${stats.averageTestTimeSeconds.toFixed(1)}s (est. suite time ${stats.estimatedSuiteDurationSeconds.toFixed(1)}s)`
    )
  );
  console.log("");

  if (report.coverage.graphDbAvailable) {
    console.log(pc.bold("🛰️  API Coverage:"));
    console.log(
      pc.gray(
        `   - Endpoints tested: ${report.coverage.endpoints.tested}/${report.coverage.endpoints.total} (${report.coverage.endpoints.percentage.toFixed(0)}%)`
      )
    );
    if (report.coverage.missingSlices.length > 0) {
      console.log(pc.gray(`   - Missing slice coverage: ${report.coverage.missingSlices.join(", ")}`));
    }
    if (verbose && report.coverage.endpoints.untested.length > 0) {
      console.log(pc.gray("   - Untested endpoints:"));
      report.coverage.endpoints.untested.slice(0, 5).forEach(endpoint => {
        console.log(pc.dim(`       ${endpoint.method} ${endpoint.path}`));
      });
      if (report.coverage.endpoints.untested.length > 5) {
        console.log(pc.dim("       ..."));
      }
    }
    console.log("");
  } else {
    console.log(pc.bold("🛰️  API Coverage:"));
    console.log(pc.yellow("   - Graph DB missing. Run `arela ingest codebase` for endpoint coverage.\n"));
  }

  const criticalIssues = report.issues.filter(issue => issue.severity === "critical");
  const warnings = report.issues.filter(issue => issue.severity === "warning");

  if (criticalIssues.length > 0 || warnings.length > 0) {
    console.log(pc.bold("❌ Issues Found:\n"));
  }

  if (criticalIssues.length > 0) {
    console.log(pc.red(`🔴 Critical (${criticalIssues.length}):`));
    criticalIssues.slice(0, 3).forEach((issue, idx) => {
      console.log(pc.red(`   ${idx + 1}. ${issue.title}`));
      if (verbose) {
        console.log(pc.gray(`      ${issue.description}`));
      }
    });
    if (criticalIssues.length > 3) {
      console.log(pc.red(`   ...and ${criticalIssues.length - 3} more critical issues`));
    }
    console.log("");
  }

  if (warnings.length > 0) {
    console.log(pc.yellow(`🟡 Warnings (${warnings.length}):`));
    warnings.slice(0, 5).forEach((issue, idx) => {
      console.log(pc.yellow(`   ${idx + 1}. ${issue.title}`));
      if (verbose) {
        console.log(pc.gray(`      ${issue.description}`));
      }
    });
    if (warnings.length > 5) {
      console.log(pc.yellow(`   ...and ${warnings.length - 5} more warnings`));
    }
    console.log("");
  }

  if (report.recommendations.length > 0) {
    console.log(pc.bold("💡 Recommendations:\n"));
    report.recommendations.forEach((rec, index) => {
      const icon = rec.title.toLowerCase().includes("testcontainers")
        ? "🐳"
        : rec.title.toLowerCase().includes("slice")
        ? "📦"
        : rec.title.toLowerCase().includes("contract")
        ? "📝"
        : "⚡";
      console.log(pc.cyan(`${index + 1}. ${icon} ${rec.title}`));
      console.log(pc.gray(`      ${rec.description}`));
      if (rec.impact) {
        console.log(pc.gray(`      Impact: ${rec.impact}`));
      }
      if (verbose && rec.actionItems.length > 0) {
        rec.actionItems.slice(0, 3).forEach(item => console.log(pc.dim(`        - ${item}`)));
      }
      console.log("");
    });
  }

  if (verbose) {
    printVerboseDetails(report);
  }

  console.log(pc.bold("📋 Next Step:"));
  console.log(pc.cyan("   $ arela generate testcontainers\n"));
}

/**
 * Export JSON report
 */
export function exportTestStrategyJson(report: TestStrategyReport, filePath: string): void {
  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  fs.writeJsonSync(filePath, report, { spaces: 2 });
  console.log(pc.gray(`\n📄 Test analysis exported to ${filePath}`));
}

/**
 * Persist default report to .arela/test-analysis.json
 */
export function writeDefaultTestReport(report: TestStrategyReport): void {
  const outputPath = path.join(report.baseDir, ".arela", "test-analysis.json");
  fs.ensureDirSync(path.dirname(outputPath));
  fs.writeJsonSync(outputPath, report, { spaces: 2 });
}

function printVerboseDetails(report: TestStrategyReport): void {
  console.log(pc.bold("🔬 Details:\n"));

  if (report.mockUsage.dominantPatterns.length > 0) {
    console.log(pc.gray("   Mock patterns:"));
    report.mockUsage.dominantPatterns.forEach(pattern => {
      console.log(pc.dim(`     - ${pattern.name}: ${pattern.count}`));
    });
  }

  if (report.slowTests.length > 0) {
    console.log(pc.gray("   Slow tests:"));
    report.slowTests.slice(0, 5).forEach(test => {
      console.log(
        pc.dim(
          `     - ${test.file}:${test.line ?? "?"} (${test.reason}, ~${test.estimatedDurationSeconds.toFixed(
            1
          )}s)`
        )
      );
    });
  }

  if (report.coverage.endpoints.untested.length > 0) {
    console.log(pc.gray("   Untested endpoints:"));
    report.coverage.endpoints.untested.slice(0, 10).forEach(endpoint => {
      console.log(pc.dim(`     - ${endpoint.method} ${endpoint.path}`));
    });
  }

  console.log("");
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
