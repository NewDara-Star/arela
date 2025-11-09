#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

function sh(cmd: string, opts?: { silent?: boolean }): string {
  try {
    return execSync(cmd, {
      stdio: opts?.silent ? "pipe" : "inherit",
      encoding: "utf8",
    }).trim();
  } catch (error) {
    if (!opts?.silent) throw error;
    return "";
  }
}

function which(bin: string): boolean {
  try {
    sh(`command -v ${bin}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}

function detectPM(): "pnpm" | "yarn" | "npm" {
  if (which("pnpm")) return "pnpm";
  if (which("yarn")) return "yarn";
  return "npm";
}

function ensureHusky(pm: string): void {
  console.log(pc.cyan("Setting up Husky..."));
  
  // Try to initialize Husky if not present
  if (!fs.existsSync(".husky")) {
    try {
      sh(`${pm} dlx husky-init`, { silent: true });
    } catch {
      // Fallback: create manually
      fs.mkdirSync(".husky", { recursive: true });
      fs.mkdirSync(".husky/_", { recursive: true });
    }
  }

  // Configure git hooks path
  try {
    sh(`git config core.hooksPath .husky`, { silent: true });
  } catch {
    console.log(pc.yellow("Warning: Could not set git hooks path"));
  }

  // Ensure pre-commit is executable
  const preCommitPath = ".husky/pre-commit";
  if (fs.existsSync(preCommitPath)) {
    try {
      fs.chmodSync(preCommitPath, 0o755);
    } catch {
      console.log(pc.yellow("Warning: Could not make pre-commit executable"));
    }
  }
}

function writeGitignoreFixes(): void {
  console.log(pc.cyan("Updating .gitignore..."));
  
  const gitignorePath = ".gitignore";
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";

  const lines = existing.split("\n");
  const additions = [
    "",
    "# Arela local-only files",
    ".arela/*.new",
    ".arela/.last-report.json",
    ".arela/memories/*",
    "",
    "# Keep VS Code settings for Arela",
    "!.vscode/settings.json",
  ];

  let modified = false;
  for (const line of additions) {
    if (!lines.includes(line)) {
      lines.push(line);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(gitignorePath, lines.join("\n"));
    console.log(pc.green("✓ Updated .gitignore"));
  } else {
    console.log(pc.dim("✓ .gitignore already configured"));
  }
}

function writeBaselineReport(): void {
  console.log(pc.cyan("Creating baseline evaluation report..."));
  
  const reportPath = ".arela/.last-report.json";
  const baseline = {
    scores: {
      reasoning: 4.0,
      correctness: 4.0,
      maintainability: 4.0,
      safety: 4.0,
      ux_empathy: 4.0,
    },
    average: 4.0,
    timestamp: new Date().toISOString(),
    note: "Baseline created by arela-setup",
  };

  fs.writeFileSync(reportPath, JSON.stringify(baseline, null, 2) + "\n");
  console.log(pc.green("✓ Created baseline report"));
}

function resolveNewFiles(): void {
  console.log(pc.cyan("Resolving staged files..."));
  
  const arelaDir = ".arela";
  if (!fs.existsSync(arelaDir)) return;

  const files = fs.readdirSync(arelaDir, { recursive: true }) as string[];
  for (const file of files) {
    if (file.endsWith(".new")) {
      const fullPath = path.join(arelaDir, file);
      const targetPath = fullPath.replace(/\.new$/, "");
      
      if (fs.existsSync(targetPath)) {
        console.log(pc.yellow(`Conflict: ${file} → keeping existing`));
      } else {
        fs.renameSync(fullPath, targetPath);
        console.log(pc.green(`✓ Resolved ${file}`));
      }
    }
  }
}

function createBranchAndCommit(): void {
  console.log(pc.cyan("Creating branch and commit..."));
  
  // Check if we're in a git repo
  try {
    sh(`git rev-parse --git-dir`, { silent: true });
  } catch {
    console.log(pc.yellow("Not a git repository. Skipping branch/commit."));
    return;
  }

  // Create branch
  const branchName = "chore/arela-bootstrap";
  try {
    sh(`git checkout -b ${branchName}`, { silent: true });
    console.log(pc.green(`✓ Created branch ${branchName}`));
  } catch {
    console.log(pc.dim(`Branch ${branchName} already exists or checkout failed`));
  }

  // Stage files
  const filesToAdd = [
    ".arela",
    ".husky/pre-commit",
    ".github/workflows/arela-doctor.yml",
    ".vscode/settings.json",
    ".gitignore",
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
  ].filter((file) => fs.existsSync(file));

  if (filesToAdd.length > 0) {
    sh(`git add ${filesToAdd.join(" ")}`);
    console.log(pc.green(`✓ Staged ${filesToAdd.length} files`));
  }

  // Commit
  try {
    sh(`git commit -m "chore(arela): bootstrap rules, CI guardrails, eval baseline"`, {
      silent: true,
    });
    console.log(pc.green("✓ Created commit"));
  } catch {
    console.log(pc.dim("No changes to commit or commit failed"));
  }

  // Try to create PR with gh CLI
  if (which("gh")) {
    try {
      sh(
        `gh pr create --fill --title "chore(arela): bootstrap rules, CI guardrails, eval baseline"`,
        { silent: true }
      );
      console.log(pc.green("✓ Created pull request"));
    } catch {
      console.log(
        pc.yellow("Could not create PR automatically. Push branch and open PR manually.")
      );
    }
  } else {
    console.log(
      pc.yellow(
        "GitHub CLI (gh) not found. Push branch and open PR manually:\n" +
          `  git push -u origin ${branchName}`
      )
    );
  }
}

async function main(): Promise<void> {
  console.log(pc.bold(pc.cyan("\n🛡️  Arela Setup\n")));

  const cwd = process.cwd();
  console.log(pc.dim(`Working directory: ${cwd}\n`));

  // Detect package manager
  const pm = detectPM();
  console.log(pc.cyan(`Detected package manager: ${pm}\n`));

  // Install preset
  console.log(pc.cyan("Installing @newdara/preset-cto..."));
  sh(`${pm} add -D @newdara/preset-cto@latest`);
  console.log(pc.green("✓ Installed preset\n"));

  // Run arela init
  console.log(pc.cyan("Initializing Arela rules..."));
  sh(`npx arela init`);
  console.log(pc.green("✓ Initialized rules\n"));

  // Run arela harden
  console.log(pc.cyan("Installing guardrails..."));
  sh(`npx arela harden`);
  console.log(pc.green("✓ Installed guardrails\n"));

  // Resolve any .new files
  resolveNewFiles();

  // Write baseline report
  writeBaselineReport();

  // Ensure Husky is set up
  ensureHusky(pm);

  // Fix .gitignore
  writeGitignoreFixes();

  // Create branch and commit
  console.log();
  createBranchAndCommit();

  // Final instructions
  console.log(pc.bold(pc.green("\n✅ Arela setup complete!\n")));
  console.log(pc.cyan("Next steps:"));
  console.log("1. Review the changes in your branch");
  console.log("2. Run: " + pc.bold("npx arela doctor --eval"));
  console.log("3. Copy agent bootstrap: " + pc.bold("npx arela agent bootstrap"));
  console.log();
}

main().catch((error) => {
  console.error(pc.red(`\n❌ Setup failed: ${error.message}\n`));
  process.exit(1);
});
