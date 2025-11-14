/**
 * Format and display slice detection results
 */

import pc from "picocolors";
import type { Slice, SliceReport } from "./types.js";

/**
 * Format the slice report for terminal display
 */
export function formatReport(report: SliceReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(pc.bold(pc.cyan("🔍 Autonomous Slice Detection")));
  lines.push("");

  // Summary statistics
  lines.push(pc.gray(`📊 Analyzed ${report.totalFiles} files across ${report.totalImports} imports`));
  lines.push("");

  // Detected slices
  lines.push(pc.bold(`✨ Detected ${report.sliceCount} optimal vertical slices:`));
  lines.push("");

  for (let i = 0; i < report.slices.length; i++) {
    const slice = report.slices[i];
    const cohesionBar = createCohesionBar(slice.cohesion);
    const coupling = calculateCoupling(slice);

    lines.push(
      pc.bold(`${i + 1}. ${slice.name} (${slice.fileCount} files, cohesion: ${slice.cohesion.toFixed(1)}%)`)
    );

    // Show file list (limited)
    const filesToShow = Math.min(5, slice.files.length);
    for (let j = 0; j < filesToShow; j++) {
      lines.push(pc.gray(`   - ${slice.files[j]}`));
    }

    if (slice.files.length > filesToShow) {
      lines.push(
        pc.gray(`   ... and ${slice.files.length - filesToShow} more`)
      );
    }

    lines.push("");
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(pc.bold("💡 Recommendations:"));
    for (const rec of report.recommendations) {
      lines.push(pc.cyan(`   - ${rec}`));
    }
    lines.push("");
  }

  lines.push(pc.bold("📋 Next step:") + " arela detect slices --json slices.json");
  lines.push("");

  return lines.join("\n");
}

/**
 * Format the slice report as JSON
 */
export function formatReportJSON(report: SliceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Create a visual cohesion bar
 */
function createCohesionBar(cohesion: number): string {
  const filled = Math.round(cohesion / 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  if (cohesion >= 80) {
    return pc.green(bar);
  } else if (cohesion >= 60) {
    return pc.yellow(bar);
  } else {
    return pc.red(bar);
  }
}

/**
 * Calculate coupling quality
 */
function calculateCoupling(slice: Slice): string {
  if (slice.externalImports === 0) {
    return "isolated";
  }

  const ratio = slice.internalImports / (slice.internalImports + slice.externalImports);

  if (ratio > 0.8) {
    return "low coupling";
  } else if (ratio > 0.5) {
    return "moderate coupling";
  } else {
    return "high coupling";
  }
}

/**
 * Format recommendations based on slices
 */
export function generateRecommendations(slices: Slice[]): string[] {
  const recommendations: string[] = [];

  // Check if any slices exist
  if (slices.length === 0) {
    recommendations.push("No clear slice boundaries detected. Consider refactoring.");
    return recommendations;
  }

  // Check average cohesion
  const avgCohesion = slices.reduce((sum, s) => sum + s.cohesion, 0) / slices.length;
  if (avgCohesion < 70) {
    recommendations.push("Average slice cohesion is low. Consider further refactoring.");
  }

  // Create feature directories
  recommendations.push(`Create feature directories: ${slices.map((s) => `features/${s.name}/`).join(", ")}`);

  // Move files into slices
  recommendations.push("Move files into their respective slice directories");

  // Extract shared utilities
  const sharedUtilFiles = slices.flatMap((s) => s.files.filter((f) => f.includes("util") || f.includes("common")));
  if (sharedUtilFiles.length > 0) {
    recommendations.push("Extract shared utilities to a common/ directory");
  }

  // Define slice boundaries
  recommendations.push("Define slice boundaries with barrel exports (index.ts)");

  // Consider API boundaries
  recommendations.push("Consider creating API contracts between slices");

  // High coupling warning
  const highCouplingSlices = slices.filter((s) => s.cohesion < 60);
  if (highCouplingSlices.length > 0) {
    recommendations.push(`Review high-coupling slices: ${highCouplingSlices.map((s) => s.name).join(", ")}`);
  }

  return recommendations;
}

/**
 * Print verbose debug information
 */
export function printVerboseInfo(report: SliceReport): void {
  console.log(pc.gray("\n📋 Verbose Analysis:"));
  console.log(pc.gray(`Total slices: ${report.sliceCount}`));
  console.log(pc.gray(`Total files: ${report.totalFiles}`));
  console.log(pc.gray(`Total imports: ${report.totalImports}`));

  const avgCohesion = report.slices.reduce((sum, s) => sum + s.cohesion, 0) / report.slices.length;
  console.log(pc.gray(`Average cohesion: ${avgCohesion.toFixed(1)}%`));

  const avgSize = report.slices.reduce((sum, s) => sum + s.fileCount, 0) / report.slices.length;
  console.log(pc.gray(`Average slice size: ${avgSize.toFixed(1)} files`));

  console.log(pc.gray(""));
}
