#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import pc from "picocolors";
import pkg from "../package.json" with { type: "json" };
import {
  init,
  sync,
  upgrade,
  doctor as doctorTask,
  harden as hardenTask,
  importResearchSummaries,
  getBootstrapBundle,
  installAgentAssets,
  ensureRulesPresent,
  autoMaterializeOnPostinstall,
} from "./loaders.js";
import type { AgentType, BootstrapBundle } from "./loaders.js";
import { runSetup } from "./setup.js";

const program = new Command();
const version: string = (pkg as { version?: string }).version ?? "0.0.0";

function resolveCommandCwd(cwd?: string): string {
  return cwd ? path.resolve(cwd) : process.cwd();
}

function logSummary(label: string, items: string[]): void {
  if (items.length === 0) return;
  console.log(`${pc.cyan(label)} ${items.length}`);
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

async function maybeHandlePostinstallAutoInit(): Promise<boolean> {
  if (process.argv.length > 2 && process.argv[2] !== "init") {
    return false;
  }
  return autoMaterializeOnPostinstall();
}

function printPostInitGuide(): void {
  console.log("\nInstalled Arela rules in .arela/");
  console.log("Next:");
  console.log("1) npx arela agent bootstrap   # copy this into your agent's system prompt");
  console.log("2) npx arela harden            # add CI + pre-commit guardrails");
  console.log("3) npx arela doctor            # verify");
}

program.name("arela").description("Opinionated Arela preset CLI").version(version);

program
  .command("setup")
  .description("Interactive bootstrap: init → husky → CI → baseline → optional RAG")
  .option("--yes", "Accept sensible defaults without prompts", false)
  .option("--non-interactive", "No prompts, fail on missing deps (for CI)", false)
  .option("--skip-rag", "Don't build semantic index", false)
  .option("--skip-ci", "Don't write GitHub Action", false)
  .option("--skip-hooks", "Don't touch Husky", false)
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await runSetup({
        cwd,
        yes: opts.yes,
        nonInteractive: opts.nonInteractive,
        skipRag: opts.skipRag,
        skipCi: opts.skipCi,
        skipHooks: opts.skipHooks,
      });
    } catch (error) {
      console.error(pc.red(`Setup failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("init")
  .description("Create a project .arela folder from preset templates")
  .option("--from <osJsonPath>", "Optional OS export JSON path")
  .option("--dry-run", "Preview actions without writing", false)
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const result = await init({ cwd, from: opts.from, dryRun: opts.dryRun });
      logSummary("Created", result.createdDirs.map((dir) => path.relative(cwd, dir) || "."));
      logSummary("Templates copied", result.templateSummary.written);
      logSummary("Templates staged", result.templateSummary.staged);
      logSummary("Templates skipped", result.templateSummary.skipped);
      logSummary("Generated rules", result.generatedRules);
      if (result.templateSummary.identical.length) {
        console.log(pc.dim(`Up-to-date: ${result.templateSummary.identical.length}`));
      }
      if (opts.dryRun) {
        console.log(pc.yellow("Dry run complete – no files were written."));
      } else {
        await ensureRulesPresent({ cwd });
        console.log(pc.green("Arela init complete."));
        printPostInitGuide();
      }
    } catch (error) {
      console.error(pc.red(`Init failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("sync")
  .description("Copy preset changes into the local .arela folder")
  .option("--force", "Overwrite conflicting files instead of writing *.new", false)
  .option("--dry-run", "Preview actions without writing", false)
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const summary = await sync({ cwd, force: opts.force, dryRun: opts.dryRun });
      logSummary("Templates copied", summary.written);
      logSummary("Templates staged", summary.staged);
      logSummary("Templates skipped", summary.skipped);
      if (summary.identical.length) {
        console.log(pc.dim(`Up-to-date: ${summary.identical.length}`));
      }
      if (summary.conflicts.length) {
        console.log(pc.yellow(`Conflicts ${summary.conflicts.length} (wrote *.new)`));
      }
      if (opts.dryRun) {
        console.log(pc.yellow("Dry run complete – no files were written."));
      } else {
        console.log(pc.green("Sync complete."));
      }
    } catch (error) {
      console.error(pc.red(`Sync failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("upgrade")
  .description("Run a three-way merge between preset and local files")
  .option("--dry-run", "Preview merge without writing", false)
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const result = await upgrade({ cwd, dryRun: opts.dryRun });
      if (result.conflicts.length) {
        console.log(pc.yellow(`Conflicts ${result.conflicts.length} (wrote *.new)`));
      }
      if (result.conflicts.length) {
        console.error(pc.red("Upgrade aborted due to conflicts:"));
        for (const conflict of result.conflicts) {
          console.error(`  • ${conflict}`);
        }
        process.exitCode = 1;
        return;
      }
      logSummary("Templates upgraded", result.updated);
      if (opts.dryRun) {
        console.log(pc.yellow("Dry run complete – no files were written."));
      } else {
        console.log(pc.green("Upgrade complete."));
      }
    } catch (error) {
      console.error(pc.red(`Upgrade failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("doctor")
  .description("Validate .arela rules and workflows")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--eval", "Validate evaluation rubric and latest report", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { rules, workflows, evalResult } = await doctorTask({ cwd, evalMode: opts.eval });
      if (rules.errors.length === 0) {
        console.log(pc.green(`Rules OK (${rules.items.length})`));
      } else {
        console.error(pc.red("Rule issues:"));
        for (const err of rules.errors) {
          console.error(`  • ${err}`);
        }
      }

      if (workflows.errors.length === 0) {
        console.log(pc.green(`Workflows OK (${workflows.items.length})`));
      } else {
        console.error(pc.red("Workflow issues:"));
        for (const err of workflows.errors) {
          console.error(`  • ${err}`);
        }
      }

      if (rules.errors.length || workflows.errors.length) {
        process.exitCode = 1;
      } else {
        console.log(pc.green("Doctor passed."));
      }

      if (opts.eval) {
        if (!evalResult) {
          console.log(pc.yellow("Evaluation skipped: unable to load rubric/report."));
        } else if (evalResult.status === "skipped") {
          console.log(pc.yellow(evalResult.message ?? "Evaluation skipped."));
        } else if (evalResult.status === "failed") {
          console.error(pc.red("Evaluation rubric failed:"));
          if (evalResult.failingCategories?.length) {
            for (const failure of evalResult.failingCategories) {
              console.error(`  • ${failure.name}: ${failure.score.toFixed(2)}`);
            }
          }
          if (evalResult.thresholds) {
            console.error(
              `  Avg ${evalResult.average?.toFixed(2) ?? "N/A"} (threshold ${evalResult.thresholds.avgPass})`,
            );
          }
          process.exitCode = 1;
        } else {
          console.log(
            pc.green(
              `Evaluation passed. Avg ${evalResult.average?.toFixed(2) ?? "N/A"} (min ${
                evalResult.thresholds?.minPass ?? "?"
              }, avg ${evalResult.thresholds?.avgPass ?? "?"})`,
            ),
          );
        }
      }
    } catch (error) {
      console.error(pc.red(`Doctor failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("harden")
  .description("Install Arela guardrails in the target repository")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const summary = await hardenTask({ cwd });
      logSummary("Files written", summary.written);
      logSummary("Files staged", summary.staged);
      logSummary("Files identical", summary.identical);
      console.log(pc.green(`Husky hook: ${summary.husky}`));
      console.log(pc.green("Harden complete."));
    } catch (error) {
      console.error(pc.red(`Harden failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

const researchCommand = program.command("research").description("Research utilities");

researchCommand
  .command("import <dir>")
  .description("Convert .md research summaries into Arela rules")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (dir, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const result = await importResearchSummaries({ cwd, sourceDir: dir });
      logSummary(
        "Imported research",
        result.imported.map((entry) => `${entry.id} ← ${entry.source}`),
      );
      if (result.skipped.length) {
        logSummary("Skipped", result.skipped);
      }
      console.log(pc.green(`Research index updated: ${result.indexPath}`));
    } catch (error) {
      console.error(pc.red(`Research import failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

const agentCommand = program.command("agent").description("Agent bootstrap operations");

agentCommand
  .command("bootstrap")
  .description("Print the universal Arela bootstrap prompt")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--json", "Output JSON payload", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const bundle = await getBootstrapBundle({ cwd });
      if (opts.json) {
        console.log(JSON.stringify({ prompt: bundle.prompt, files: bundle.files }, null, 2));
      } else {
        console.log(bundle.prompt);
        if (bundle.files.length) {
          console.log("\nFiles:");
          for (const file of bundle.files) {
            console.log(`- ${file}`);
          }
        }
      }
    } catch (error) {
      console.error(pc.red(`Bootstrap failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

agentCommand
  .command("install")
  .description("Install bootstrap prompt for a specific agent")
  .requiredOption("--agent <name>", "cursor|windsurf|claude|generic")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    const agent = String(opts.agent ?? "").toLowerCase() as AgentType;
    if (!["cursor", "windsurf", "claude", "generic"].includes(agent)) {
      console.error(pc.red("Unsupported agent. Use cursor, windsurf, claude, or generic."));
      process.exitCode = 1;
      return;
    }
    try {
      const bundle = await getBootstrapBundle({ cwd });
      if (agent === "claude") {
        console.log(bundle.prompt);
        return;
      }
      if (agent === "generic") {
        console.log(bundle.prompt);
        if (bundle.files.length) {
          console.log("\nFiles:");
          for (const file of bundle.files) {
            console.log(`- ${file}`);
          }
        }
        return;
      }
      const installResult = await installAgentAssets({ cwd, agent, prompt: bundle.prompt, files: bundle.files });
      logSummary("Files written", installResult.written);
      logSummary("Files staged", installResult.staged);
      logSummary("Files identical", installResult.identical);
      console.log(pc.green(`Agent assets ready for ${agent}.`));
    } catch (error) {
      console.error(pc.red(`Agent install failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

async function run(): Promise<void> {
  if (await maybeHandlePostinstallAutoInit()) {
    return;
  }
  await program.parseAsync(process.argv);
}

run().catch((error) => {
  console.error(pc.red((error as Error).message));
  process.exit(1);
});
