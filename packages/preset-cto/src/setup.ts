import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import prompts from "prompts";
import pc from "picocolors";
import { init, harden as hardenTask, doctor as doctorTask } from "./loaders.js";

export interface SetupOptions {
  cwd: string;
  yes?: boolean;
  nonInteractive?: boolean;
  skipRag?: boolean;
  skipCi?: boolean;
  skipHooks?: boolean;
}

type PackageManager = "pnpm" | "npm" | "yarn";

const HUSKY_HOOK_CONTENT = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

set -e
if [ -f node_modules/@newdara/preset-cto/dist/cli.js ]; then
  node node_modules/@newdara/preset-cto/dist/cli.js doctor --eval
elif [ -f node_modules/@arela/preset-cto/dist/cli.js ]; then
  node node_modules/@arela/preset-cto/dist/cli.js doctor --eval
else
  echo "Arela CLI not found. Failing pre-commit." >&2
  exit 1
fi
`;

const DEFAULT_PROFILE = {
  persona: "cto",
  tone: "direct",
  humour: "dry",
  locale: "en-GB",
};

const DEFAULT_RUBRIC = {
  thresholds: { minPass: 3.5, avgPass: 4.0 },
  categories: [
    { name: "Context Integrity", weight: 1.0 },
    { name: "Testing Coverage", weight: 1.0 },
    { name: "Observability", weight: 1.0 },
    { name: "Code Review Gates", weight: 1.0 },
  ],
};

async function detectPackageManager(cwd: string): Promise<PackageManager> {
  // Check for lock files
  if (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(cwd, "package-lock.json"))) return "npm";
  if (await fs.pathExists(path.join(cwd, "yarn.lock"))) return "yarn";

  // Check for installed binaries
  try {
    await execa("pnpm", ["--version"], { cwd });
    return "pnpm";
  } catch {
    // pnpm not available
  }

  try {
    await execa("npm", ["--version"], { cwd });
    return "npm";
  } catch {
    // npm not available
  }

  return "yarn";
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return true;
  } catch {
    return false;
  }
}

async function initGitRepo(cwd: string): Promise<void> {
  await execa("git", ["init"], { cwd });
  console.log(pc.green("✓ Initialized git repository"));
}

async function hasPresetInstalled(cwd: string): Promise<boolean> {
  const pkgPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(pkgPath))) return false;

  try {
    const pkg = await fs.readJson(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return "@newdara/preset-cto" in deps || "@arela/preset-cto" in deps;
  } catch {
    return false;
  }
}

async function installPreset(pm: PackageManager, cwd: string): Promise<void> {
  console.log(pc.cyan("Installing @newdara/preset-cto..."));
  await execa(pm, ["add", "-D", "@newdara/preset-cto"], { cwd, stdio: "inherit" });
}

async function approveBuildsIfPnpm(pm: PackageManager, cwd: string): Promise<void> {
  if (pm !== "pnpm") return;

  try {
    console.log(pc.cyan("Approving pnpm builds..."));
    await execa("pnpm", ["approve-builds", "@newdara/preset-cto"], { cwd, timeout: 5000 });
    // Skip rebuild in monorepos - too slow and usually not needed
    const isPnpmWorkspace = await fs.pathExists(path.join(cwd, "pnpm-workspace.yaml"));
    if (!isPnpmWorkspace) {
      await execa("pnpm", ["rebuild", "@newdara/preset-cto"], { cwd, timeout: 10000 });
    }
    console.log(pc.green("✓ Approved builds"));
  } catch (error) {
    console.log(pc.yellow("⚠ Could not approve builds (may not be needed)"));
  }
}

async function runArelaInit(cwd: string): Promise<void> {
  console.log(pc.cyan("Running arela init..."));
  await init({ cwd, dryRun: false });
  console.log(pc.green("✓ Arela rules and workflows installed"));
}

async function hasHusky(cwd: string): Promise<boolean> {
  return fs.pathExists(path.join(cwd, ".husky"));
}

async function installHusky(pm: PackageManager, cwd: string): Promise<void> {
  console.log(pc.cyan("Installing Husky..."));
  
  // Install husky package
  await execa(pm, ["add", "-D", "husky"], { cwd, stdio: "inherit" });
  
  // Initialize husky
  await execa("npx", ["husky", "init"], { cwd });
  
  console.log(pc.green("✓ Husky installed"));
}

async function writeHuskyHook(cwd: string): Promise<void> {
  const hookPath = path.join(cwd, ".husky", "pre-commit");
  await fs.ensureDir(path.dirname(hookPath));
  await fs.writeFile(hookPath, HUSKY_HOOK_CONTENT, { mode: 0o755 });
  console.log(pc.green("✓ Arela pre-commit hook configured"));
}

async function ensureProfileAndRubric(cwd: string): Promise<void> {
  const profilePath = path.join(cwd, ".arela", "profile.json");
  const rubricPath = path.join(cwd, ".arela", "evals", "rubric.json");

  if (!(await fs.pathExists(profilePath))) {
    await fs.ensureDir(path.dirname(profilePath));
    await fs.writeJson(profilePath, DEFAULT_PROFILE, { spaces: 2 });
    console.log(pc.green("✓ Created .arela/profile.json"));
  }

  if (!(await fs.pathExists(rubricPath))) {
    await fs.ensureDir(path.dirname(rubricPath));
    
    // Try to copy from preset template first
    const templatePath = path.join(cwd, "node_modules", "@newdara", "preset-cto", "templates", ".arela", "evals", "rubric.json");
    if (await fs.pathExists(templatePath)) {
      await fs.copy(templatePath, rubricPath);
    } else {
      await fs.writeJson(rubricPath, DEFAULT_RUBRIC, { spaces: 2 });
    }
    console.log(pc.green("✓ Created .arela/evals/rubric.json"));
  }
}

async function runDoctorBaseline(cwd: string): Promise<void> {
  console.log(pc.cyan("Running doctor --eval to establish baseline..."));
  
  try {
    const { rules, workflows, evalResult } = await doctorTask({ cwd, evalMode: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      rules: { count: rules.items.length, errors: rules.errors },
      workflows: { count: workflows.items.length, errors: workflows.errors },
      evaluation: evalResult || { status: "skipped" },
    };
    
    const reportPath = path.join(cwd, ".arela", ".last-report.json");
    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(pc.green("✓ Baseline report saved to .arela/.last-report.json"));
  } catch (error) {
    console.log(pc.yellow("⚠ Could not run doctor baseline (continuing anyway)"));
  }
}

async function ensureGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, ".gitignore");
  const entry = ".arela/.last-report.json";
  
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, "utf-8");
    if (!content.includes(entry)) {
      await fs.appendFile(gitignorePath, `\n${entry}\n`);
      console.log(pc.green("✓ Added .arela/.last-report.json to .gitignore"));
    }
  } else {
    await fs.writeFile(gitignorePath, `${entry}\n`);
    console.log(pc.green("✓ Created .gitignore"));
  }
}

async function hasOllama(): Promise<boolean> {
  try {
    await execa("ollama", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function runRagIndex(cwd: string): Promise<void> {
  console.log(pc.cyan("Building semantic index..."));
  try {
    await execa("npx", ["arela", "index"], { cwd, stdio: "inherit" });
    console.log(pc.green("✓ Semantic index built"));
  } catch (error) {
    console.log(pc.yellow("⚠ Could not build semantic index"));
  }
}

async function gitAddAndCommit(cwd: string, message: string): Promise<void> {
  try {
    await execa("git", ["add", ".arela", ".husky", ".github", ".vscode", "package.json", ".gitignore"], { cwd });
    await execa("git", ["commit", "-m", message], { cwd });
    console.log(pc.green(`✓ Changes committed: ${message}`));
  } catch (error) {
    console.log(pc.yellow("⚠ Could not commit changes (may already be committed)"));
  }
}

async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message,
    initial: defaultValue,
  });
  return response.value ?? defaultValue;
}

export async function runSetup(opts: SetupOptions): Promise<void> {
  const { cwd, yes = false, nonInteractive = false, skipRag = false, skipCi = false, skipHooks = false } = opts;

  console.log(pc.bold(pc.cyan("\n🚀 Arela Setup Wizard\n")));

  // 1. Detect package manager
  const pm = await detectPackageManager(cwd);
  console.log(pc.dim(`Detected package manager: ${pm}`));

  // 2. Ensure git repo
  if (!(await isGitRepo(cwd))) {
    if (nonInteractive) {
      throw new Error("Not a git repository. Run 'git init' first or remove --non-interactive flag.");
    }
    
    const shouldInit = yes || (await confirm("Not a git repository. Initialize now?", true));
    if (!shouldInit) {
      throw new Error("Git repository required. Aborting.");
    }
    
    await initGitRepo(cwd);
  } else {
    console.log(pc.green("✓ Git repository detected"));
  }

  // 3. Install preset if missing
  if (!(await hasPresetInstalled(cwd))) {
    if (nonInteractive && !yes) {
      throw new Error("@newdara/preset-cto not installed. Install it first or use --yes flag.");
    }
    
    const shouldInstall = yes || (await confirm("Install @newdara/preset-cto?", true));
    if (!shouldInstall) {
      throw new Error("Preset required. Aborting.");
    }
    
    await installPreset(pm, cwd);
    await approveBuildsIfPnpm(pm, cwd);
  } else {
    console.log(pc.green("✓ Preset already installed"));
    await approveBuildsIfPnpm(pm, cwd);
  }

  // 4. Run arela init
  await runArelaInit(cwd);

  // 5. Setup Husky hooks (unless skipped)
  if (!skipHooks) {
    if (!(await hasHusky(cwd))) {
      await installHusky(pm, cwd);
    } else {
      console.log(pc.green("✓ Husky already installed"));
    }
    await writeHuskyHook(cwd);
  }

  // 6. Run harden (CI + VSCode settings)
  if (!skipCi) {
    console.log(pc.cyan("Running arela harden (CI + VSCode)..."));
    await hardenTask({ cwd });
    console.log(pc.green("✓ Guardrails installed"));
  }

  // 7. Ensure profile and rubric
  await ensureProfileAndRubric(cwd);

  // 8. Run doctor baseline
  await runDoctorBaseline(cwd);

  // 9. Update .gitignore
  await ensureGitignore(cwd);

  // 10. Optional RAG index
  if (!skipRag && (await hasOllama())) {
    const shouldIndex = yes || nonInteractive || (await confirm("Build semantic index now (requires Ollama)?", false));
    if (shouldIndex) {
      await runRagIndex(cwd);
    }
  }

  // 11. Commit changes
  await gitAddAndCommit(cwd, "chore(arela): setup rules, hooks, CI, baseline");

  console.log(pc.bold(pc.green("\n✅ Arela setup complete!\n")));
  console.log("Your repository now has:");
  console.log("  • Rules and workflows in .arela/");
  if (!skipHooks) console.log("  • Pre-commit hooks via Husky");
  if (!skipCi) console.log("  • GitHub Actions CI workflow");
  console.log("  • Baseline evaluation report");
  console.log("\nRun 'npx arela doctor --eval' anytime to check compliance.\n");
}
