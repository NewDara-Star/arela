#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { Command } from "commander";
import pc from "picocolors";
import { discoverAgents } from "./agents/discovery.js";
import { orchestrate } from "./agents/orchestrate.js";
import { getAgentCapabilities } from "./agents/dispatch.js";
import { showStatus } from "./agents/status.js";
import { initProject } from "./persona/loader.js";
import { registerMemoryCommands } from "./memory/cli.js";

const program = new Command()
  .name("arela")
  .description("AI-powered CTO with multi-agent orchestration")
  .version("3.8.1");

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
 * arela generate contracts - Generate OpenAPI contracts from code
 */
program
  .command("generate")
  .description("Generate API contracts and specifications")
  .argument("[type]", "Type of generation (contracts, flows, etc.)", "contracts")
  .argument("[repos...]", "Repository paths (optional)")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .option("--format <type>", "Output format: yaml or json", "yaml")
  .option("--per-slice", "Generate contracts per vertical slice", true)
  .option("--drift-only", "Only show schema drift issues", false)
  .option("--output <dir>", "Output directory", "openapi")
  .action(async (type, repos, opts) => {
    if (type !== "contracts") {
      console.error(pc.red(`\n😵‍💫 Unknown generate command: ${type}`));
      console.log(pc.gray("Available commands: contracts\n"));
      process.exit(1);
    }

    try {
      const { generateContracts } = await import("./contracts/index.js");

      const repoPaths = repos && repos.length > 0 ? repos : [opts.cwd];

      const report = await generateContracts({
        repoPaths,
        perSlice: opts.perSlice !== false,
        format: opts.format as "yaml" | "json",
        driftOnly: opts.driftOnly,
        outputDir: opts.output,
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

if (isDirectCliExecution()) {
  program.parse();
}

export { program };
