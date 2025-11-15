#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import path from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { discoverAgents } from "./agents/discovery.js";
import { orchestrate } from "./agents/orchestrate.js";
import { getAgentCapabilities } from "./agents/dispatch.js";
import { showStatus } from "./agents/status.js";
import { initProject } from "./persona/loader.js";
import { registerMemoryCommands } from "./memory/cli.js";
import { detectBreakingChanges } from "./version/drift-detector.js";
import { createSliceVersion } from "./version/version-creator.js";
import { getStalenessChecker } from "./utils/staleness-checker.js";

const program = new Command()
  .name("arela")
  .description("AI-powered CTO with multi-agent orchestration")
  .version("4.0.1");

// Auto-check memory staleness before every command
program.hook("preAction", async () => {
  const checker = getStalenessChecker();
  await checker.checkAndUpdate({ silent: false });
});

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
    console.log(pc.bold(pc.cyan("\n🎯 Arela v3.3.0 - Your AI CTO is here to help!\n")));
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
  .option("--tickets <list>", "Comma-separated list of ticket IDs (e.g., CODEX-001,CODEX-002)")
  .option("--force", "Re-run completed tickets", false)
  .option("--dry-run", "Show what would run without executing", false)
  .action(async (opts) => {
    try {
      await orchestrate({
        cwd: opts.cwd,
        parallel: opts.parallel,
        maxParallel: parseInt(opts.maxParallel, 10),
        agent: opts.agent,
        tickets: opts.tickets ? opts.tickets.split(',').map((t: string) => t.trim()) : undefined,
        force: opts.force,
        dryRun: opts.dryRun,
      });
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Orchestration hit a snag: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * Run command types and handlers (exported for testing)
 */
export interface RunCommandOptions {
  url?: string;
  flow: string;
  headless?: boolean;
  record?: boolean;
  analyze?: boolean;
  aiPilot?: boolean;
  goal?: string;
  platform?: string;
  device?: string;
  app?: string;
  webFallback?: boolean;
}

export type RunCommandHandler = (platform: string, opts: RunCommandOptions) => Promise<void>;

export class UnsupportedPlatformError extends Error {
  constructor(public readonly platform: string) {
    super(`Platform "${platform}" not supported.`);
    this.name = "UnsupportedPlatformError";
  }
}

export async function handleRunCommand(platform: string, opts: RunCommandOptions): Promise<void> {
  if (platform === "web") {
    try {
      const { runWebApp } = await import("./run/web.js");
      
      // Validate AI Pilot options
      if (opts.aiPilot && !opts.goal) {
        console.error(pc.red('\n😵‍💫 --ai-pilot requires --goal to be specified\n'));
        process.exit(1);
      }
      
      await runWebApp({
        url: opts.url ?? "http://localhost:3000",
        flow: opts.flow ?? "default",
        headless: Boolean(opts.headless),
        record: Boolean(opts.record),
        analyze: Boolean(opts.analyze),
        aiPilot: Boolean(opts.aiPilot),
        goal: opts.goal,
      });
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Web runner hit a snag: ${(error as Error).message}\n`));
      throw error;
    }
    return;
  }

  if (platform === "mobile") {
    try {
      const { runMobileApp } = await import("./run/mobile.js");
      await runMobileApp({
        platform: (opts.platform ?? "ios") as "ios" | "android",
        device: opts.device,
        flow: opts.flow ?? "default",
        app: opts.app,
        webFallback: opts.webFallback,
      });
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Mobile runner hit a snag: ${(error as Error).message}\n`));
      throw error;
    }
    return;
  }

  throw new UnsupportedPlatformError(platform);
}

export function buildRunCommand(
  programInstance: Command,
  handler: RunCommandHandler = handleRunCommand
): Command {
  return programInstance
    .command("run")
    .description("Run and test your app like a real user")
    .argument("<platform>", "Platform: web or mobile")
    .option("--url <url>", "URL for web apps", "http://localhost:3000")
    .option("--platform <platform>", "Mobile platform: ios or android", "ios")
    .option("--device <name>", "Device name (e.g., 'iPhone 15 Pro')")
    .option("--app <path>", "Path to .app or .apk file (auto-detects Expo)")
    .option("--flow <name>", "User flow to test", "default")
    .option("--headless", "Run browser in headless mode (web only)", false)
    .option("--record", "Record video of test execution", false)
    .option("--analyze", "Run AI-powered analysis on screenshots (web only)", false)
    .option("--ai-pilot", "Let AI figure out how to achieve goal (web only)", false)
    .option("--goal <goal>", "Goal for AI Pilot to achieve (requires --ai-pilot)")
    .option("--web-fallback", "Force web fallback mode with mobile viewport (mobile only)", false)
    .addHelpText(
      "after",
      "\nExamples:\n" +
        "  $ arela run web\n" +
        "  $ arela run web --url http://localhost:8080\n" +
        "  $ arela run web --flow signup --headless\n" +
        "  $ arela run mobile\n" +
        "  $ arela run mobile --platform android\n" +
        "  $ arela run mobile --device 'Pixel 7' --flow onboarding\n"
    )
    .action(async (platformArg, opts) => {
      try {
        await handler(platformArg, opts);
      } catch (error) {
        if (error instanceof UnsupportedPlatformError) {
          console.error(pc.red(error.message));
          console.log(pc.gray("Supported platforms: web, mobile"));
          process.exit(1);
        }

        if (error instanceof Error) {
          console.error(pc.red(`\n😵‍💫 Run command hit a snag: ${error.message}\n`));
        }
        process.exit(1);
      }
    });
}

/**
 * arela run - Execute user flows via platform runners
 */
buildRunCommand(program);

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
    console.log(pc.gray("🔧 I'll automatically set up Ollama and required models if needed...\n"));

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

// install-hook command moved to line ~1230 (comprehensive version with all 3 hooks)

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
 * arela analyze - Analyze code flows and architecture
 */
program
  .command("analyze")
  .description("Analyze code flows and architecture")
  .argument("<type>", "Analysis type: flow, architecture, tests")
  .argument("[names...]", "Names or paths to analyze")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--dir <path>", "Directory to analyze")
  .option("--verbose", "Show detailed analysis", false)
  .option("--json <path>", "Export results to JSON file")
  .option("--output <format>", "Output format: text, json", "text")
  .addHelpText(
    "after",
    "\nExamples:\n" +
      "  $ arela analyze flow\n" +
      "  $ arela analyze flow main --verbose\n" +
      "  $ arela analyze architecture\n" +
      "  $ arela analyze architecture /repo/path1 /repo/path2\n" +
      "  $ arela analyze architecture --json report.json\n" +
      "  $ arela analyze tests --dir src --json test-report.json --verbose\n"
  )
  .action(async (type, names, opts) => {
    if (type === "flow") {
      await handleFlowAnalysis(names, opts);
    } else if (type === "architecture") {
      await handleArchitectureAnalysis(names, opts);
    } else if (type === "tests") {
      await handleTestAnalysis(opts);
    } else {
      console.error(
        pc.red(`\n😵‍💫 Analysis type "${type}" not supported. Use: flow, architecture, tests\n`)
      );
      process.exit(1);
    }
  });

/**
 * Handle flow analysis
 */
async function handleFlowAnalysis(names: string[], opts: any): Promise<void> {
  const name = names[0] || "main";

  console.log(pc.bold(pc.cyan("\n🔍 Analyzing Code Flow...\n")));
  console.log(pc.gray(`Flow: ${name}`));
  console.log(pc.gray(`Directory: ${opts.cwd}\n`));

  try {
    const { analyzeFlow, generateMarkdownReport } = await import("./flow/analyzer.js");
    const { reportAnalysis, reportBriefSummary, exportJSON, exportMarkdown } = await import(
      "./flow/reporter.js"
    );

    const result = await analyzeFlow({
      cwd: opts.cwd,
      flowName: name,
      verbose: opts.verbose,
    });

    if (opts.verbose) {
      reportAnalysis(result);
    } else {
      reportBriefSummary(result);
    }

    // Export if requested
    if (opts.json) {
      exportJSON(result, opts.json);
    }

    console.log(pc.bold(pc.green("✨ Analysis complete!\n")));
  } catch (error) {
    console.error(pc.red(`\n😵‍💫 Analysis failed: ${(error as Error).message}\n`));
    if (opts.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

/**
 * Handle architecture analysis
 */
async function handleArchitectureAnalysis(names: string[], opts: any): Promise<void> {
  console.log(pc.bold(pc.cyan("\n🔍 Analyzing Architecture...\n")));

  // Determine repository paths
  let repoPaths = names.length > 0 ? names : [opts.cwd];
  console.log(pc.gray(`Repositories: ${repoPaths.join(", ")}\n`));

  try {
    const { analyzeArchitecture } = await import("./analyze/architecture.js");
    const { reportArchitecture, exportArchitectureJson } = await import(
      "./analyze/reporter.js"
    );

    const report = await analyzeArchitecture(repoPaths, {
      verbose: opts.verbose,
      output: opts.output,
    });

    // Display report
    reportArchitecture(report, opts.verbose);

    // Export if requested
    if (opts.json) {
      exportArchitectureJson(report, opts.json);
      console.log(pc.gray(`\n📄 Report exported to ${opts.json}`));
    }

    console.log(pc.bold(pc.green("\n✨ Architecture analysis complete!\n")));
  } catch (error) {
    console.error(pc.red(`\n😵‍💫 Architecture analysis failed: ${(error as Error).message}\n`));
    if (opts.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

/**
 * Handle test strategy analysis
 */
async function handleTestAnalysis(opts: any): Promise<void> {
  console.log(pc.bold(pc.cyan("\n🧪 Test Strategy Optimizer\n")));

  try {
    const { analyzeTestStrategy } = await import("./analyze/tests/analyzer.js");
    const {
      reportTestStrategy,
      exportTestStrategyJson,
      writeDefaultTestReport,
    } = await import("./analyze/tests/reporter.js");

    const report = await analyzeTestStrategy({
      cwd: opts.cwd,
      dir: opts.dir,
      verbose: opts.verbose,
    });

    reportTestStrategy(report, opts.verbose);
    writeDefaultTestReport(report);

    if (opts.json) {
      exportTestStrategyJson(report, opts.json);
    }

    console.log(pc.bold(pc.green("✨ Test analysis complete!\n")));
  } catch (error) {
    console.error(pc.red(`\n😵‍💫 Test analysis failed: ${(error as Error).message}\n`));
    if (opts.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

/**
 * arela ingest - Ingest codebase into graph database
 */
program
  .command("ingest <command>")
  .description("Ingest and analyze codebase")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--repo <path>", "Repository path (defaults to current directory)")
  .option("--refresh", "Refresh existing graph", false)
  .option("--analyze", "Run analysis after ingestion", false)
  .option("--verbose", "Verbose output", false)
  .action(async (command, opts) => {
    if (command !== "codebase") {
      console.error(pc.red(`\n😵‍💫 Unknown ingest command: ${command}`));
      console.log(pc.gray("Available commands: codebase\n"));
      process.exit(1);
    }

    const repoPath = opts.repo || opts.cwd;

    console.log(pc.bold(pc.cyan("\n🧠 Arela Codebase Ingestion\n")));

    try {
      const { ingestCodebase } = await import("./ingest/index.js");

      const result = await ingestCodebase(repoPath, {
        refresh: opts.refresh,
        analyze: opts.analyze,
        verbose: opts.verbose,
      });

      console.log(pc.bold(pc.cyan("\n📈 Ingestion Complete!\n")));
      console.log(pc.gray(`Files scanned: ${result.summary.filesScanned}`));
      console.log(pc.gray(`Imports found: ${result.summary.importsFound}`));
      console.log(pc.gray(`Functions: ${result.summary.functionsDefined}`));
      console.log(pc.gray(`API calls: ${result.summary.apiCallsFound}`));
      console.log(pc.gray(`\nGraph stored at: ${result.dbPath}`));
      console.log(pc.gray(`Completed in ${(result.duration / 1000).toFixed(2)}s\n`));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Ingestion failed: ${(error as Error).message}\n`));
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

/**
 * arela mcp stats - Show search enforcement statistics
 */
program
  .command("mcp-stats")
  .description("Show search enforcement statistics from MCP server")
  .action(async () => {
    console.log(pc.bold(pc.cyan("\n📊 Search Enforcement Statistics\n")));
    
    try {
      const { searchEnforcer } = await import("./mcp/search-enforcer.js");
      
      searchEnforcer.printStats();
      
      const stats = searchEnforcer.getStats();
      
      if (parseInt(stats.complianceRate) < 50) {
        console.log(pc.yellow("⚠️  Low compliance rate! Agents are not using arela_search enough.\n"));
      } else if (parseInt(stats.complianceRate) >= 90) {
        console.log(pc.green("🎉 Excellent compliance! Agents are using arela_search properly.\n"));
      }
      
    } catch (error) {
      console.error(pc.red(`\n❌ Failed to get stats: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela detect slices - Detect vertical slices
 */
program
  .command("detect")
  .description("Detect optimal vertical slices in codebase")
  .argument("<type>", "Detection type (only 'slices' supported)")
  .argument("[repos...]", "Repository paths (optional)")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--json <path>", "Export results to JSON file")
  .option("--verbose", "Show detailed analysis", false)
  .option("--min-cohesion <n>", "Minimum cohesion percentage (0-100)", "0")
  .option("--max-slices <n>", "Maximum slices to detect")
  .action(async (type, repos, opts) => {
    if (type !== 'slices') {
      console.error(pc.red(`\n😵‍💫 Unknown detect type: ${type}`));
      console.log(pc.gray("Available types: slices\n"));
      process.exit(1);
    }
    console.log(pc.bold(pc.cyan("\n🔍 Detecting Optimal Slice Boundaries...\n")));

    try {
      const { detectSlices } = await import("./detect/index.js");
      const { formatReport: formatOutput, printVerboseInfo } = await import("./detect/reporter.js");

      const options = {
        verbose: opts.verbose,
        json: opts.json,
        minCohesion: parseInt(opts.minCohesion, 10),
        maxSlices: opts.maxSlices ? parseInt(opts.maxSlices, 10) : undefined,
      };

      // If no repos provided, use cwd as the repo path
      // Handle both array and undefined cases
      const reposArray = Array.isArray(repos) ? repos : (repos ? [repos] : []);
      const repoPaths = reposArray.length > 0 ? reposArray : [opts.cwd];
      
      if (opts.verbose) {
        console.log(pc.gray(`Repo paths: ${repoPaths.join(', ')}`));
        console.log(pc.gray(`CWD: ${opts.cwd}\n`));
      }
      
      const report = await detectSlices(repoPaths, opts.cwd, options);

      // Display results
      console.log(formatOutput(report));

      if (opts.verbose) {
        printVerboseInfo(report);
      }

      console.log(pc.bold(pc.green(`✨ Done! Detected ${report.sliceCount} slices with ${report.totalFiles} files\n`)));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Slice detection failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela generate - Generate contracts, clients, and other specifications
 */
program
  .command("generate")
  .description("Generate API contracts, clients, and specifications")
  .argument("[type]", "Type of generation (contracts, client)", "contracts")
  .argument("[repos...]", "Repository paths (optional)")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--language <lang>", "Client language (typescript, python)", "typescript")
  .option("--contract <path>", "Path to OpenAPI contract file")
  .option("--contract-dir <path>", "Directory containing OpenAPI contracts")
  .option("--base-url <url>", "Base URL for API client")
  .option("--output <dir>", "Output directory")
  .option("--format <type>", "Output format for contracts: yaml or json", "yaml")
  .option("--per-slice", "Generate contracts per vertical slice", true)
  .option("--drift-only", "Only show schema drift issues", false)
  .option("--dry-run", "Show what would be generated without writing files", false)
  .action(async (type, repos, opts) => {
    if (type === "contracts") {
      await handleContractGeneration(repos, opts);
    } else if (type === "client") {
      await handleClientGeneration(opts);
    } else {
      console.error(pc.red(`\n😵‍💫 Unknown generate command: ${type}`));
      console.log(pc.gray("Available commands: contracts, client\n"));
      process.exit(1);
    }
  });

async function handleContractGeneration(repos: string[] | undefined, opts: any): Promise<void> {
  try {
    const { generateContracts } = await import("./contracts/index.js");

    const repoPaths = repos && repos.length > 0 ? repos : [opts.cwd];

    const report = await generateContracts({
      repoPaths,
      perSlice: opts.perSlice !== false,
      format: opts.format as "yaml" | "json",
      driftOnly: opts.driftOnly,
      outputDir: opts.output || "openapi",
    });

    // Success - exit with code 0
    const driftCount = report.driftIssues.length;
    if (driftCount > 0) {
      process.exit(0); // Exit with warning but not failure
    }
  } catch (error) {
    console.error(pc.red(`\n😵‍💫 Contract generation failed: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

async function handleClientGeneration(opts: any): Promise<void> {
  try {
    const { generateClient } = await import("./generate/client/index.js");

    await generateClient({
      language: opts.language || "typescript",
      contract: opts.contract,
      contractDir: opts.contractDir,
      outputDir: opts.output || "src/api",
      baseURL: opts.baseUrl,
      dryRun: opts.dryRun,
    });
  } catch (error) {
    console.error(pc.red(`\n😵‍💫 Client generation failed: ${(error as Error).message}\n`));
    if (opts.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

/**
 * arela validate contracts - Validate API against OpenAPI contracts
 */
program
  .command("validate contracts")
  .description("Validate API implementation against OpenAPI contracts")
  .option("--contract <path>", "Specific contract to validate")
  .option("--server <url>", "API server URL", "http://localhost:3000")
  .option("--start-server <cmd>", "Command to start API server")
  .option("--watch", "Watch mode for development")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(async (options) => {
    console.log(pc.bold(pc.cyan("\n🔍 Validating API Contracts...\n")));

    try {
      const { validateContracts } = await import("./validate/contract-validator.js");

      const result = await validateContracts({
        contractPath: options.contract,
        serverUrl: options.server,
        startServer: options.startServer,
        watch: options.watch,
        cwd: options.cwd,
      });

      if (result.passed) {
        console.log(pc.bold(pc.green("✅ All contracts validated successfully!\n")));
        console.log(pc.gray(`   Total endpoints: ${result.total}`));
        console.log(pc.gray(`   Passed: ${result.total - result.failures}\n`));

        // Show details for each contract
        for (const contract of result.contracts) {
          const status = contract.passed ? pc.green("✓") : pc.red("✗");
          console.log(`${status} ${path.basename(contract.path)}`);
          console.log(pc.gray(`   Endpoints: ${contract.total}, Passes: ${contract.passes}\n`));
        }

        process.exit(0);
      } else {
        console.log(pc.bold(pc.red("❌ Contract validation failed!\n")));
        console.log(pc.gray(`   Total endpoints: ${result.total}`));
        console.log(pc.gray(`   Failed: ${result.failures}\n`));

        // Show details for each contract
        for (const contract of result.contracts) {
          const status = contract.passed ? pc.green("✓") : pc.red("✗");
          console.log(`${status} ${path.basename(contract.path)}`);
          console.log(pc.gray(`   Endpoints: ${contract.total}, Failures: ${contract.failures}`));
          if (contract.details) {
            console.log(pc.gray(`   Details: ${contract.details}\n`));
          }
        }

        process.exit(1);
      }
    } catch (error) {
      console.error(pc.red("\n❌ Contract validation error:"));
      console.error(pc.red((error as Error).message + "\n"));
      process.exit(1);
    }
  });

/**
 * arela refactor - Refactoring commands
 */
const refactorCommand = program.command("refactor");

refactorCommand
  .command("extract-all-slices")
  .description("Extract all detected slices into separate vertical features")
  .option("--dry-run", "Preview extraction without making changes", false)
  .option("--skip-tests", "Skip test verification", false)
  .option("--interactive", "Ask for confirmation before extraction", false)
  .option("--min-cohesion <n>", "Minimum cohesion percentage (0-100)", "70")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--verbose", "Show detailed output", false)
  .action(async (options) => {
    console.log(pc.bold(pc.cyan("\n🚀 Arela v4.0.0 - Slice Extraction\n")));

    try {
      const { SliceExtractor } = await import("./refactor/index.js");

      const extractor = new SliceExtractor();
      const result = await extractor.extractAllSlices({
        dryRun: options.dryRun,
        skipTests: options.skipTests,
        interactive: options.interactive,
        minCohesion: parseInt(options.minCohesion, 10),
        cwd: options.cwd,
        verbose: options.verbose,
      });

      if (!result.success) {
        console.error(pc.red(`\n❌ Extraction failed!\n`));
        for (const error of result.errors) {
          console.error(pc.red(`   • ${error}`));
        }
        console.log("");
        process.exit(1);
      } else {
        console.log(pc.bold(pc.green(`\n✅ Success!\n`)));
        console.log(pc.gray(`   Duration: ${(result.duration / 1000).toFixed(2)}s`));
        process.exit(0);
      }
    } catch (error) {
      console.error(pc.red(`\n❌ Extraction failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

refactorCommand
  .command("extract-slice <name>")
  .description("Extract a specific slice into a vertical feature")
  .option("--dry-run", "Preview extraction without making changes", false)
  .option("--skip-tests", "Skip test verification", false)
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(async (name, options) => {
    console.log(pc.bold(pc.cyan(`\n🚀 Extracting Slice: ${name}\n`)));

    try {
      const { SliceExtractor } = await import("./refactor/index.js");
      const { detectSlices } = await import("./detect/index.js");

      // Detect slices first
      const report = await detectSlices(["."], options.cwd);

      // Find the slice matching the name
      const slice = report.slices.find(
        s => s.name.toLowerCase() === name.toLowerCase()
      );

      if (!slice) {
        console.error(pc.red(`\n❌ Slice not found: ${name}\n`));
        console.log(pc.gray("Available slices:"));
        for (const s of report.slices) {
          console.log(pc.gray(`   • ${s.name} (${s.fileCount} files)`));
        }
        console.log("");
        process.exit(1);
      }

      const extractor = new SliceExtractor();
      const result = await extractor.extractAllSlices({
        dryRun: options.dryRun,
        skipTests: options.skipTests,
        cwd: options.cwd,
      });

      if (!result.success) {
        console.error(pc.red(`\n❌ Extraction failed!\n`));
        process.exit(1);
      }

      console.log(pc.bold(pc.green(`\n✅ Slice extracted!\n`)));
    } catch (error) {
      console.error(pc.red(`\n❌ Failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela claude - Launch Claude CLI with ticket context
 */
program
  .command("claude [ticket]")
  .description("Launch Claude CLI (optionally with ticket path)")
  .action(async (ticket?: string) => {
    const { execa } = await import('execa');

    if (ticket) {
      // Print the implement command for Claude
      console.log(pc.bold(pc.cyan("\n📋 Ticket ready for Claude:\n")));
      console.log(pc.gray(`implement ${ticket}\n`));
      console.log(pc.gray("Paste this into Claude when it starts...\n"));

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Launch Claude CLI
    try {
      await execa('claude', [], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error(pc.red('\n❌ Failed to launch Claude CLI'));
      console.error(pc.gray('Make sure Claude CLI is installed: https://claude.ai/cli\n'));
      process.exit(1);
    }
  });

/**
 * arela codex - Launch Codex CLI with ticket context
 */
program
  .command("codex [ticket]")
  .description("Launch Codex CLI (optionally with ticket path)")
  .action(async (ticket?: string) => {
    const { execa } = await import('execa');
    
    if (ticket) {
      // Print the implement command for Codex
      console.log(pc.bold(pc.cyan("\n📋 Ticket ready for Codex:\n")));
      console.log(pc.gray(`implement ${ticket}\n`));
      console.log(pc.gray("Paste this into Codex when it starts...\n"));
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Launch Codex CLI
    try {
      await execa('codex', [], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error(pc.red('\n❌ Failed to launch Codex CLI'));
      console.error(pc.gray('Make sure Codex CLI is installed\n'));
      process.exit(1);
    }
  });

const versionCommand = program
  .command("version")
  .description("Detect and manage API versions");

versionCommand
  .command("detect-drift")
  .description("Detect breaking OpenAPI changes in git history")
  .option("--cwd <dir>", "Repository root", process.cwd())
  .action(async (opts) => {
    console.log(pc.bold(pc.cyan("\n🔍 Checking for API drift...\n")));

    try {
      const drift = await detectBreakingChanges(opts.cwd);

      if (drift.length === 0) {
        console.log(pc.bold(pc.green("✅ No breaking changes detected\n")));
        return;
      }

      for (const change of drift) {
        const severityIcon = change.severity === "critical" ? "🚨" : "⚠️";
        console.log(`${severityIcon} ${pc.bold(change.type)} ${pc.gray(`(${change.file})`)}`);
        if (change.endpoint) {
          console.log(pc.gray(`   Endpoint: ${change.endpoint}`));
        }
        if (change.method) {
          console.log(pc.gray(`   Method: ${change.method.toUpperCase()}`));
        }
        console.log(pc.gray(`   Field: ${change.field}`));
        console.log(pc.gray(`   Old: ${change.oldValue}`));
        console.log(pc.gray(`   New: ${change.newValue}\n`));
      }

      console.log(pc.yellow("💡 Consider creating a new slice version for breaking changes.\n"));
      process.exit(1);
    } catch (error) {
      console.error(pc.red(`\n❌ Drift detection failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

versionCommand
  .command("create <slice>")
  .description("Create a new version of a slice and its OpenAPI contract")
  .option("--cwd <dir>", "Repository root", process.cwd())
  .option("--version <number>", "Version number to create", "2")
  .action(async (slice, opts) => {
    const versionNumber = parseInt(opts.version, 10);
    if (Number.isNaN(versionNumber)) {
      console.error(pc.red("\n❌ Version must be a valid number\n"));
      process.exit(1);
    }

    console.log(pc.bold(pc.cyan(`\n📦 Creating ${slice} v${versionNumber}...\n`)));

    try {
      const result = await createSliceVersion(opts.cwd, slice, versionNumber);

      console.log(pc.green("✅ Slice version created!\n"));
      console.log(pc.gray(`   Directory: ${result.newSlicePath}`));
      if (result.newSpecPath) {
        console.log(pc.gray(`   OpenAPI spec: ${result.newSpecPath}`));
      } else {
        console.log(pc.yellow("   No OpenAPI spec found to duplicate."));
      }
      console.log(pc.bold(pc.cyan("\nNext steps:")));
      console.log(pc.gray("1. Implement changes in the new slice"));
      console.log(pc.gray("2. Update the versioned OpenAPI contract"));
      console.log(pc.gray("3. Test v1 and v2 side-by-side"));
      console.log(pc.gray("4. Deploy with both versions enabled\n"));
    } catch (error) {
      console.error(pc.red(`\n❌ Failed to create version: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

registerMemoryCommands(program);

function isDirectCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return true;
  }

  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return true;
  }
}

/**
 * arela watch - Start file watcher for automatic memory updates
 */
program
  .command("watch")
  .description("Start file watcher for automatic memory updates")
  .option("--debounce <ms>", "Debounce delay in milliseconds", "500")
  .action(async (opts) => {
    const { memoryAutoUpdater } = await import("./memory/auto-update.js");
    
    console.log(pc.bold(pc.cyan("\n👀 Starting file watcher...\n")));
    
    memoryAutoUpdater.start({
      projectPath: process.cwd(),
      debounceMs: parseInt(opts.debounce, 10),
    });
    
    console.log(pc.green("\n✨ Watching for file changes... (Ctrl+C to stop)\n"));
    
    // Keep process alive
    process.on("SIGINT", () => {
      console.log(pc.yellow("\n\n👋 Stopping file watcher..."));
      memoryAutoUpdater.stop();
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      memoryAutoUpdater.stop();
      process.exit(0);
    });
  });

/**
 * arela install-hook - Install git hooks for automatic memory updates
 */
program
  .command("install-hook")
  .description("Install git hooks for automatic memory updates")
  .action(async () => {
    const { existsSync, copyFileSync, chmodSync } = await import("fs");
    const { join } = await import("path");
    
    console.log(pc.bold(pc.cyan("\n🔧 Installing git hooks...\n")));
    
    const gitDir = join(process.cwd(), ".git");
    
    if (!existsSync(gitDir)) {
      console.error(pc.red("❌ Not a git repository"));
      process.exit(1);
    }
    
    const hooksDir = join(gitDir, "hooks");
    const sourceDir = join(process.cwd(), ".arela", "hooks");
    
    if (!existsSync(sourceDir)) {
      console.error(pc.red("❌ Hooks directory not found: .arela/hooks/"));
      console.log(pc.gray("   Make sure you're in an Arela project"));
      process.exit(1);
    }
    
    // Copy hooks
    const hooks = ["post-commit", "post-checkout", "post-merge"];
    let installedCount = 0;
    
    for (const hook of hooks) {
      const source = join(sourceDir, hook);
      const dest = join(hooksDir, hook);
      
      if (!existsSync(source)) {
        console.warn(pc.yellow(`⚠️  Hook not found: ${hook}`));
        continue;
      }
      
      try {
        copyFileSync(source, dest);
        chmodSync(dest, 0o755); // Make executable
        console.log(pc.green(`✅ Installed ${hook}`));
        installedCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(pc.red(`❌ Failed to install ${hook}: ${message}`));
      }
    }
    
    if (installedCount > 0) {
      console.log(pc.bold(pc.green("\n🎉 Git hooks installed!\n")));
      console.log(pc.gray("Memory will auto-update on:"));
      console.log(pc.gray("  - Every commit (incremental)"));
      console.log(pc.gray("  - Branch switch (full refresh)"));
      console.log(pc.gray("  - After merge (full refresh)"));
      console.log("");
    } else {
      console.error(pc.red("\n❌ No hooks were installed\n"));
      process.exit(1);
    }
  });

if (isDirectCliExecution()) {
  program.parse();
}

export { program };
