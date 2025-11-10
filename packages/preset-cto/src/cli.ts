#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import fs from "fs-extra";
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
import { generateTicketsFromViolations } from "./auto-tickets.js";
import { runSetup } from "./setup.js";
import {
  loadTicketStatus,
  getStatusReport,
  resetTicket,
  resetAllTickets,
} from "./ticket-status.js";
import { orchestrate } from "./orchestrate.js";
import { globalConfig } from "./global-config.js";
import { SyncManager } from "./sync.js";
import {
  checkAutoIndex,
  installAutoIndexHook,
  showAutoIndexStatus,
} from "./auto-index.js";
import {
  showDiscoveredAgents,
  showRecommendedAgents,
} from "./agent-discovery.js";

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
  .option("--ide <name>", "IDE to configure: windsurf, cursor, claude, generic")
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
        ide: opts.ide,
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
  .option("--create-ide-rules", "Create IDE rule files (.windsurfrules, .cursorrules, etc.)", false)
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
      
      // Create IDE rules if requested
      if (opts.createIdeRules && !opts.dryRun) {
        const { createIDERules } = await import("./ide-setup.js");
        console.log(pc.cyan("\n📝 Creating IDE rules...\n"));
        await createIDERules(cwd);
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
  .command("sync-templates")
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
  .option("--check-structure", "Check project structure", false)
  .option("--fix", "Auto-fix structure issues", false)
  .option("--track", "Track compliance history", false)
  .option("--create-tickets", "Generate .arela/tickets/* from doctor violations", false)
  .option("--dry-run", "Preview ticket generation without writing files", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      // Structure validation
      if (opts.checkStructure || opts.fix) {
        const { checkStructure, fixStructure } = await import("./structure-validator.js");
        const issues = await checkStructure(cwd);
        
        if (issues.length === 0) {
          console.log(pc.green("✅ Project structure is valid"));
        } else {
          console.log(pc.bold(pc.yellow("\n⚠️  Structure Issues Found:\n")));
          for (const issue of issues) {
            const icon = issue.type === "error" ? "❌" : "⚠️ ";
            console.log(`${icon} ${issue.message}`);
            if (issue.fix) {
              console.log(pc.dim(`   Fix: ${issue.fix}`));
            }
          }
          
          if (opts.fix) {
            console.log(pc.cyan("\n🔧 Applying fixes...\n"));
            await fixStructure(cwd, issues);
            console.log(pc.green("\n✅ Structure fixed!"));
          } else {
            console.log(pc.dim("\nRun with --fix to auto-correct these issues"));
          }
        }
        
        if (!opts.eval) {
          return;
        }
      }
      
      const { rules, workflows, evalResult, violations } = await doctorTask({ cwd, evalMode: opts.eval });
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
        // Record violations to global learning system
        for (const err of rules.errors) {
          const ruleMatch = err.match(/Rule: ([\w-]+)/);
          if (ruleMatch) {
            await globalConfig.recordViolation(cwd, ruleMatch[1]);
          }
        }
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
      
      if (opts.createTickets) {
        if (!violations.length) {
          console.log(pc.green("\nNo violations detected. No tickets to create.\n"));
        } else {
          const tickets = await generateTicketsFromViolations({
            cwd,
            violations,
            dryRun: opts.dryRun,
          });

          if (tickets.length === 0) {
            console.log(pc.yellow("\nNo tickets generated (nothing actionable).\n"));
          } else {
            console.log(pc.bold(pc.cyan("\n🎫 Generated Tickets:\n")));
            for (const ticket of tickets) {
              console.log(
                `${ticket.id}: ${ticket.title} (${ticket.occurrences} occurrence${
                  ticket.occurrences === 1 ? "" : "s"
                })`,
              );
              console.log(`  Agent: ${ticket.agent}`);
              console.log(`  Priority: ${ticket.priority}`);
              console.log(`  Files: ${ticket.files.join(", ") || "n/a"}`);
              console.log("");
            }

            const summaryLine = tickets.length === 1 ? "ticket" : "tickets";
            if (opts.dryRun) {
              console.log(pc.yellow(`Previewed ${tickets.length} ${summaryLine}. No files written.`));
            } else {
              console.log(pc.green(`Created ${tickets.length} ${summaryLine} in .arela/tickets/`));
            }
          }
        }
      }

      // Track compliance history
      if (opts.track) {
        const { trackCompliance } = await import("./compliance-tracker.js");
        const snapshot = await trackCompliance(cwd);
        
        console.log(pc.cyan("\n📊 Compliance tracked"));
        console.log(pc.gray(`Score: ${snapshot.score}%`));
        console.log(pc.gray(`Violations: ${snapshot.violations}`));
        console.log(pc.gray(`Saved to: .arela/compliance-history.json\n`));
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

program
  .command("index")
  .description("Build semantic index for RAG (requires Ollama)")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--model <name>", "Ollama model to use", "nomic-embed-text")
  .option("--exclude <patterns...>", "Additional glob patterns to exclude")
  .option("--progress", "Show progress bar", false)
  .option("--parallel", "Use parallel indexing (slower, more memory)", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { buildIndex } = await import("./rag/index.js");
      
      console.log(pc.cyan("Building semantic index..."));
      console.log(pc.dim(`Model: ${opts.model}`));
      console.log(pc.dim(`Directory: ${cwd}`));
      console.log("");
      
      const stats = await buildIndex({
        cwd,
        model: opts.model,
        excludePatterns: opts.exclude || [],
        progress: opts.progress,
        parallel: opts.parallel,
      });
      
      console.log("");
      console.log(pc.green("✓ Index built successfully"));
      console.log(pc.dim(`  Files indexed: ${stats.filesIndexed}`));
      console.log(pc.dim(`  Total chunks: ${stats.totalChunks}`));
      console.log(pc.dim(`  Time: ${(stats.timeMs / 1000).toFixed(1)}s`));
      console.log("");
      console.log(pc.dim("Index saved to: .arela/.rag-index.json"));
      console.log(pc.dim("AI assistants can now search your codebase locally!"));
    } catch (error) {
      console.error(pc.red(`Index failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("serve")
  .description("Start RAG HTTP server for AI assistants")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--port <number>", "Port to listen on", "3456")
  .option("--model <name>", "Ollama model to use", "nomic-embed-text")
  .option("--auto-port", "Automatically find available port", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { startServer } = await import("./rag/server.js");
      
      const server = await startServer({
        cwd,
        port: parseInt(opts.port),
        model: opts.model,
        autoPort: opts.autoPort,
      });
      
      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        const { stopServer } = await import("./rag/server.js");
        await stopServer(server);
        process.exit(0);
      });
      
      process.on("SIGTERM", async () => {
        const { stopServer } = await import("./rag/server.js");
        await stopServer(server);
        process.exit(0);
      });
    } catch (error) {
      console.error(pc.red(`Server failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Removed duplicate search command - using RAG server version below

program
  .command("docs")
  .description("Show documentation links")
  .option("--open <guide>", "Open specific guide: getting-started, quickstart, setup, flow, dependencies")
  .action(async (opts) => {
    const packageRoot = path.dirname(new URL(import.meta.url).pathname);
    const docsPath = path.join(packageRoot, "..");
    
    console.log(pc.bold(pc.cyan("\n📖 Arela Documentation\n")));
    
    const docs = [
      { name: "Getting Started", file: "GETTING-STARTED.md", desc: "For non-technical users" },
      { name: "Quick Reference", file: "QUICKSTART.md", desc: "Command cheat sheet" },
      { name: "Setup Guide", file: "SETUP.md", desc: "Complete technical documentation" },
      { name: "Flow Diagram", file: "FLOW.md", desc: "Visual setup flow" },
      { name: "Dependencies", file: "DEPENDENCIES.md", desc: "Dependency reference" },
    ];
    
    for (const doc of docs) {
      const fullPath = path.join(docsPath, doc.file);
      console.log(pc.bold(doc.name));
      console.log(pc.dim(`  ${doc.desc}`));
      console.log(pc.dim(`  ${fullPath}`));
      console.log("");
    }
    
    console.log(pc.dim("View online: https://www.npmjs.com/package/@newdara/preset-cto"));
    console.log("");
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

// Old patterns command removed - replaced by v2.0.0 patterns command below

program
  .command("check-updates")
  .description("Check for package updates")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const syncManager = new SyncManager(cwd);
      const versionInfo = await syncManager.checkForUpdates();
      
      if (!versionInfo.hasUpdate) {
        console.log(pc.green(`✅ You're on the latest version: ${versionInfo.current}`));
        return;
      }
      
      console.log(pc.cyan(`\n📦 New version available: ${versionInfo.current} (current: ${versionInfo.previous})\n`));
      console.log("Run: npx arela sync");
    } catch (error) {
      console.error(pc.red(`Failed to check updates: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("sync")
  .description("Sync with latest package version and global patterns")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const syncManager = new SyncManager(cwd);
      await syncManager.syncAfterUpdate();
      await syncManager.syncGlobalPatterns();
      console.log(pc.green("\n✅ Sync complete!"));
    } catch (error) {
      console.error(pc.red(`Sync failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("export-patterns")
  .description("Export learned patterns to share with team")
  .option("--output <file>", "Output file", "arela-patterns.json")
  .action(async (opts) => {
    try {
      const data = await globalConfig.exportPatterns();
      const fs = await import("fs-extra");
      await fs.writeFile(opts.output, data, "utf-8");
      console.log(pc.green(`✅ Patterns exported to ${opts.output}`));
    } catch (error) {
      console.error(pc.red(`Export failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("import-patterns")
  .description("Import patterns from team")
  .requiredOption("--file <path>", "Patterns file to import")
  .action(async (opts) => {
    try {
      const fs = await import("fs-extra");
      const data = await fs.readFile(opts.file, "utf-8");
      await globalConfig.importPatterns(data);
      console.log(pc.green("✅ Patterns imported successfully"));
    } catch (error) {
      console.error(pc.red(`Import failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("projects")
  .description("List all projects using Arela")
  .action(async () => {
    try {
      const projects = await globalConfig.getAllProjects();
      
      if (projects.length === 0) {
        console.log(pc.gray("No projects registered yet"));
        return;
      }
      
      console.log(pc.bold(pc.cyan("\n📁 Your Arela Projects\n")));
      
      for (const project of projects) {
        console.log(pc.bold(project.name));
        console.log(`   Path: ${project.path}`);
        console.log(`   Version: ${project.packageVersion}`);
        console.log(`   Last sync: ${new Date(project.lastSync).toLocaleDateString()}`);
        
        const violationCount = Object.values(project.violations).reduce((a, b) => a + b, 0);
        if (violationCount > 0) {
          console.log(`   Violations: ${violationCount}`);
        }
        console.log("");
      }
    } catch (error) {
      console.error(pc.red(`Failed to list projects: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Ticket status command
program
// Old status command removed - replaced by v1.8.0 status command below

// Reset ticket command
program
  .command("reset-ticket <ticketId>")
  .description("Reset status for a specific ticket")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (ticketId, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await resetTicket(cwd, ticketId);
      console.log(pc.green(`✓ Reset ticket ${ticketId}`));
    } catch (error) {
      console.error(pc.red(`Failed to reset ticket: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Reset all tickets command
program
  .command("reset-all")
  .description("Reset status for all tickets")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--yes", "Skip confirmation", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      if (!opts.yes) {
        console.log(pc.yellow("⚠ This will reset status for ALL tickets."));
        console.log(pc.yellow("Run with --yes to confirm."));
        return;
      }
      
      await resetAllTickets(cwd);
      console.log(pc.green("✓ Reset all tickets"));
    } catch (error) {
      console.error(pc.red(`Failed to reset tickets: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// RAG search command
program
  .command("search <query>")
  .description("Semantic search via RAG server")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--top <n>", "Number of results to return", "10")
  .option("--type <ext>", "File extension filter (e.g., tsx, ts, md)")
  .option("--path <path>", "Path filter (e.g., src/api)")
  .option("--server <url>", "RAG server URL", "http://localhost:3456")
  .option("--json", "Output as JSON")
  .action(async (query, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      // Check if RAG server is running
      const healthUrl = `${opts.server}/health`;
      let isRunning = false;
      
      try {
        const response = await fetch(healthUrl);
        isRunning = response.ok;
      } catch {
        isRunning = false;
      }
      
      if (!isRunning) {
        console.log(pc.yellow("⚠ RAG server not running"));
        console.log(pc.gray("\nStart the server with:"));
        console.log(pc.cyan("  npx arela serve"));
        console.log(pc.gray("\nOr use grep for exact string matching:"));
        console.log(pc.cyan(`  grep -r "${query}" ${cwd}`));
        process.exitCode = 1;
        return;
      }
      
      // Build search URL
      const searchUrl = new URL(`${opts.server}/search`);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("top", opts.top);
      if (opts.type) searchUrl.searchParams.set("type", opts.type);
      if (opts.path) searchUrl.searchParams.set("path", opts.path);
      
      // Execute search
      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const results = await response.json();
      
      if (!results.results || results.results.length === 0) {
        if (opts.json) {
          console.log(JSON.stringify({ results: [] }, null, 2));
        } else {
          console.log(pc.yellow("No results found"));
        }
        return;
      }
      
      // JSON output
      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      // Pretty output
      console.log(pc.bold(pc.cyan(`\n🔍 Found ${results.results.length} results for "${query}"\n`)));
      
      for (const result of results.results) {
        console.log(pc.bold(result.file));
        console.log(pc.gray(`  Score: ${(result.score * 100).toFixed(1)}%`));
        console.log(pc.dim(`  ${result.chunk.substring(0, 150)}...`));
        console.log("");
      }
    } catch (error) {
      console.error(pc.red(`Search failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Orchestrate command
program
  .command("orchestrate")
  .description("Run all tickets with multi-agent orchestration")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--agent <agent>", "Run tickets for specific agent only")
  .option("--parallel", "Run tickets in parallel", false)
  .option("--force", "Re-run completed tickets", false)
  .option("--dry-run", "Show what would run without executing", false)
  .option("--max-parallel <n>", "Maximum parallel executions", "5")
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await orchestrate({
        cwd,
        agent: opts.agent,
        parallel: opts.parallel,
        force: opts.force,
        dryRun: opts.dryRun,
        maxParallel: parseInt(opts.maxParallel, 10),
      });
    } catch (error) {
      console.error(pc.red(`Orchestration failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Auto-index commands
program
  .command("check-auto-index")
  .description("Check if auto-indexing should trigger")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await checkAutoIndex(cwd);
    } catch (error) {
      console.error(pc.red(`Auto-index check failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("auto-index-status")
  .description("Show auto-indexing status and thresholds")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await showAutoIndexStatus(cwd);
    } catch (error) {
      console.error(pc.red(`Failed to show status: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// IDE setup command
program
  .command("ide-setup")
  .description("Setup IDE integration")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--ide <name>", "IDE to setup (windsurf, cursor, cline)")
  .option("--list", "List available IDEs", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { setupIDE, listIDEs } = await import("./ide-setup.js");
      
      if (opts.list) {
        listIDEs();
        return;
      }
      
      if (!opts.ide) {
        console.log(pc.yellow("Please specify an IDE with --ide"));
        console.log(pc.gray("\nAvailable IDEs: windsurf, cursor, cline"));
        console.log(pc.gray("Or use --list to see all options"));
        process.exitCode = 1;
        return;
      }
      
      await setupIDE(cwd, opts.ide);
    } catch (error) {
      console.error(pc.red(`Setup failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("install-auto-index")
  .description("Install post-commit hook for auto-indexing")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      await installAutoIndexHook(cwd);
    } catch (error) {
      console.error(pc.red(`Failed to install hook: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Compliance tracking commands (v1.9.0)
program
  .command("compliance")
  .description("Show compliance dashboard and trends")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { showComplianceDashboard } = await import("./compliance-tracker.js");
      
      await showComplianceDashboard(cwd);
    } catch (error) {
      console.error(pc.red(`Compliance dashboard failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("report")
  .description("Generate compliance report")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--format <type>", "Report format (markdown, json, html)", "markdown")
  .option("--output <file>", "Output file path")
  .option("--ci", "CI mode - exit with code 1 if compliance < 80%", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { generateComplianceReport, checkComplianceForCI } = await import("./compliance-tracker.js");
      
      if (opts.ci) {
        const result = await checkComplianceForCI(cwd, 80);
        
        console.log(pc.cyan("\n🔍 CI Compliance Check\n"));
        console.log(pc.gray(`Score: ${result.score}%`));
        console.log(pc.gray(`Violations: ${result.violations}`));
        console.log(pc.gray(`Threshold: 80%`));
        console.log("");
        
        if (result.passed) {
          console.log(pc.green("✅ Compliance check passed\n"));
          process.exitCode = 0;
        } else {
          console.log(pc.red("❌ Compliance check failed\n"));
          process.exitCode = 1;
        }
        
        return;
      }
      
      const report = await generateComplianceReport(cwd, opts.format as any);
      
      if (opts.output) {
        await fs.writeFile(opts.output, report, "utf-8");
        console.log(pc.green(`\n✓ Report saved to: ${opts.output}\n`));
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error(pc.red(`Report generation failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Pattern learning commands (v2.0.0)
program
  .command("patterns")
  .description("Manage pattern learning")
  .option("--explain", "Show pattern learning configuration", false)
  .option("--list", "List all patterns", false)
  .option("--filter <status>", "Filter by status (suggested, approved, enforced)")
  .option("--add", "Add a pattern manually", false)
  .option("--violation <text>", "Violation description")
  .option("--rule <text>", "Rule to enforce")
  .option("--severity <level>", "Severity (low, medium, high)")
  .option("--approve <id>", "Approve a pattern by ID")
  .option("--export <file>", "Export patterns for team sharing")
  .option("--import <file>", "Import patterns from team")
  .action(async (opts) => {
    try {
      const {
        showPatternConfig,
        listPatterns,
        addPattern,
        approvePattern,
        exportPatterns,
        importPatterns,
      } = await import("./patterns.js");
      
      if (opts.explain) {
        await showPatternConfig();
      } else if (opts.list || opts.filter) {
        await listPatterns(opts.filter as any);
      } else if (opts.add) {
        if (!opts.violation || !opts.rule || !opts.severity) {
          console.error(pc.red("Error: --violation, --rule, and --severity are required"));
          process.exitCode = 1;
          return;
        }
        await addPattern(opts.violation, opts.rule, opts.severity);
      } else if (opts.approve) {
        await approvePattern(opts.approve);
      } else if (opts.export) {
        await exportPatterns(opts.export);
      } else if (opts.import) {
        await importPatterns(opts.import);
      } else {
        // Default: show config
        await showPatternConfig();
      }
    } catch (error) {
      console.error(pc.red(`Patterns command failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Agent discovery commands
program
  .command("agents")
  .description("Discover available AI agents on your system")
  .option("--recommend", "Show recommended agents to install", false)
  .action(async (opts) => {
    try {
      if (opts.recommend) {
        await showRecommendedAgents();
      } else {
        await showDiscoveredAgents();
      }
    } catch (error) {
      console.error(pc.red(`Agent discovery failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

// Agent orchestration commands (v1.8.0)
program
  .command("dispatch")
  .description("Dispatch tickets to AI agents")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--agent <name>", "Agent to dispatch to (codex, claude, deepseek, etc.)")
  .option("--tickets <ids...>", "Ticket IDs to dispatch (e.g., CODEX-001 CODEX-002)")
  .option("--auto", "Auto-select best agent based on complexity", false)
  .option("--dry-run", "Preview dispatch without saving", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { dispatchTickets } = await import("./dispatch.js");
      
      await dispatchTickets({
        cwd,
        agent: opts.agent,
        tickets: opts.tickets,
        auto: opts.auto,
        dryRun: opts.dryRun,
      });
    } catch (error) {
      console.error(pc.red(`Dispatch failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("status")
  .description("Show agent and ticket status")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--agent <name>", "Filter by agent")
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { showAgentStatus } = await import("./dispatch.js");
      
      await showAgentStatus(cwd, opts.agent);
    } catch (error) {
      console.error(pc.red(`Status failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("tickets")
  .description("Manage and visualize tickets")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--graph", "Show dependency graph", false)
  .option("--next", "Show next available tickets", false)
  .option("--stats", "Show ticket statistics", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { showDependencyGraph, showNextTickets, showTicketStats } = await import("./tickets.js");

      if (opts.graph) {
        await showDependencyGraph(cwd);
      } else if (opts.next) {
        await showNextTickets(cwd);
      } else if (opts.stats) {
        await showTicketStats(cwd);
      } else {
        // Default: show stats
        await showTicketStats(cwd);
      }
    } catch (error) {
      console.error(pc.red(`Tickets command failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

program
  .command("migrate")
  .description("Migrate tickets between formats (MD ↔ YAML)")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--to <format>", "Target format: yaml or markdown", "yaml")
  .option("--dry-run", "Preview changes without writing", false)
  .option("--verbose", "Show detailed output", false)
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const format = opts.to?.toLowerCase();

      if (!["yaml", "markdown"].includes(format)) {
        console.error(pc.red(`Invalid format: ${format} (must be 'yaml' or 'markdown')`));
        process.exitCode = 1;
        return;
      }

      const { migrateTicketsToYaml, migrateTicketsToMarkdown } = await import("./ticket-migrator.js");

      let result;

      if (format === "yaml") {
        result = await migrateTicketsToYaml(cwd, {
          dryRun: opts.dryRun,
          verbose: opts.verbose,
        });
      } else {
        result = await migrateTicketsToMarkdown(cwd, {
          dryRun: opts.dryRun,
          verbose: opts.verbose,
        });
      }

      // Show summary
      console.log(pc.bold(pc.cyan("\n📊 Migration Summary\n")));
      console.log(pc.green(`✓ Converted: ${result.converted}`));
      console.log(pc.gray(`⊘ Skipped: ${result.skipped}`));

      if (result.errors.length > 0) {
        console.log(pc.red(`✗ Errors: ${result.errors.length}`));
        for (const error of result.errors) {
          console.log(pc.red(`  ${error.ticket}: ${error.error}`));
        }
        process.exitCode = 1;
      }

      if (opts.dryRun) {
        console.log(pc.yellow("\n⚠️  Dry run - no files were written"));
      } else if (result.converted > 0) {
        console.log(pc.green(`\nMigration complete!`));
      }

      console.log("");
    } catch (error) {
      console.error(pc.red(`Migration failed: ${(error as Error).message}`));
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
