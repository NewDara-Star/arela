/**
 * Architecture Report Reporter
 * Formats and displays architecture analysis results
 */

import path from "path";
import fs from "fs-extra";
import pc from "picocolors";
import { ArchitectureReport } from "./types.js";

/**
 * Report architecture analysis to console
 */
export function reportArchitecture(report: ArchitectureReport, verbose = false): void {
  console.log(pc.bold(`📊 Architecture Type: ${formatArchType(report.overallArchitecture)}`));
  console.log(
    pc.gray(`   Horizontal: ${report.overallScores.horizontal}% | Vertical: ${report.overallScores.vertical}%\n`)
  );

  // Report per-repository
  if (report.repositories.length > 0) {
    console.log(pc.bold("📁 Repository Analysis:\n"));

    for (const repo of report.repositories) {
      const icon = repo.architecture === "horizontal" ? "📚" : "🎯";
      console.log(`${icon} ${repo.name}`);
      console.log(
        pc.gray(
          `   Type: ${repo.architecture} (${Math.max(repo.scores.horizontal, repo.scores.vertical)}%)`
        )
      );
      console.log(
        pc.gray(`   Coupling: ${repo.metrics.coupling} | Cohesion: ${repo.metrics.cohesion}`)
      );

      if (verbose && repo.directories.length > 0) {
        console.log(pc.gray(`   Directories: ${repo.directories.length}`));
        for (const dir of repo.directories.slice(0, 5)) {
          console.log(
            pc.dim(
              `     • ${dir.path} (${dir.type}) - ${dir.fileCount} files, internal: ${dir.internalImports}`
            )
          );
        }
        if (repo.directories.length > 5) {
          console.log(pc.dim(`     ... and ${repo.directories.length - 5} more`));
        }
      }
      console.log("");
    }
  }

  // Report issues
  if (report.issues.length > 0) {
    console.log(pc.bold("❌ Issues Found:\n"));

    const criticalIssues = report.issues.filter(i => i.severity === "critical");
    const warnings = report.issues.filter(i => i.severity === "warning");

    if (criticalIssues.length > 0) {
      console.log(pc.red(`🔴 Critical (${criticalIssues.length}):`));
      for (const issue of criticalIssues.slice(0, 3)) {
        console.log(pc.red(`   • ${issue.title}`));
        if (verbose) {
          console.log(pc.gray(`     ${issue.description}`));
        }
      }
      if (criticalIssues.length > 3) {
        console.log(pc.red(`   ... and ${criticalIssues.length - 3} more critical issues`));
      }
      console.log("");
    }

    if (warnings.length > 0) {
      console.log(pc.yellow(`🟡 Warnings (${warnings.length}):`));
      for (const issue of warnings.slice(0, 3)) {
        console.log(pc.yellow(`   • ${issue.title}`));
        if (verbose) {
          console.log(pc.gray(`     ${issue.description}`));
        }
      }
      if (warnings.length > 3) {
        console.log(pc.yellow(`   ... and ${warnings.length - 3} more warnings`));
      }
      console.log("");
    }
  }

  // Report metrics summary
  console.log(pc.bold("📈 Global Metrics:\n"));
  console.log(
    pc.gray(`   Coupling: ${report.globalMetrics.coupling} (0=perfect, 100=tightly coupled)`)
  );
  console.log(
    pc.gray(`   Cohesion: ${report.globalMetrics.cohesion} (0=scattered, 100=cohesive)\n`)
  );

  // Report recommendations
  if (report.recommendations.length > 0) {
    console.log(pc.bold("💡 Recommendations:\n"));
    for (const rec of report.recommendations.slice(0, 5)) {
      console.log(pc.cyan(`   ${rec}`));
    }
    if (report.recommendations.length > 5) {
      console.log(pc.cyan(`   ... and ${report.recommendations.length - 5} more`));
    }
    console.log("");
  }

  // Report effort estimates
  if (report.effort) {
    console.log(pc.bold("⏱️  VSA Migration Estimates:\n"));
    console.log(pc.gray(`   Effort: ${report.effort.estimated}`));
    console.log(pc.gray(`   Breakeven: ${report.effort.breakeven}`));
    console.log(pc.gray(`   3-Year ROI: ${report.effort.roi3Year}%\n`));
  }

  // Next steps
  console.log(pc.bold("🚀 Next Steps:\n"));
  console.log(pc.cyan("   $ arela detect slices    # Identify optimal vertical slices"));
  console.log(pc.cyan("   $ arela flow generate    # Create refactoring proposals\n"));
}

/**
 * Export architecture report to JSON
 */
export function exportArchitectureJson(report: ArchitectureReport, filePath: string): void {
  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  fs.writeJsonSync(filePath, report, { spaces: 2 });
}

/**
 * Export architecture report to markdown
 */
export function exportArchitectureMarkdown(report: ArchitectureReport, filePath: string): void {
  const markdown = generateMarkdownReport(report);
  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  fs.writeFileSync(filePath, markdown);
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(report: ArchitectureReport): string {
  let md = `# Architecture Analysis Report\n\n`;
  md += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;

  md += `## Summary\n\n`;
  md += `- **Overall Architecture**: ${report.overallArchitecture.toUpperCase()}\n`;
  md += `- **Horizontal Score**: ${report.overallScores.horizontal}%\n`;
  md += `- **Vertical Score**: ${report.overallScores.vertical}%\n`;
  md += `- **Coupling**: ${report.globalMetrics.coupling} (lower is better)\n`;
  md += `- **Cohesion**: ${report.globalMetrics.cohesion} (higher is better)\n\n`;

  md += `## Repository Analysis\n\n`;

  for (const repo of report.repositories) {
    md += `### ${repo.name}\n\n`;
    md += `- **Architecture Type**: ${repo.architecture}\n`;
    md += `- **Horizontal**: ${repo.scores.horizontal}%\n`;
    md += `- **Vertical**: ${repo.scores.vertical}%\n`;
    md += `- **Coupling**: ${repo.metrics.coupling}\n`;
    md += `- **Cohesion**: ${repo.metrics.cohesion}\n`;
    md += `- **Directories**: ${repo.directories.length}\n\n`;

    if (repo.directories.length > 0) {
      md += `#### Directory Structure\n\n`;
      md += `| Directory | Type | Files | Internal Imports |\n`;
      md += `|-----------|------|-------|------------------|\n`;
      for (const dir of repo.directories) {
        md += `| ${dir.path} | ${dir.type} | ${dir.fileCount} | ${dir.internalImports} |\n`;
      }
      md += `\n`;
    }
  }

  if (report.issues.length > 0) {
    md += `## Issues\n\n`;
    md += `Found ${report.issues.length} issue(s):\n\n`;

    for (const issue of report.issues) {
      md += `### ${issue.severity.toUpperCase()}: ${issue.title}\n\n`;
      md += `${issue.description}\n\n`;
      if (issue.recommendation) {
        md += `**Recommendation**: ${issue.recommendation}\n\n`;
      }
    }
  }

  if (report.recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
    md += `\n`;
  }

  if (report.effort) {
    md += `## Migration Effort Estimates\n\n`;
    md += `- **Estimated Effort**: ${report.effort.estimated}\n`;
    md += `- **Breakeven Point**: ${report.effort.breakeven}\n`;
    md += `- **3-Year ROI**: ${report.effort.roi3Year}%\n\n`;
  }

  return md;
}

/**
 * Format architecture type for display
 */
function formatArchType(type: string): string {
  switch (type) {
    case "horizontal":
      return "📚 Horizontal (Layered)";
    case "vertical":
      return "🎯 Vertical (Feature-Sliced)";
    case "hybrid":
      return "🔄 Hybrid";
    default:
      return type;
  }
}
