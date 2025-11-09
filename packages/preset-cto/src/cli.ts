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
      const { rules, workflows, evalResult, issues } = await doctorTask({ cwd, evalMode: opts.eval });
      
      // Check for configuration issues
      if (issues && issues.length > 0) {
        console.error(pc.yellow("Configuration issues:"));
        for (const issue of issues) {
          console.error(`  • ${issue}`);
        }
      }
      
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

agentCommand
  .command("env")
  .description("Export profile and answers as base64 env vars")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { loadProfile, loadAnswers } = await import("./loaders.js");
      const profile = loadProfile(cwd);
      const answers = loadAnswers(cwd);
      
      const profileB64 = Buffer.from(JSON.stringify(profile), "utf8").toString("base64");
      const answersB64 = Buffer.from(JSON.stringify(answers), "utf8").toString("base64");
      
      console.log(`export ARELA_PROFILE_B64='${profileB64}'`);
      console.log(`export ARELA_ANSWERS_B64='${answersB64}'`);
    } catch (error) {
      console.error(pc.red(`Agent env failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Agent orchestration commands
const agentsCommand = program.command("agents").description("Agent orchestration");

agentsCommand
  .command("scan")
  .description("Discover available agents")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { scanAgents } = await import("./agents/commands.js");
      await scanAgents(cwd);
    } catch (error) {
      console.error(pc.red(`Scan failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

agentsCommand
  .command("grant")
  .description("Configure agent permissions")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { grantAgents } = await import("./agents/commands.js");
      await grantAgents(cwd);
    } catch (error) {
      console.error(pc.red(`Grant failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

agentsCommand
  .command("list")
  .description("List all agents and their status")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { listAgents } = await import("./agents/commands.js");
      await listAgents(cwd);
    } catch (error) {
      console.error(pc.red(`List failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("plan <request>")
  .description("Create a ticket from natural language")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (request, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { planTicket } = await import("./agents/commands.js");
      await planTicket(cwd, request);
    } catch (error) {
      console.error(pc.red(`Plan failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("assign <ticketId>")
  .description("Assign a ticket to an agent")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (ticketId, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { assignTicket } = await import("./agents/commands.js");
      await assignTicket(cwd, ticketId);
    } catch (error) {
      console.error(pc.red(`Assign failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("run <ticketId>")
  .description("Execute a ticket")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--dry-run", "Preview without applying changes", false)
  .action(async (ticketId, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { runTicket } = await import("./agents/commands.js");
      await runTicket(cwd, ticketId, { dryRun: opts.dryRun });
    } catch (error) {
      console.error(pc.red(`Run failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

const runsCommand = program.command("runs").description("Manage runs");

runsCommand
  .command("ls")
  .description("List all runs")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { listAllRuns } = await import("./agents/commands.js");
      await listAllRuns(cwd);
    } catch (error) {
      console.error(pc.red(`List runs failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

const ticketsCommand = program.command("tickets").description("Manage tickets");

ticketsCommand
  .command("ls")
  .description("List all tickets")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { listAllTickets } = await import("./agents/commands.js");
      await listAllTickets(cwd);
    } catch (error) {
      console.error(pc.red(`List tickets failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Configure command
program
  .command("configure")
  .description("Interactive configuration wizard")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--reset", "Clear saved answers and reconfigure", false)
  .option("--only <topics>", "Only ask questions for specific topics (comma-separated)")
  .option("--noninteractive", "Fail if missing keys (for CI)", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { configure } = await import("./configure/index.js");
      const only = opts.only ? opts.only.split(",") : undefined;
      await configure(cwd, {
        reset: opts.reset,
        only,
        noninteractive: opts.noninteractive,
      });
    } catch (error) {
      console.error(pc.red(`Configure failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("explain <findingId>")
  .description("Explain a finding and its assumptions")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (findingId, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { loadReport } = await import("./dropin/audit/runner.js");
      const { loadAssumptions } = await import("./configure/assumptions.js");
      
      const report = await loadReport(cwd);
      const assumptions = await loadAssumptions(cwd);
      
      if (!report) {
        console.log(pc.yellow("No audit report found. Run 'arela audit' first."));
        return;
      }
      
      const finding = report.findings.find(f => f.id === findingId);
      
      if (!finding) {
        console.log(pc.red(`Finding not found: ${findingId}`));
        return;
      }
      
      console.log(pc.bold(`\n${finding.id}\n`));
      console.log(pc.dim(`Category: ${finding.category}`));
      console.log(pc.dim(`Severity: ${finding.severity}\n`));
      console.log(pc.bold("Why:"));
      console.log(`  ${finding.why}\n`);
      console.log(pc.bold("Evidence:"));
      for (const ev of finding.evidence) {
        console.log(pc.dim(`  - ${ev}`));
      }
      console.log();
      console.log(pc.bold("Fix:"));
      console.log(`  ${finding.fix}\n`);
      
      // Show related assumptions
      const related = Object.values(assumptions).filter(a =>
        a.id.startsWith(finding.category)
      );
      
      if (related.length > 0) {
        console.log(pc.bold("Related Assumptions:"));
        for (const a of related) {
          const icon = a.status === "confirmed" ? "✓" : "?";
          console.log(pc.dim(`  ${icon} ${a.assumption} (${a.status}, confidence: ${a.confidence})`));
        }
      }
    } catch (error) {
      console.error(pc.red(`Explain failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Drop-in Arela commands
program
  .command("index")
  .description("Build semantic index")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--clean", "Rebuild from scratch", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { indexRepo } = await import("./dropin/rag/indexer.js");
      await indexRepo({ cwd, clean: opts.clean });
    } catch (err) {
      console.error(pc.red(`Index failed: ${(err as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("search <query>")
  .description("Semantic search over codebase")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--k <n>", "Number of results", "10")
  .action(async (query, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { printSearchResults } = await import("./dropin/rag/search.js");
      await printSearchResults(cwd, query, parseInt(opts.k));
    } catch (err) {
      console.error(pc.red(`Search failed: ${(err as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("product")
  .description("Extract product understanding")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { extractProductProfile, saveProductProfile } = await import("./dropin/product/understand.js");
      const profile = await extractProductProfile(cwd);
      await saveProductProfile(cwd, profile);
      console.log(pc.bold("\n📦 Product Profile\n"));
      console.log(pc.dim(`Name: ${profile.name}`));
      if (profile.domain) console.log(pc.dim(`Domain: ${profile.domain}`));
      console.log(pc.dim(`Targets: ${profile.targets.join(", ") || "none"}`));
      console.log(pc.dim(`Auth: ${profile.auth.join(", ") || "none"}`));
      console.log(pc.dim(`Databases: ${profile.db.join(", ") || "none"}`));
      console.log(pc.dim(`Services: ${profile.services.join(", ") || "none"}`));
      if (profile.assumptions.length) {
        console.log(pc.yellow(`\nAssumptions:`));
        for (const a of profile.assumptions) console.log(pc.dim(`  - ${a}`));
      }
      if (profile.risks.length) {
        console.log(pc.red(`\nRisks:`));
        for (const r of profile.risks) console.log(pc.dim(`  - ${r}`));
      }
      console.log(pc.dim(`\nSaved to .arela/product.json`));
    } catch (err) {
      console.error(pc.red(`Product extraction failed: ${(err as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("graph")
  .description("Build and display repo topology")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { buildRepoGraph, saveGraph } = await import("./dropin/graph/builder.js");
      const graph = await buildRepoGraph(cwd);
      await saveGraph(cwd, graph);
      
      if (opts.json) {
        console.log(JSON.stringify(graph, null, 2));
      } else {
        console.log(pc.bold("\n📊 Repo Graph\n"));
        console.log(pc.dim(`Root: ${graph.root}`));
        console.log(pc.dim(`Nodes: ${graph.nodes.length}`));
        console.log(pc.dim(`Edges: ${graph.edges.length}\n`));
        
        for (const node of graph.nodes) {
          console.log(`${node.type === "repo" ? "📦" : "⚙️"}  ${node.name} (${node.type})`);
        }
        
        console.log(pc.dim(`\nSaved to .arela/graph.json`));
      }
    } catch (error) {
      console.error(pc.red(`Graph failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("audit")
  .description("Run opinionated quality checks")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { runAudit } = await import("./dropin/audit/runner.js");
      await runAudit(cwd);
    } catch (error) {
      console.error(pc.red(`Audit failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("advise")
  .description("Generate fix recommendations")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { generateAdvisory } = await import("./dropin/advisor/generator.js");
      const advisory = await generateAdvisory(cwd);
      
      if (opts.json) {
        console.log(JSON.stringify(advisory, null, 2));
      } else {
        console.log("\n" + advisory.summary);
      }
    } catch (error) {
      console.error(pc.red(`Advise failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("fix")
  .description("Apply a specific fix")
  .requiredOption("--id <findingId>", "Finding ID to fix")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--dry-run", "Show diff without applying", false)
  .option("--pr", "Create pull request", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { generateAdvisory } = await import("./dropin/advisor/generator.js");
      const { applyPatchWithGit } = await import("./dropin/advisor/apply.js");
      const advisory = await generateAdvisory(cwd);
      const patch = advisory.patches.find(p => p.findingId === opts.id);
      if (!patch) return void console.log(pc.red(`No auto-fix available for ${opts.id}`));
      console.log(pc.cyan(`Applying fix for ${opts.id}...\n`), pc.dim(patch.description), "\n");
      const result = await applyPatchWithGit(cwd, opts.id, patch.diff, { dryRun: opts.dryRun, createPR: opts.pr });
      if (!result.success) {
        console.error(pc.red(`Failed: ${result.error}`));
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(pc.red(`Fix failed: ${(err as Error).message}`));
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
