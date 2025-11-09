import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import type { AuditReport, Finding, Severity } from "../types.js";
import { ALL_CHECKS } from "./checks.js";

export async function runAudit(cwd: string): Promise<AuditReport> {
  console.log(pc.cyan("Running audit checks...\n"));
  
  const findings: Finding[] = [];
  
  for (const check of ALL_CHECKS) {
    try {
      const finding = await check.run(cwd);
      if (finding) {
        findings.push(finding);
        logFinding(finding);
      }
    } catch (error) {
      console.log(pc.yellow(`Warning: Check ${check.id} failed: ${(error as Error).message}`));
    }
  }
  
  const summary = calculateSummary(findings);
  const report: AuditReport = {
    summary,
    findings,
    ts: new Date().toISOString(),
  };
  
  await saveReport(cwd, report);
  
  console.log(pc.bold(`\n📊 Audit Summary`));
  console.log(pc.dim(`Score: ${summary.score}/100`));
  console.log(severityColor("critical", `Critical: ${summary.sev0}`));
  console.log(severityColor("high", `High: ${summary.sev1}`));
  console.log(severityColor("med", `Medium: ${summary.sev2}`));
  console.log(severityColor("low", `Low: ${summary.sev3}`));
  
  return report;
}

function logFinding(finding: Finding): void {
  const icon = severityIcon(finding.severity);
  const color = severityColor(finding.severity, finding.id);
  
  console.log(`${icon} ${color}`);
  console.log(pc.dim(`   ${finding.why}`));
  console.log(pc.dim(`   Evidence: ${finding.evidence.join(", ")}`));
  console.log(pc.dim(`   Fix: ${finding.fix}`));
  console.log();
}

function severityIcon(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "med":
      return "🟡";
    case "low":
      return "🔵";
    case "info":
      return "ℹ️";
  }
}

function severityColor(severity: Severity, text: string): string {
  switch (severity) {
    case "critical":
      return pc.red(text);
    case "high":
      return pc.yellow(text);
    case "med":
      return pc.cyan(text);
    case "low":
      return pc.blue(text);
    case "info":
      return pc.dim(text);
  }
}

function calculateSummary(findings: Finding[]): AuditReport["summary"] {
  const sev0 = findings.filter(f => f.severity === "critical").length;
  const sev1 = findings.filter(f => f.severity === "high").length;
  const sev2 = findings.filter(f => f.severity === "med").length;
  const sev3 = findings.filter(f => f.severity === "low").length;
  
  // Score: 100 - (critical*20 + high*10 + med*5 + low*2)
  const deductions = sev0 * 20 + sev1 * 10 + sev2 * 5 + sev3 * 2;
  const score = Math.max(0, 100 - deductions);
  
  return { score, sev0, sev1, sev2, sev3 };
}

async function saveReport(cwd: string, report: AuditReport): Promise<void> {
  const reportPath = path.join(cwd, ".arela", "audit", "report.json");
  await fs.ensureDir(path.dirname(reportPath));
  await fs.writeJson(reportPath, report, { spaces: 2 });
  
  console.log(pc.dim(`\nReport saved to ${path.relative(cwd, reportPath)}`));
}

export async function loadReport(cwd: string): Promise<AuditReport | null> {
  const reportPath = path.join(cwd, ".arela", "audit", "report.json");
  
  if (!(await fs.pathExists(reportPath))) {
    return null;
  }
  
  return await fs.readJson(reportPath);
}
