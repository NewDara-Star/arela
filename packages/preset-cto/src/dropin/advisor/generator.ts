import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import type { Finding, FixPatch, AdvisoryReport } from "../types.js";
import { loadReport } from "../audit/runner.js";

export async function generateAdvisory(cwd: string): Promise<AdvisoryReport> {
  const report = await loadReport(cwd);
  
  if (!report) {
    throw new Error("No audit report found. Run 'arela audit' first.");
  }
  
  console.log(pc.cyan("Generating fix recommendations...\n"));
  
  const patches: FixPatch[] = [];
  
  for (const finding of report.findings) {
    if (finding.autoFixable) {
      const patch = await generatePatch(cwd, finding);
      if (patch) {
        patches.push(patch);
        console.log(pc.green(`✓ ${finding.id}`));
        console.log(pc.dim(`  ${finding.fix}`));
      }
    } else {
      console.log(pc.yellow(`⚠ ${finding.id}`));
      console.log(pc.dim(`  Manual fix required: ${finding.fix}`));
    }
  }
  
  const summary = generateSummary(report.findings, patches);
  
  console.log(pc.bold(`\n📋 Advisory Summary`));
  console.log(pc.dim(`Auto-fixable: ${patches.length}/${report.findings.length}`));
  console.log(pc.dim(`Manual fixes: ${report.findings.length - patches.length}`));
  
  return {
    findings: report.findings,
    patches,
    summary,
  };
}

async function generatePatch(cwd: string, finding: Finding): Promise<FixPatch | null> {
  switch (finding.id) {
    case "ci.missing_pr_eval":
      return generateCIPatch(cwd, finding);
    case "git.missing_precommit":
      return generatePreCommitPatch(cwd, finding);
    case "obs.no_healthcheck":
      return generateHealthCheckPatch(cwd, finding);
    case "obs.no_structured_logging":
      return generateLoggingPatch(cwd, finding);
    case "security.no_rate_limit":
      return generateRateLimitPatch(cwd, finding);
    default:
      return null;
  }
}

async function generateCIPatch(cwd: string, finding: Finding): Promise<FixPatch> {
  const workflowPath = ".github/workflows/arela-doctor.yml";
  const content = `name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - name: Run Arela Doctor
        run: npx arela doctor --eval
`;
  
  const diff = `--- /dev/null
+++ b/${workflowPath}
@@ -0,0 +1,11 @@
+${content.split("\n").map(l => `+${l}`).join("\n")}`;
  
  return {
    findingId: finding.id,
    file: workflowPath,
    diff,
    description: "Add Arela Doctor CI workflow",
  };
}

async function generatePreCommitPatch(cwd: string, finding: Finding): Promise<FixPatch> {
  const hookPath = ".husky/pre-commit";
  const content = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx arela doctor --eval
`;
  
  const diff = `--- /dev/null
+++ b/${hookPath}
@@ -0,0 +1,4 @@
+${content.split("\n").map(l => `+${l}`).join("\n")}`;
  
  return {
    findingId: finding.id,
    file: hookPath,
    diff,
    description: "Add Arela Doctor pre-commit hook",
  };
}

async function generateHealthCheckPatch(cwd: string, finding: Finding): Promise<FixPatch> {
  const file = finding.evidence[0]?.split(":")[0] || "src/main.ts";
  
  const healthCheckCode = `
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
`;
  
  const diff = `--- a/${file}
+++ b/${file}
@@ -10,0 +11,5 @@
${healthCheckCode.split("\n").map(l => `+${l}`).join("\n")}`;
  
  return {
    findingId: finding.id,
    file,
    diff,
    description: "Add /health endpoint",
  };
}

async function generateLoggingPatch(cwd: string, finding: Finding): Promise<FixPatch> {
  const pkgPath = "package.json";
  
  const diff = `--- a/${pkgPath}
+++ b/${pkgPath}
@@ -5,0 +6,1 @@
+    "pino": "^8.0.0",`;
  
  return {
    findingId: finding.id,
    file: pkgPath,
    diff,
    description: "Add pino for structured logging",
  };
}

async function generateRateLimitPatch(cwd: string, finding: Finding): Promise<FixPatch> {
  const file = finding.evidence[0]?.split(":")[0] || "src/server.ts";
  
  const rateLimitCode = `
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
`;
  
  const diff = `--- a/${file}
+++ b/${file}
@@ -1,0 +2,8 @@
${rateLimitCode.split("\n").map(l => `+${l}`).join("\n")}`;
  
  return {
    findingId: finding.id,
    file,
    diff,
    description: "Add rate limiting middleware",
  };
}

function generateSummary(findings: Finding[], patches: FixPatch[]): string {
  const lines: string[] = [];
  
  lines.push("# Arela Advisory Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total findings: ${findings.length}`);
  lines.push(`- Auto-fixable: ${patches.length}`);
  lines.push(`- Manual fixes required: ${findings.length - patches.length}`);
  lines.push("");
  
  lines.push("## Auto-Fixable Issues");
  lines.push("");
  for (const patch of patches) {
    const finding = findings.find(f => f.id === patch.findingId);
    if (finding) {
      lines.push(`### ${finding.id}`);
      lines.push("");
      lines.push(`**Severity**: ${finding.severity}`);
      lines.push(`**Why**: ${finding.why}`);
      lines.push(`**Fix**: ${finding.fix}`);
      lines.push(`**File**: ${patch.file}`);
      lines.push("");
      lines.push("```diff");
      lines.push(patch.diff);
      lines.push("```");
      lines.push("");
    }
  }
  
  lines.push("## Manual Fixes Required");
  lines.push("");
  for (const finding of findings) {
    if (!finding.autoFixable) {
      lines.push(`### ${finding.id}`);
      lines.push("");
      lines.push(`**Severity**: ${finding.severity}`);
      lines.push(`**Why**: ${finding.why}`);
      lines.push(`**Fix**: ${finding.fix}`);
      lines.push(`**Evidence**: ${finding.evidence.join(", ")}`);
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

export async function applyPatch(cwd: string, findingId: string): Promise<void> {
  const advisory = await generateAdvisory(cwd);
  const patch = advisory.patches.find(p => p.findingId === findingId);
  
  if (!patch) {
    throw new Error(`No auto-fix available for ${findingId}`);
  }
  
  console.log(pc.cyan(`Applying fix for ${findingId}...\n`));
  console.log(pc.dim(patch.description));
  console.log();
  
  // In production, parse and apply the diff
  // For now, just show what would be done
  console.log(pc.bold("Diff:"));
  console.log(patch.diff);
  console.log();
  
  console.log(pc.yellow("Note: Actual patch application not yet implemented"));
  console.log(pc.dim("This would create a branch, apply the diff, and commit"));
}
