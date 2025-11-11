#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { discoverAgents } from "./agents/discovery.js";
import { orchestrate } from "./agents/orchestrate.js";
import { getAgentCapabilities } from "./agents/dispatch.js";
import { showStatus } from "./agents/status.js";
import { initProject } from "./persona/loader.js";

const program = new Command();

program
  .name("arela")
  .description("🎯 Your AI CTO with multi-agent orchestration")
  .version("3.1.1");

/**
 * arela agents - List discovered agents
 */
program
  .command("agents")
  .description("Discover and list available AI agents")
  .option("--verbose", "Show detailed information", false)
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🤖 Meeting your AI agents...\n")));

    const agents = await discoverAgents();
    const capabilities = getAgentCapabilities();

    if (agents.length === 0) {
      console.log(pc.yellow("😴 No agents discovered. Let's fix that!"));
      console.log(pc.gray("\nYou'll need at least one of these awesome tools:"));
      console.log(pc.gray("  - 🧠 Codex CLI (npm install -g @openai/codex)"));
      console.log(pc.gray("  - 🎨 Claude CLI (npm install -g @anthropic-ai/claude)"));
      console.log(pc.gray("  - 🔮 Ollama (https://ollama.ai)"));
      console.log("");
      return;
    }

    console.log(pc.bold(`Your AI team is assembled! (${agents.length} agents ready)\n`));

    for (const agent of agents) {
      const icon = agent.available ? "✅" : "❌";
      const status = agent.available ? pc.green("Ready to rock!") : pc.red("Taking a nap");
      
      console.log(`${icon} ${pc.bold(agent.name)} - ${status}`);
      
      if (opts.verbose) {
        console.log(pc.gray(`   Command: ${agent.command}`));
        console.log(pc.gray(`   Type: ${agent.type}`));
        if (agent.version) {
          console.log(pc.gray(`   Version: ${agent.version}`));
        }
        
        // Show capabilities if we have them
        const agentKey = agent.command as keyof typeof capabilities;
        const capability = capabilities[agentKey];
        if (capability) {
          console.log(pc.gray(`   💰 Cost: $${capability.costPer1kTokens}/1k tokens`));
          console.log(pc.gray(`   🎯 Best for: ${capability.bestFor.join(", ")}`));
        }
        console.log("");
      }
    }

    if (!opts.verbose) {
      console.log(pc.gray("\n🔍 Run with --verbose to see their superpowers\n"));
    }
  });

/**
 * arela init - Initialize project
 */
program
  .command("init")
  .description("Initialize Arela in current project")
  .option("--cwd <dir>", "Directory to initialize", process.cwd())
  .option("--preset <type>", "Rule preset: startup, enterprise, solo, all", "startup")
  .option("--force", "Overwrite existing files", false)
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🎯 Arela v3.1.1 - Your AI CTO is here to help!\n")));
    console.log(pc.gray("Let's get you set up. What kind of team are you?\n"));

    // Validate preset
    const validPresets = ["startup", "enterprise", "solo", "all"];
    if (!validPresets.includes(opts.preset)) {
      console.error(pc.red(`😵‍💫 Invalid preset: ${opts.preset}`));
      console.error(pc.gray(`Valid presets: ${validPresets.join(", ")}\n`));
      process.exit(1);
    }

    // Show preset info
    const presetDescriptions: Record<string, string> = {
      startup: "🚀 Startup - Move fast, break things (11 rules)",
      enterprise: "🏢 Enterprise - Quality & compliance (23 rules)",
      solo: "🦸 Solo Dev - Just the essentials (9 rules)",
      all: "🌯 The Whole Enchilada - Give me everything! (29 rules)",
    };

    console.log(pc.gray(`> ${opts.preset} - ${presetDescriptions[opts.preset]}\n`));
    console.log(pc.bold(pc.cyan(`🚀 ${opts.preset.charAt(0).toUpperCase() + opts.preset.slice(1)} mode activated! Fast-tracking your setup...\n`)));

    try {
      const result = await initProject({
        cwd: opts.cwd,
        preset: opts.preset,
        force: opts.force,
      });

      console.log(pc.bold(pc.green("\n✨ Boom! Your AI CTO is ready:\n")));
      console.log(pc.bold("Created:"));
      for (const file of result.created) {
        console.log(pc.gray(`  - ${file}`));
      }

      if (result.skipped.length > 0) {
        console.log(pc.yellow("\n⚠️  Skipped (already exists):"));
        for (const file of result.skipped) {
          console.log(pc.gray(`  - ${file}`));
        }
        console.log(pc.gray("\n💡 Use --force to overwrite"));
      }

      console.log(pc.bold(pc.cyan("\n📚 Next: Run `arela agents` to meet your AI team\n")));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Initialization went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela orchestrate - Run tickets
 */
program
  .command("orchestrate")
  .description("Run tickets with multi-agent orchestration")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--parallel", "Run tickets in parallel", false)
  .option("--max-parallel <n>", "Max parallel tickets", "5")
  .option("--agent <name>", "Run only tickets for specific agent")
  .option("--force", "Re-run completed tickets", false)
  .option("--dry-run", "Show what would run without executing", false)
  .action(async (opts) => {
    try {
      await orchestrate({
        cwd: opts.cwd,
        parallel: opts.parallel,
        maxParallel: parseInt(opts.maxParallel, 10),
        agent: opts.agent,
        force: opts.force,
        dryRun: opts.dryRun,
      });
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Orchestration hit a snag: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela status - Show ticket status
 */
program
  .command("status")
  .description("Show ticket execution status")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--verbose", "Show detailed status", false)
  .action(async (opts) => {
    try {
      await showStatus({
        cwd: opts.cwd,
        verbose: opts.verbose,
      });
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Status check went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela doctor - Validate project structure
 */
program
  .command("doctor")
  .description("Validate project structure and setup")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--fix", "Auto-fix issues", false)
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🏥 Arela Doctor - Let's check your pulse!\n")));

    try {
      const { checkStructure, fixStructure } = await import("./utils/structure-validator.js");
      
      const issues = await checkStructure(opts.cwd);
      
      if (issues.length === 0) {
        console.log(pc.green("🎉 Perfect health! Your project structure is awesome!\n"));
        return;
      }
      
      console.log(pc.bold(pc.yellow("⚠️  Found a few oopsies:\n")));
      
      for (const issue of issues) {
        const icon = issue.type === "error" ? "❌" : "⚠️ ";
        console.log(`${icon} ${issue.message}`);
        if (issue.fix) {
          console.log(pc.dim(`   💡 Quick fix: ${issue.fix}`));
        }
        if (issue.files && issue.files.length > 0) {
          console.log(pc.dim(`   📁 Files affected: ${issue.files.length}`));
        }
        console.log("");
      }
      
      if (opts.fix) {
        console.log(pc.cyan("🔧 Applying some magic...\n"));
        await fixStructure(opts.cwd, issues);
        console.log(pc.green("\n✅ All fixed! Your project is feeling much better now.\n"));
      } else {
        console.log(pc.gray("💡 Run with --fix and I'll patch these up for you\n"));
      }
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Doctor needs a coffee: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela index - Build RAG index
 */
program
  .command("index")
  .description("Build semantic search index for codebase")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--model <name>", "Ollama model to use", "nomic-embed-text")
  .option("--host <url>", "Ollama host URL", "http://localhost:11434")
  .option("--parallel", "Index files in parallel (faster but more memory)", false)
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n📚 Building your RAG brain...\n")));

    try {
      const { buildIndex } = await import("./rag/index.js");
      
      const result = await buildIndex({
        cwd: opts.cwd,
        model: opts.model,
        ollamaHost: opts.host,
        parallel: opts.parallel,
        progress: true, // Enable progress bar
      });

      console.log(pc.bold(pc.green(`\n🎉 Nailed it! Your RAG index is built and ready\n`)));
      console.log(pc.gray(`📊 Indexed ${result.filesIndexed} files in ${((result.timeMs / 1000).toFixed(1))}s`));
      console.log(pc.gray(`🧠 Your codebase is now searchable by AI\n`));
      console.log(pc.bold(pc.cyan("🚀 Go build something amazing!\n")));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Indexing went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela auto-index - Run incremental indexing (called by git hook)
 */
program
  .command("auto-index")
  .description("Incrementally update RAG index (called by git hook)")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--silent", "Run silently", true)
  .option("--personality <type>", "CLI personality: professional, fun, bold", "professional")
  .action(async (opts) => {
    try {
      const { personalities, getMessage } = await import("./utils/cli-personality.js");
      const personality = personalities[opts.personality] || personalities.professional;
      
      const { incrementalIndex } = await import("./utils/auto-index.js");
      
      const result = await incrementalIndex({
        cwd: opts.cwd,
        silent: opts.silent,
      });
      
      if (!result.skipped && !opts.silent) {
        const updateMsg = personality.mode === "fun"
          ? `🚀 Index updated: +${result.added} added, ~${result.updated} updated, -${result.deleted} deleted`
          : personality.mode === "bold"
          ? `Index updated: +${result.added} added, ~${result.updated} updated, -${result.deleted} deleted`
          : `✅ Index updated: +${result.added} added, ~${result.updated} updated, -${result.deleted} deleted`;
        console.log(pc.green(updateMsg));
      }
    } catch (error) {
      console.error(pc.red(`❌ Auto-indexing failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * arela install-hook - Install auto-indexing git hook
 */
program
  .command("install-hook")
  .description("Install post-commit hook for auto-indexing")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🪝 Installing Auto-Indexing Hook...\n")));

    try {
      const { installAutoIndexHook } = await import("./utils/auto-index.js");
      await installAutoIndexHook(opts.cwd);
      
      console.log(pc.bold(pc.green("\n✨ Hook installed! Your git is now supercharged\n")));
      console.log(pc.gray("🤖 Your RAG index will update automatically after each commit."));
      console.log(pc.gray("⚡ Only changed files are re-indexed (fast & efficient).\n"));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Installation went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela uninstall-hook - Remove auto-indexing git hook
 */
program
  .command("uninstall-hook")
  .description("Remove post-commit hook for auto-indexing")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--personality <type>", "CLI personality: professional, fun, bold", "professional")
  .action(async (opts) => {
    const { personalities, getMessage } = await import("./utils/cli-personality.js");
    const personality = personalities[opts.personality] || personalities.professional;
    
    const header = personality.mode === "fun"
      ? "🪝 Removing the auto-indexing magic..."
      : personality.mode === "bold"
      ? "🪝 Uninstalling hook (why would you do this)"
      : "🪝 Removing Auto-Indexing Hook";
    console.log(pc.bold(pc.cyan(`\n${header}\n`)));

    try {
      const { uninstallAutoIndexHook } = await import("./utils/auto-index.js");
      await uninstallAutoIndexHook(opts.cwd);
      
      const doneMsg = personality.mode === "fun"
        ? "✅ Hook removed! Auto-indexing disabled"
        : personality.mode === "bold"
        ? "✅ Hook removed. You'll regret this."
        : "✅ Hook removed successfully";
      console.log(pc.green(`${doneMsg}\n`));
    } catch (error) {
      console.error(pc.red(`\n❌ Removal failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela mcp - Start MCP server
 */
program
  .command("mcp")
  .description("Start MCP server for Windsurf integration")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--model <name>", "Ollama model to use", "nomic-embed-text")
  .option("--host <url>", "Ollama host URL", "http://localhost:11434")
  .option("--top-k <n>", "Number of results to return", "5")
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🔌 Starting Arela MCP Server...\n")));
    console.log(pc.gray(`📁 Working directory: ${opts.cwd}`));
    console.log(pc.gray(`🧠 Model: ${opts.model}`));
    console.log(pc.gray(`🌐 Ollama host: ${opts.host}\n`));

    try {
      const { runArelaMcpServer } = await import("./mcp/server.js");
      
      await runArelaMcpServer({
        cwd: opts.cwd,
        model: opts.model,
        ollamaHost: opts.host,
        defaultTopK: parseInt(opts.topK, 10),
      });
      
      // Server runs indefinitely
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 MCP server went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

program.parse();
