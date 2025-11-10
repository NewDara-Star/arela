import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { doctor as doctorTask } from "./loaders.js";

export interface ComplianceSnapshot {
  date: string;
  score: number;
  violations: number;
  rulesChecked: number;
  ruleViolations: Array<{
    rule: string;
    count: number;
  }>;
  improvements: Array<{
    category: string;
    before: number;
    after: number;
  }>;
}

export interface ComplianceHistory {
  snapshots: ComplianceSnapshot[];
  lastUpdated: string;
}

/**
 * Get compliance history file path
 */
function getHistoryFilePath(cwd: string): string {
  return path.join(cwd, ".arela", "compliance-history.json");
}

/**
 * Load compliance history
 */
export async function loadComplianceHistory(cwd: string): Promise<ComplianceHistory> {
  const historyFile = getHistoryFilePath(cwd);
  
  if (!(await fs.pathExists(historyFile))) {
    return {
      snapshots: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  try {
    return await fs.readJson(historyFile);
  } catch {
    return {
      snapshots: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save compliance history
 */
export async function saveComplianceHistory(
  cwd: string,
  history: ComplianceHistory,
): Promise<void> {
  const historyFile = getHistoryFilePath(cwd);
  await fs.ensureDir(path.dirname(historyFile));
  await fs.writeJson(historyFile, history, { spaces: 2 });
}

/**
 * Track compliance
 */
export async function trackCompliance(cwd: string): Promise<ComplianceSnapshot> {
  // Run doctor to get current compliance
  const result = await doctorTask({ cwd, evalMode: false });
  
  const totalRules = result.rules.items.length + result.workflows.items.length;
  const violations = result.rules.errors.length + result.workflows.errors.length;
  const score = totalRules > 0 ? Math.round(((totalRules - violations) / totalRules) * 100) : 100;
  
  // Count violations by rule
  const ruleViolations: Record<string, number> = {};
  
  for (const error of [...result.rules.errors, ...result.workflows.errors]) {
    const ruleMatch = error.match(/Rule: ([\w-]+)/);
    if (ruleMatch) {
      const rule = ruleMatch[1];
      ruleViolations[rule] = (ruleViolations[rule] || 0) + 1;
    }
  }
  
  const snapshot: ComplianceSnapshot = {
    date: new Date().toISOString().split("T")[0],
    score,
    violations,
    rulesChecked: totalRules,
    ruleViolations: Object.entries(ruleViolations).map(([rule, count]) => ({ rule, count })),
    improvements: [],
  };
  
  // Load history and add snapshot
  const history = await loadComplianceHistory(cwd);
  
  // Calculate improvements from last snapshot
  if (history.snapshots.length > 0) {
    const lastSnapshot = history.snapshots[history.snapshots.length - 1];
    
    if (lastSnapshot.score !== score) {
      snapshot.improvements.push({
        category: "Overall Score",
        before: lastSnapshot.score,
        after: score,
      });
    }
  }
  
  // Add or update today's snapshot
  const existingIndex = history.snapshots.findIndex((s) => s.date === snapshot.date);
  
  if (existingIndex >= 0) {
    history.snapshots[existingIndex] = snapshot;
  } else {
    history.snapshots.push(snapshot);
  }
  
  history.lastUpdated = new Date().toISOString();
  
  await saveComplianceHistory(cwd, history);
  
  return snapshot;
}

/**
 * Show compliance dashboard
 */
export async function showComplianceDashboard(cwd: string): Promise<void> {
  const history = await loadComplianceHistory(cwd);
  
  if (history.snapshots.length === 0) {
    console.log(pc.yellow("\nNo compliance history yet."));
    console.log(pc.gray("Run: npx arela doctor --track\n"));
    return;
  }
  
  console.log(pc.bold(pc.cyan("\n📊 Compliance Dashboard\n")));
  
  // Show trend (last 4 weeks or all available)
  const recentSnapshots = history.snapshots.slice(-28); // Last 28 days
  const weeklySnapshots: ComplianceSnapshot[] = [];
  
  // Group by week
  for (let i = 0; i < recentSnapshots.length; i += 7) {
    const weekSnaps = recentSnapshots.slice(i, i + 7);
    if (weekSnaps.length > 0) {
      // Use last snapshot of the week
      weeklySnapshots.push(weekSnaps[weekSnaps.length - 1]);
    }
  }
  
  if (weeklySnapshots.length > 0) {
    console.log(pc.bold("Compliance Trend (Last 4 Weeks):\n"));
    
    for (let i = 0; i < weeklySnapshots.length; i++) {
      const snap = weeklySnapshots[i];
      const weekNum = i + 1;
      const barLength = Math.round((snap.score / 100) * 20);
      const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
      
      console.log(`Week ${weekNum}: ${snap.score}% ${pc.cyan(bar)}`);
    }
    
    console.log("");
    
    // Calculate trend
    if (weeklySnapshots.length >= 2) {
      const firstScore = weeklySnapshots[0].score;
      const lastScore = weeklySnapshots[weeklySnapshots.length - 1].score;
      const change = lastScore - firstScore;
      const changePercent = firstScore > 0 ? Math.round((change / firstScore) * 100) : 0;
      
      if (change > 0) {
        console.log(pc.green(`Trending: +${changePercent}% in ${weeklySnapshots.length} weeks ✅`));
      } else if (change < 0) {
        console.log(pc.red(`Trending: ${changePercent}% in ${weeklySnapshots.length} weeks ⚠️`));
      } else {
        console.log(pc.gray(`Trending: No change in ${weeklySnapshots.length} weeks`));
      }
      
      console.log("");
    }
  }
  
  // Show top violations
  const latestSnapshot = history.snapshots[history.snapshots.length - 1];
  
  if (latestSnapshot.ruleViolations.length > 0) {
    console.log(pc.bold("Top Violations:\n"));
    
    const sortedViolations = [...latestSnapshot.ruleViolations].sort((a, b) => b.count - a.count);
    
    for (let i = 0; i < Math.min(5, sortedViolations.length); i++) {
      const violation = sortedViolations[i];
      console.log(`${i + 1}. ${violation.rule} (${violation.count} occurrences)`);
    }
    
    console.log("");
  }
  
  // Show improvements
  if (latestSnapshot.improvements.length > 0) {
    console.log(pc.bold("Recent Improvements:\n"));
    
    for (const improvement of latestSnapshot.improvements) {
      const change = improvement.after - improvement.before;
      const icon = change > 0 ? "✅" : "📈";
      console.log(`${icon} ${improvement.category}: ${improvement.before}% → ${improvement.after}%`);
    }
    
    console.log("");
  }
  
  // Current status
  console.log(pc.bold("Current Status:\n"));
  console.log(pc.gray(`Score: ${latestSnapshot.score}%`));
  console.log(pc.gray(`Violations: ${latestSnapshot.violations}`));
  console.log(pc.gray(`Rules checked: ${latestSnapshot.rulesChecked}`));
  console.log(pc.gray(`Last updated: ${latestSnapshot.date}`));
  
  console.log("");
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  cwd: string,
  format: "markdown" | "json" | "html",
): Promise<string> {
  const history = await loadComplianceHistory(cwd);
  
  if (history.snapshots.length === 0) {
    throw new Error("No compliance history available. Run: npx arela doctor --track");
  }
  
  const latestSnapshot = history.snapshots[history.snapshots.length - 1];
  
  if (format === "json") {
    return JSON.stringify(history, null, 2);
  }
  
  if (format === "html") {
    return generateHTMLReport(history, latestSnapshot);
  }
  
  // Markdown format
  return generateMarkdownReport(history, latestSnapshot);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
  history: ComplianceHistory,
  latestSnapshot: ComplianceSnapshot,
): string {
  const lines: string[] = [];
  
  lines.push("# Arela Compliance Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Project:** ${process.cwd()}`);
  lines.push("");
  
  lines.push("## Current Status");
  lines.push("");
  lines.push(`- **Score:** ${latestSnapshot.score}%`);
  lines.push(`- **Violations:** ${latestSnapshot.violations}`);
  lines.push(`- **Rules Checked:** ${latestSnapshot.rulesChecked}`);
  lines.push(`- **Last Updated:** ${latestSnapshot.date}`);
  lines.push("");
  
  // Trend
  if (history.snapshots.length >= 2) {
    lines.push("## Compliance Trend");
    lines.push("");
    lines.push("| Date | Score | Violations |");
    lines.push("|------|-------|------------|");
    
    for (const snap of history.snapshots.slice(-10)) {
      lines.push(`| ${snap.date} | ${snap.score}% | ${snap.violations} |`);
    }
    
    lines.push("");
  }
  
  // Top violations
  if (latestSnapshot.ruleViolations.length > 0) {
    lines.push("## Top Violations");
    lines.push("");
    
    const sortedViolations = [...latestSnapshot.ruleViolations].sort((a, b) => b.count - a.count);
    
    for (let i = 0; i < Math.min(10, sortedViolations.length); i++) {
      const violation = sortedViolations[i];
      lines.push(`${i + 1}. **${violation.rule}** - ${violation.count} occurrences`);
    }
    
    lines.push("");
  }
  
  // Improvements
  if (latestSnapshot.improvements.length > 0) {
    lines.push("## Recent Improvements");
    lines.push("");
    
    for (const improvement of latestSnapshot.improvements) {
      const change = improvement.after - improvement.before;
      const icon = change > 0 ? "✅" : "📈";
      lines.push(`- ${icon} **${improvement.category}**: ${improvement.before}% → ${improvement.after}%`);
    }
    
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  lines.push("*Generated by Arela v1.9.0*");
  
  return lines.join("\n");
}

/**
 * Generate HTML report
 */
function generateHTMLReport(
  history: ComplianceHistory,
  latestSnapshot: ComplianceSnapshot,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Arela Compliance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #0ea5e9; }
    .score { font-size: 48px; font-weight: bold; color: ${latestSnapshot.score >= 80 ? "#10b981" : latestSnapshot.score >= 60 ? "#f59e0b" : "#ef4444"}; }
    .card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .trend { display: flex; gap: 10px; align-items: flex-end; height: 200px; }
    .bar { background: #0ea5e9; width: 40px; }
  </style>
</head>
<body>
  <h1>📊 Arela Compliance Report</h1>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  
  <div class="card">
    <h2>Current Status</h2>
    <div class="score">${latestSnapshot.score}%</div>
    <p><strong>Violations:</strong> ${latestSnapshot.violations}</p>
    <p><strong>Rules Checked:</strong> ${latestSnapshot.rulesChecked}</p>
    <p><strong>Last Updated:</strong> ${latestSnapshot.date}</p>
  </div>
  
  ${history.snapshots.length >= 2 ? `
  <div class="card">
    <h2>Compliance Trend</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Score</th>
          <th>Violations</th>
        </tr>
      </thead>
      <tbody>
        ${history.snapshots.slice(-10).map((snap) => `
          <tr>
            <td>${snap.date}</td>
            <td>${snap.score}%</td>
            <td>${snap.violations}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}
  
  ${latestSnapshot.ruleViolations.length > 0 ? `
  <div class="card">
    <h2>Top Violations</h2>
    <ol>
      ${[...latestSnapshot.ruleViolations].sort((a, b) => b.count - a.count).slice(0, 10).map((v) => `
        <li><strong>${v.rule}</strong> - ${v.count} occurrences</li>
      `).join("")}
    </ol>
  </div>
  ` : ""}
  
  <hr>
  <p><em>Generated by Arela v1.9.0</em></p>
</body>
</html>`;
}

/**
 * Check compliance for CI
 */
export async function checkComplianceForCI(
  cwd: string,
  threshold: number = 80,
): Promise<{ passed: boolean; score: number; violations: number }> {
  const snapshot = await trackCompliance(cwd);
  
  return {
    passed: snapshot.score >= threshold,
    score: snapshot.score,
    violations: snapshot.violations,
  };
}
