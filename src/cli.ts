#!/usr/bin/env node

import { config } from "dotenv";
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
import { checkForUpdatesAsync } from "./utils/update-checker.js";

// Load .env file if it exists
config();

const VERSION = "4.1.0";

const program = new Command()
  .name("arela")
  .description("AI-powered CTO with multi-agent orchestration")
  .version(VERSION);

// Auto-check for updates (non-blocking, async, cached for 24h)
checkForUpdatesAsync(VERSION);

// Auto-check memory staleness before every command
program.hook("preAction", async () => {
  const checker = getStalenessChecker();
  await checker.checkAndUpdate({ silent: true }); // Silent to avoid spam
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

      // Create .env files
      console.log(pc.bold(pc.cyan("\n🔑 Setting up environment...\n")));
      const { setupKeys } = await import("./setup/keys.js");
      
      // Create .env and .env.example if they don't exist
      const fs = await import("fs");
      const VERSION = "4.0.2";
      const envPath = path.join(opts.cwd, ".env");
      const envExamplePath = path.join(opts.cwd, ".env.example");
      
      const envTemplate = `# Arela Configuration

# OpenAI API Key (optional but recommended for fast classification)
# Get yours at: https://platform.openai.com/api-keys
# Cost: ~$0.0001 per query (1 cent per 100 queries)
# Speed: ~200ms vs 1.5s with Ollama
OPENAI_API_KEY=

# Anthropic API Key (optional, for future features)
ANTHROPIC_API_KEY=
`;
      
      if (!fs.existsSync(envExamplePath)) {
        fs.writeFileSync(envExamplePath, envTemplate);
        console.log(pc.gray("  ✅ Created .env.example"));
      }
      
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, envTemplate);
        console.log(pc.gray("  ✅ Created .env"));
      }

      console.log(pc.bold(pc.cyan("\n📚 Next steps:\n")));
      console.log(pc.gray("  1. Run `arela setup` to configure API keys (optional)"));
      console.log(pc.gray("  2. Run `arela agents` to meet your AI team"));
      console.log(pc.gray("  3. Run `arela index` to build your RAG brain\n"));
    } catch (error) {
      console.error(pc.red(`\n😵‍💫 Initialization went sideways: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

/**
 * arela setup - Interactive setup wizard
 */
program
  .command("setup")
  .description("Interactive setup wizard for API keys and configuration")
  .action(async () => {
    const { setupKeys } = await import("./setup/keys.js");
    await setupKeys();
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
 * arela route - Test Meta-RAG context routing
 */
program
  .command("route")
  .description("Test Meta-RAG context routing")
  .argument("<query>", "Query to route")
  .option("--verbose", "Show detailed routing info")
  .option("--multi-hop", "Enable multi-hop reasoning for complex queries")
  .action(async (query: string, opts: any) => {
    try {
      const { ContextRouter } = await import("./context-router.js");
      const { QueryClassifier } = await import("./meta-rag/classifier.js");
      const { MemoryRouter } = await import("./meta-rag/router.js");
      const { FusionEngine } = await import("./fusion/index.js");
      const { HexiMemory } = await import("./memory/hexi-memory.js");

      const heximemory = new HexiMemory();
      await heximemory.init(process.cwd());

      const classifier = new QueryClassifier();
      await classifier.init();

      const memoryRouter = new MemoryRouter({
        heximemory,
        classifier,
      });

      const fusion = new FusionEngine();

      const router = new ContextRouter({
        heximemory,
        classifier,
        router: memoryRouter,
        fusion,
        debug: opts.verbose,
      });

      await router.init();

      // Multi-hop reasoning path
      if (opts.multiHop) {
        const { QueryDecomposer } = await import("./reasoning/decomposer.js");
        const { MultiHopRouter } = await import("./reasoning/multi-hop-router.js");

        const decomposer = new QueryDecomposer();
        await decomposer.init();

        const multiHopRouter = new MultiHopRouter(router);

        console.log(`\n🧠 Routing query with multi-hop reasoning: "${query}"\n`);

        const startDecomp = Date.now();
        const decomposition = await decomposer.decompose(query);
        const decompTime = Date.now() - startDecomp;

        if (!decomposition.isComplex) {
          console.log(pc.yellow("Query is not complex enough for multi-hop reasoning"));
          console.log(pc.gray("Falling back to single-hop routing\n"));

          // Fall through to regular routing
          const response = await router.route({ query });

          console.log(
            `📊 Classification: ${response.classification.type} (${response.classification.confidence})`
          );
          console.log(`🎯 Layers: ${response.routing.layers.join(", ")}`);
          console.log(`💡 Reasoning: ${response.routing.reasoning}`);
          console.log(`\n⏱️  Stats:`);
          console.log(`   Classification: ${response.stats.classificationTime}ms`);
          console.log(`   Retrieval: ${response.stats.retrievalTime}ms`);
          console.log(`   Fusion: ${response.stats.fusionTime}ms`);
          console.log(`   Total: ${response.stats.totalTime}ms`);
          console.log(`   Estimated tokens: ${response.stats.tokensEstimated}`);
          console.log(`   Context items: ${response.context.length}`);
        } else {
          console.log(pc.bold(pc.cyan("🔍 Decomposing query...")));
          console.log(pc.gray(`   Time: ${decompTime}ms`));
          console.log(pc.gray(`   Strategy: ${decomposition.strategy}\n`));

          if (opts.verbose) {
            decomposition.subQueries.forEach((sq) => {
              const deps = sq.dependencies.length > 0 ? ` (depends on ${sq.dependencies.join(", ")})` : "";
              console.log(pc.gray(`   Sub-query ${sq.id}: "${sq.query}"${deps}`));
            });
            console.log("");
          }

          console.log(pc.bold(pc.cyan(`🎯 Executing ${decomposition.subQueries.length} hops (${decomposition.strategy})...\n`)));

          const result = await multiHopRouter.route(decomposition);

          // Display hop results
          for (const hop of result.hops) {
            const icon = hop.context.length > 0 ? "✅" : "⚠️";
            console.log(`${icon} Hop ${hop.subQueryId}: ${hop.subQuery}`);
            console.log(pc.gray(`   Classification: ${hop.classification.type}`));
            console.log(pc.gray(`   Results: ${hop.context.length}`));
            console.log(pc.gray(`   Relevance: ${(hop.relevanceScore * 100).toFixed(0)}%`));
            console.log(pc.gray(`   Time: ${hop.executionTime}ms\n`));
          }

          console.log(pc.bold(pc.green(`✅ Combined ${result.combinedContext.filter(c => c.metadata?.type !== "separator").length} results (deduplicated from ${result.hops.reduce((sum, h) => sum + h.context.length, 0)})\n`)));

          console.log(pc.bold("📊 Multi-Hop Stats:"));
          console.log(pc.gray(`   Total hops: ${result.stats.totalHops}`));
          console.log(pc.gray(`   Execution strategy: ${decomposition.strategy}`));
          console.log(pc.gray(`   Total time: ${result.stats.totalTime}ms`));
          console.log(pc.gray(`   Decomposition: ${decompTime}ms`));
          console.log(pc.gray(`   Execution: ${result.stats.executionTime}ms`));
          console.log(pc.gray(`   Combination: ${result.stats.combinationTime}ms`));
          console.log(pc.gray(`   Results per hop: ${result.stats.resultsPerHop.toFixed(1)} avg`));
          console.log(pc.gray(`   Deduplication: ${result.stats.deduplicationRate.toFixed(1)}% reduction`));
          console.log(pc.gray(`   Estimated tokens: ${result.stats.tokensEstimated}\n`));

          if (opts.verbose) {
            console.log(pc.bold("\n📦 Combined Context:"));
            console.log(JSON.stringify(result.combinedContext, null, 2));
          }
        }

        // Store last query in session for feedback
        try {
          const { SessionMemory } = await import("./memory/session.js");
          const session = new SessionMemory(process.cwd());
          await session.init();
          await session.setContext("lastQuery", {
            query,
            classification: null,
            routing: null,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.debug("Failed to store query in session:", error);
        }

        process.exit(0);
      }

      // Regular single-hop routing
      console.log(`\n🧠 Routing query: "${query}"\n`);

      const response = await router.route({ query });

      console.log(
        `📊 Classification: ${response.classification.type} (${response.classification.confidence})`
      );
      console.log(`🎯 Layers: ${response.routing.layers.join(", ")}`);
      console.log(`💡 Reasoning: ${response.routing.reasoning}`);
      console.log(`\n⏱️  Stats:`);
      console.log(`   Classification: ${response.stats.classificationTime}ms`);
      console.log(`   Retrieval: ${response.stats.retrievalTime}ms`);
      console.log(`   Fusion: ${response.stats.fusionTime}ms`);
      console.log(`   Total: ${response.stats.totalTime}ms`);
      console.log(`   Estimated tokens: ${response.stats.tokensEstimated}`);
      console.log(`   Context items: ${response.context.length}`);

      if (opts.verbose) {
        console.log(`\n📦 Context:`);
        console.log(JSON.stringify(response.context, null, 2));
      }

      // Store last query in session for feedback
      try {
        const { SessionMemory } = await import("./memory/session.js");
        const session = new SessionMemory(process.cwd());
        await session.init();
        await session.setContext("lastQuery", {
          query,
          classification: response.classification,
          routing: response.routing,
          timestamp: Date.now(),
        });
      } catch (error) {
        // Non-critical - just log silently
        console.debug("Failed to store query in session:", error);
      }

      process.exit(0);
    } catch (error) {
      console.error(pc.red(`\n❌ Context routing failed: ${(error as Error).message}\n`));
      console.error(pc.dim((error as Error).stack));
      process.exit(1);
    }
  });

/**
 * arela update - Check for updates
 */
program
  .command("update")
  .description("Check for arela updates")
  .action(async () => {
    const { forceUpdateCheck } = await import("./utils/update-checker.js");
    await forceUpdateCheck(VERSION);
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
 * arela summarize - Summarize a code file
 */
program
  .command("summarize <file>")
  .description("Summarize a code file using AST + LLM pipeline")
  .option("--no-cache", "Skip cache, force re-summarization")
  .option("--output <format>", "Output format (json|markdown)", "markdown")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(async (file, opts) => {
    try {
      const { CodeSummarizer, summaryToMarkdown } = await import("./summarization/code-summarizer.js");
      
      console.log(pc.cyan(`\n📝 Summarizing ${file}...\n`));
      
      const summarizer = new CodeSummarizer(opts.cwd);
      const summary = await summarizer.summarize(file, { noCache: !opts.cache });
      
      if (opts.output === "json") {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(summaryToMarkdown(summary));
      }
      
      const stats = summarizer.getCacheStats();
      console.log(pc.cyan(`\n📊 Cache Stats: ${stats.hitRate ?? 0}% hit rate, $${stats.savings.toFixed(4)} saved\n`));
    } catch (error) {
      console.error(pc.red(`\n❌ Summarization failed: ${(error as Error).message}\n`));
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

/**
 * arela feedback - Provide feedback on last query result
 */
program
  .command("feedback")
  .description("Provide feedback on last query result")
  .option("--helpful", "Mark as helpful")
  .option("--not-helpful", "Mark as not helpful")
  .option("--correct-layers <layers>", "Correct layer selection (comma-separated)")
  .option("--correct-type <type>", "Correct query type")
  .option("--comment <text>", "Additional comment")
  .action(async (options) => {
    try {
      const { FeedbackLearner } = await import("./learning/index.js");
      const { SessionMemory } = await import("./memory/session.js");
      const { MemoryLayer } = await import("./memory/hexi-memory.js");
      const { QueryType } = await import("./meta-rag/types.js");

      // Initialize feedback learner and session
      const learner = new FeedbackLearner(process.cwd());
      await learner.init();

      const session = new SessionMemory(process.cwd());
      await session.init();

      // Get last query from session
      const lastQueryData = await session.getContext("lastQuery");

      if (!lastQueryData) {
        console.error(pc.red("\n❌ No recent query found in session"));
        console.log(pc.gray("   Run a query with 'arela route' first\n"));
        process.exit(1);
      }

      const { query, classification, routing } = lastQueryData;

      // Build feedback object
      const feedback: any = {
        helpful: options.helpful || false,
        comment: options.comment,
      };

      // Parse correct layers if provided
      if (options.correctLayers) {
        const layerStrings = options.correctLayers.split(",").map((s: string) => s.trim());
        feedback.correctLayers = layerStrings.map((layerStr: string) => {
          if (!Object.values(MemoryLayer).includes(layerStr as any)) {
            console.error(pc.red(`\n❌ Invalid layer: ${layerStr}`));
            console.log(pc.gray("   Valid layers: session, project, user, vector, graph, governance\n"));
            process.exit(1);
          }
          return layerStr;
        });
      }

      // Parse correct type if provided
      if (options.correctType) {
        if (!Object.values(QueryType).includes(options.correctType as any)) {
          console.error(pc.red(`\n❌ Invalid query type: ${options.correctType}`));
          console.log(pc.gray("   Valid types: procedural, factual, architectural, user, historical, general\n"));
          process.exit(1);
        }
        feedback.correctType = options.correctType;
      }

      await learner.recordFeedback(query, classification, routing, feedback);

      console.log(pc.green("\n✅ Feedback recorded. Thank you!\n"));
      console.log(pc.gray("   This helps improve routing accuracy over time"));
      console.log(pc.gray("   View stats with: arela feedback:stats\n"));
    } catch (error) {
      console.error(pc.red("\n❌ Feedback recording failed:"));
      console.error(pc.red((error as Error).message + "\n"));
      process.exit(1);
    }
  });

/**
 * arela feedback:stats - Show learning statistics
 */
program
  .command("feedback:stats")
  .description("Show learning statistics and improvement metrics")
  .action(async () => {
    try {
      const { FeedbackLearner } = await import("./learning/index.js");

      const learner = new FeedbackLearner(process.cwd());
      await learner.init();

      const stats = await learner.getStats();

      console.log(pc.bold(pc.cyan("\n📊 Learning Statistics\n")));

      console.log(pc.bold("Feedback Summary:"));
      console.log(pc.gray(`   Total Feedback: ${stats.totalFeedback}`));
      console.log(pc.gray(`   Helpful Rate: ${stats.helpfulRate.toFixed(1)}%`));

      if (stats.accuracyImprovement !== 0) {
        const improvementColor = stats.accuracyImprovement > 0 ? pc.green : pc.red;
        console.log(improvementColor(`   Accuracy Improvement: ${stats.accuracyImprovement > 0 ? '+' : ''}${stats.accuracyImprovement.toFixed(1)}%`));
      }

      if (stats.commonMistakes.length > 0) {
        console.log(pc.bold("\n🔍 Common Mistakes:"));
        stats.commonMistakes.forEach((mistake, i) => {
          console.log(pc.gray(`   ${i + 1}. ${mistake.pattern} (${mistake.frequency}x)`));
        });
      }

      console.log(pc.bold("\n⚖️  Layer Weights:"));
      Object.entries(stats.layerWeights)
        .sort((a, b) => b[1] - a[1])
        .forEach(([layer, weight]) => {
          const bar = "█".repeat(Math.round(weight * 5));
          const color = weight > 1.0 ? pc.green : weight < 1.0 ? pc.yellow : pc.gray;
          console.log(color(`   ${layer.padEnd(12)}: ${weight.toFixed(2)} ${bar}`));
        });

      console.log("");

      if (stats.totalFeedback < 20) {
        console.log(pc.yellow("💡 Provide more feedback to see accuracy improvement metrics"));
        console.log(pc.gray("   At least 20 feedback entries are needed\n"));
      }
    } catch (error) {
      console.error(pc.red("\n❌ Failed to load statistics:"));
      console.error(pc.red((error as Error).message + "\n"));
      process.exit(1);
    }
  });

registerMemoryCommands(program);

function isDirectCliExecution(): boolean {
  // When installed globally, process.argv[1] is a symlink/wrapper
  // Check if we're being run as a CLI (has argv) vs imported as a module
  // If we have command line arguments, we're being run directly
  return process.argv.length >= 2;
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

// Only parse if running as CLI (not imported as module)
if (isDirectCliExecution()) {
  // Check and auto-refresh graph DB on session start (async, non-blocking)
  (async () => {
    try {
      const { checkAndRefreshGraph } = await import("./ingest/auto-refresh.js");
      await checkAndRefreshGraph({
        cwd: process.cwd(),
        maxAgeHours: 24,
        silent: true, // Silent by default, user can check with `arela status`
      });
    } catch (error) {
      // Silently fail - graph refresh is not critical for all commands
    }
  })();

  program.parse();
}

export { program };
