import pc from "picocolors";

export interface TestStep {
  action: string;
  status: "pass" | "fail" | "warning";
  message?: string;
  screenshot?: string;
  duration?: number;
}

export interface TestIssue {
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion?: string;
  file?: string;
  line?: number;
}

export interface TestResults {
  flow: string;
  url: string;
  steps: TestStep[];
  issues: TestIssue[];
  screenshots: string[];
  duration: number;
}

/**
 * Report test results to console
 */
export function reportResults(results: TestResults): void {
  console.log("");
  console.log(pc.bold(pc.cyan(`🧪 Running user flow: ${results.flow}`)));
  console.log("");

  // Report each step
  for (const step of results.steps) {
    const icon = getStatusIcon(step.status);
    const statusColor = getStatusColor(step.status);
    const message = step.message || step.action;

    console.log(`  ${icon} ${statusColor(message)}`);

    if (step.screenshot) {
      console.log(pc.dim(`     📸 ${step.screenshot}`));
    }
  }

  console.log("");

  // Summary statistics
  const passed = results.steps.filter((s) => s.status === "pass").length;
  const failed = results.steps.filter((s) => s.status === "fail").length;
  const warnings = results.steps.filter((s) => s.status === "warning").length;

  console.log(pc.bold("📊 Results:"));
  console.log(`  - ${pc.green(`${passed} steps passed`)}`);
  if (failed > 0) {
    console.log(`  - ${pc.red(`${failed} issues found`)}`);
  }
  if (warnings > 0) {
    console.log(`  - ${pc.yellow(`${warnings} warnings`)}`);
  }
  console.log(pc.dim(`  - Duration: ${formatDuration(results.duration)}`));
  console.log("");

  // Report issues with recommendations
  if (results.issues.length > 0) {
    console.log(pc.bold("💡 Recommendations:"));
    console.log("");

    for (let i = 0; i < results.issues.length; i++) {
      const issue = results.issues[i];
      const severityIcon = getSeverityIcon(issue.severity);
      const severityColor = getSeverityColor(issue.severity);

      console.log(`  ${i + 1}. ${severityIcon} ${severityColor(issue.message)}`);

      if (issue.suggestion) {
        console.log(pc.dim(`     💭 ${issue.suggestion}`));
      }

      if (issue.file) {
        const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
        console.log(pc.dim(`     📄 ${location}`));
      }

      console.log("");
    }
  }

  // Report screenshots
  if (results.screenshots.length > 0) {
    console.log(
      pc.dim(`📸 Screenshots saved to .arela/screenshots/ (${results.screenshots.length} files)`)
    );
    console.log("");
  }
}

/**
 * Get icon for step status
 */
function getStatusIcon(status: "pass" | "fail" | "warning"): string {
  switch (status) {
    case "pass":
      return "✅";
    case "fail":
      return "❌";
    case "warning":
      return "⚠️ ";
  }
}

/**
 * Get color function for step status
 */
function getStatusColor(status: "pass" | "fail" | "warning"): (text: string) => string {
  switch (status) {
    case "pass":
      return pc.green;
    case "fail":
      return pc.red;
    case "warning":
      return pc.yellow;
  }
}

/**
 * Get icon for issue severity
 */
function getSeverityIcon(severity: "critical" | "warning" | "info"): string {
  switch (severity) {
    case "critical":
      return "🔴";
    case "warning":
      return "🟡";
    case "info":
      return "🔵";
  }
}

/**
 * Get color function for issue severity
 */
function getSeverityColor(severity: "critical" | "warning" | "info"): (text: string) => string {
  switch (severity) {
    case "critical":
      return pc.red;
    case "warning":
      return pc.yellow;
    case "info":
      return pc.cyan;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const remainingMs = ms % 1000;

  if (seconds < 60) {
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Report test start
 */
export function reportStart(url: string, flow: string): void {
  console.log("");
  console.log(pc.bold(pc.cyan("🌐 Starting web app testing...")));
  console.log(pc.dim(`📱 Launching browser at ${url}`));
  console.log(pc.dim(`🎯 Flow: ${flow}`));
  console.log("");
}

/**
 * Report test error
 */
export function reportError(error: Error): void {
  console.log("");
  console.log(pc.bold(pc.red("❌ Test execution failed")));
  console.log("");
  console.log(pc.red(error.message));
  console.log("");

  if (error.stack) {
    console.log(pc.dim(error.stack));
    console.log("");
  }
}

/**
 * Report test completion
 */
export function reportComplete(success: boolean): void {
  if (success) {
    console.log(pc.bold(pc.green("✅ Test completed successfully!")));
  } else {
    console.log(pc.bold(pc.yellow("⚠️  Test completed with issues")));
  }
  console.log("");
}
