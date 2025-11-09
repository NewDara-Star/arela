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
  ide?: string;
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
  const entries = [
    ".arela/.last-report.json",
    ".arela/.rag-index.json",
  ];
  
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, "utf-8");
    const toAdd = entries.filter(entry => !content.includes(entry));
    
    if (toAdd.length > 0) {
      await fs.appendFile(gitignorePath, `\n${toAdd.join("\n")}\n`);
      console.log(pc.green(`✓ Updated .gitignore`));
    }
  } else {
    await fs.writeFile(gitignorePath, `${entries.join("\n")}\n`);
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

async function getOllamaModels(): Promise<string[]> {
  try {
    const result = await execa("ollama", ["list"]);
    const lines = result.stdout.split("\n").slice(1); // Skip header
    return lines
      .filter((line) => line.trim())
      .map((line) => line.split(/\s+/)[0]); // Get model name
  } catch {
    return [];
  }
}

async function hasEmbeddingModel(): Promise<{ has: boolean; model?: string }> {
  const models = await getOllamaModels();
  
  // Preferred lightweight embedding models in order
  const preferredModels = [
    "nomic-embed-text",
    "mxbai-embed-large",
    "all-minilm",
  ];
  
  for (const preferred of preferredModels) {
    const found = models.find((m) => m.includes(preferred));
    if (found) {
      return { has: true, model: found };
    }
  }
  
  return { has: false };
}

async function installOllama(): Promise<boolean> {
  console.log(pc.cyan("Installing Ollama..."));
  console.log(pc.dim("Visit https://ollama.com to download and install"));
  console.log(pc.yellow("⚠ Ollama installation requires manual download"));
  console.log(pc.dim("After installing, run: ollama pull nomic-embed-text"));
  return false;
}

async function pullEmbeddingModel(model = "nomic-embed-text"): Promise<boolean> {
  try {
    console.log(pc.cyan(`Pulling ${model} model...`));
    console.log(pc.dim("This may take a few minutes..."));
    await execa("ollama", ["pull", model], { stdio: "inherit" });
    console.log(pc.green(`✓ ${model} model installed`));
    return true;
  } catch (error) {
    console.log(pc.red(`✗ Failed to pull ${model} model`));
    return false;
  }
}

async function runRagIndex(cwd: string, model?: string): Promise<void> {
  try {
    const args = ["arela", "index", "--cwd", cwd];
    if (model) {
      args.push("--model", model);
    }
    
    await execa("npx", args, { cwd, stdio: "inherit" });
    console.log(pc.green("✓ Semantic index built"));
    console.log(pc.dim("  Your codebase is now searchable via local Ollama!"));
  } catch (error) {
    console.log(pc.yellow("⚠ Could not build semantic index"));
    console.log(pc.dim("  Run 'npx arela index' manually when ready"));
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

async function selectIDE(): Promise<string | null> {
  const response = await prompts({
    type: "select",
    name: "ide",
    message: "Which IDE/editor are you using?",
    choices: [
      { title: "Windsurf", value: "windsurf" },
      { title: "Cursor", value: "cursor" },
      { title: "VS Code", value: "generic" },
      { title: "Claude Desktop", value: "claude" },
      { title: "Other / Skip", value: "skip" },
    ],
    initial: 0,
  });
  return response.ide === "skip" ? null : response.ide;
}

async function installAgentRules(cwd: string, agent: string): Promise<void> {
  try {
    console.log(pc.cyan(`Installing Arela rules for ${agent}...`));
    const { installAgentAssets, getBootstrapBundle } = await import("./loaders.js");
    
    const bundle = await getBootstrapBundle({ cwd });
    
    if (agent === "claude" || agent === "generic") {
      console.log(pc.dim("\nCopy this prompt to your AI assistant:"));
      console.log(pc.dim("─".repeat(50)));
      console.log(bundle.prompt);
      console.log(pc.dim("─".repeat(50)));
    } else {
      await installAgentAssets({ cwd, agent: agent as any, prompt: bundle.prompt, files: bundle.files });
      console.log(pc.green(`✓ ${agent} configured with Arela rules`));
    }
  } catch (error) {
    console.log(pc.yellow(`⚠ Could not install agent rules: ${(error as Error).message}`));
  }
}

async function checkPrerequisites(): Promise<{ node: boolean; git: boolean }> {
  let nodeOk = false;
  let gitOk = false;

  // Check Node.js version
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0]);
    nodeOk = major >= 18;
    if (!nodeOk) {
      console.log(pc.red(`✗ Node.js ${nodeVersion} detected. Requires >= 18`));
    }
  } catch {
    console.log(pc.red("✗ Node.js not found"));
  }

  // Check Git
  try {
    await execa("git", ["--version"]);
    gitOk = true;
  } catch {
    console.log(pc.red("✗ Git not found"));
  }

  return { node: nodeOk, git: gitOk };
}

export async function runSetup(opts: SetupOptions): Promise<void> {
  const { cwd, yes = false, nonInteractive = false, skipRag = false, skipCi = false, skipHooks = false } = opts;

  console.log(pc.bold(pc.cyan("\n🚀 Arela Setup Wizard\n")));

  // 0. Check prerequisites
  const prereqs = await checkPrerequisites();
  if (!prereqs.node) {
    console.log(pc.red("\n❌ Node.js >= 18 is required"));
    console.log(pc.dim("Install from: https://nodejs.org"));
    throw new Error("Node.js >= 18 required");
  }
  if (!prereqs.git) {
    console.log(pc.yellow("\n⚠ Git not found"));
    console.log(pc.dim("Install from: https://git-scm.com"));
    if (nonInteractive) {
      throw new Error("Git required");
    }
  }

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
  if (!skipRag) {
    const ollamaInstalled = await hasOllama();
    
    if (!ollamaInstalled) {
      // Ollama not installed
      if (nonInteractive) {
        console.log(pc.yellow("⚠ Ollama not installed, skipping RAG indexing"));
      } else {
        const shouldInstall = yes || (await confirm("Ollama not found. Would you like to install it for RAG indexing?", false));
        if (shouldInstall) {
          await installOllama();
          console.log(pc.dim("Run setup again after installing Ollama to enable RAG"));
        }
      }
    } else {
      // Ollama installed, check for embedding model
      const { has: hasModel, model } = await hasEmbeddingModel();
      
      if (!hasModel) {
        // No embedding model found
        if (nonInteractive) {
          console.log(pc.yellow("⚠ No embedding model found, skipping RAG indexing"));
        } else {
          const shouldPull = yes || (await confirm("No embedding model found. Pull nomic-embed-text (~274MB)?", false));
          if (shouldPull) {
            const pulled = await pullEmbeddingModel("nomic-embed-text");
            if (pulled) {
              await runRagIndex(cwd, "nomic-embed-text");
            }
          }
        }
      } else {
        // Model found, run indexing
        console.log(pc.dim(`Using embedding model: ${model}`));
        const shouldIndex = yes || nonInteractive || (await confirm("Build semantic index now?", false));
        if (shouldIndex) {
          await runRagIndex(cwd, model);
        }
      }
    }
  }

  // 11. Commit changes
  await gitAddAndCommit(cwd, "chore(arela): setup rules, hooks, CI, baseline");

  // 12. IDE configuration
  if (!nonInteractive && !opts.ide) {
    console.log("");
    const ide = await selectIDE();
    if (ide) {
      await installAgentRules(cwd, ide);
    }
  } else if (opts.ide) {
    await installAgentRules(cwd, opts.ide);
  }

  console.log(pc.bold(pc.green("\n✅ Arela setup complete!\n")));
  console.log("Your repository now has:");
  console.log("  • Rules and workflows in .arela/");
  if (!skipHooks) console.log("  • Pre-commit hooks via Husky");
  if (!skipCi) console.log("  • GitHub Actions CI workflow");
  console.log("  • Baseline evaluation report");
  console.log("\nRun 'npx arela doctor --eval' anytime to check compliance.");
  console.log(pc.dim("\n📖 Documentation:"));
  console.log(pc.dim("  • Getting Started: node_modules/@newdara/preset-cto/GETTING-STARTED.md"));
  console.log(pc.dim("  • Quick Reference: node_modules/@newdara/preset-cto/QUICKSTART.md"));
  console.log(pc.dim("  • Full Setup Guide: node_modules/@newdara/preset-cto/SETUP.md"));
  console.log(pc.dim("  • RAG Guide: node_modules/@newdara/preset-cto/RAG.md"));
  console.log("");
  
  if (!skipRag) {
    console.log(pc.dim("💡 Start RAG server: npx arela serve"));
    console.log(pc.dim("   Your IDE can then query: http://localhost:3456/search"));
    console.log("");
  }
}
