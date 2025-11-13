import { Command } from "commander";
import pc from "picocolors";
import { TriMemory, type AuditFilter, type ImpactAnalysis, type MemoryQueryResult, type TriMemoryStats } from "./index.js";

export function registerMemoryCommands(program: Command): void {
  const memory = new Command("memory").description("Tri-Memory System commands");

  memory
    .command("init")
    .description("Initialize Tri-Memory System")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .option("--refresh-graph", "Rebuild graph database", false)
    .option("--refresh-vector", "Rebuild vector index", false)
    .option("--verbose", "Verbose output for ingestion/indexing", false)
    .action(async (opts) => {
      const triMemory = new TriMemory(opts.cwd);
      const stats = await triMemory.init({
        refreshGraph: opts.refreshGraph,
        refreshVector: opts.refreshVector,
        verbose: opts.verbose,
      });

      console.log(pc.bold(pc.cyan("\n🧠 Tri-Memory Initialized\n")));
      printStats(stats);
      console.log(pc.green("\n🎉 Tri-Memory ready!\n"));
    });

  memory
    .command("query")
    .description("Query semantic memory")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .option("--top-k <n>", "Number of semantic results", "5")
    .argument("<question>", "Natural language question")
    .action(async (question, opts) => {
      const triMemory = new TriMemory(opts.cwd);
      const result = await triMemory.query(question, parseInt(opts.topK, 10));
      printQueryResult(result);
    });

  memory
    .command("impact")
    .description("Analyze file impact via graph memory")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .argument("<file>", "File path")
    .action(async (file, opts) => {
      const triMemory = new TriMemory(opts.cwd);
      const impact = await triMemory.impact(file);
      printImpact(impact);
    });

  memory
    .command("audit")
    .description("View governance log")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .option("--commit <hash>", "Filter by commit hash")
    .option("--ticket <id>", "Filter by ticket ID")
    .option("--limit <n>", "Max entries to return", "25")
    .action(async (opts) => {
      const triMemory = new TriMemory(opts.cwd);
      const filter: AuditFilter = {
        commitHash: opts.commit,
        ticketId: opts.ticket,
        limit: parseInt(opts.limit, 10),
      };
      const trail = await triMemory.auditTrail(filter);

      console.log(pc.bold(pc.cyan("\n📜 Governance Log\n")));
      if (trail.entries.length === 0) {
        console.log(pc.gray("No audit entries found."));
        return;
      }

      console.log(
        pc.gray(
          `Scope: ${trail.scope}${trail.filter ? ` (${trail.filter})` : ""} — ${trail.entries.length} entr${
            trail.entries.length === 1 ? "y" : "ies"
          }\n`
        )
      );

      for (const entry of trail.entries) {
        console.log(`${pc.green(entry.timestamp)} • ${pc.bold(entry.agent)} • ${entry.action} • ${entry.result}`);
        if (entry.ticketId) {
          console.log(pc.gray(`   Ticket: ${entry.ticketId}`));
        }
        if (entry.commitHash) {
          console.log(pc.gray(`   Commit: ${entry.commitHash}`));
        }
        if (entry.metadata) {
          console.log(pc.gray(`   Metadata: ${JSON.stringify(entry.metadata)}`));
        }
        if (entry.policyViolations && entry.policyViolations.length > 0) {
          console.log(pc.red(`   Policy Violations: ${JSON.stringify(entry.policyViolations)}`));
        }
        console.log("");
      }
    });

  memory
    .command("status")
    .description("Tri-Memory health check")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .action(async (opts) => {
      const triMemory = new TriMemory(opts.cwd);
      const stats = await triMemory.getStats();
      printStats(stats);
    });

  program.addCommand(memory);
}

function printStats(stats: TriMemoryStats): void {
  console.log(pc.bold(pc.cyan("📊 Memory Stats\n")));
  console.log(formatStatLine("Vector DB", stats.vector.ready, [
    `files: ${stats.vector.filesIndexed}`,
    `embeddings: ${stats.vector.embeddings}`,
    stats.vector.model ? `model: ${stats.vector.model}` : undefined,
  ]));

  console.log(
    formatStatLine("Graph DB", stats.graph.ready, [
      `files: ${stats.graph.files}`,
      `imports: ${stats.graph.imports}`,
      `functions: ${stats.graph.functions}`,
    ])
  );

  console.log(
    formatStatLine("Governance Log", stats.audit.ready, [
      `entries: ${stats.audit.entries}`,
      `success: ${stats.audit.success}`,
      `failure: ${stats.audit.failure}`,
    ])
  );
}

function formatStatLine(label: string, ready: boolean, details: Array<string | undefined>): string {
  const icon = ready ? pc.green("✅") : pc.red("⚠️ ");
  const text = ready ? pc.green("Ready") : pc.red("Not ready");
  const filtered = details.filter(Boolean).join(", ");
  return `${icon} ${pc.bold(label)} — ${text}${filtered ? pc.gray(` (${filtered})`) : ""}`;
}

function printQueryResult(result: MemoryQueryResult): void {
  console.log(pc.bold(pc.cyan("\n🔍 Semantic Memory\n")));
  result.semantic.forEach((match, index) => {
    console.log(
      `${pc.bold(`#${index + 1}`)} ${match.file} ${pc.gray(`score: ${match.score.toFixed(4)}`)}\n   ${pc.gray(
        match.snippet
      )}\n`
    );
  });

  if (result.relatedFiles.length > 0) {
    console.log(pc.bold(pc.cyan("🕸️  Related Files")));
    result.relatedFiles.forEach((file) => console.log(pc.gray(` - ${file}`)));
    console.log("");
  }
}

function printImpact(impact: ImpactAnalysis): void {
  console.log(pc.bold(pc.cyan(`\n📂 Impact for ${impact.file}\n`)));

  if (!impact.exists) {
    console.log(pc.red("File not found in graph memory. Run `arela ingest codebase` first."));
    return;
  }

  console.log(pc.gray(`Fan-in: ${impact.fanIn} • Fan-out: ${impact.fanOut}\n`));

  if (impact.upstream.length === 0) {
    console.log(pc.green("No upstream dependencies.\n"));
  } else {
    console.log(pc.bold(pc.cyan("⬆️  Upstream")));
    impact.upstream.forEach((edge) => {
      console.log(` - ${edge.file} ${pc.gray(`(${edge.reason}, weight ${edge.weight})`)}`);
    });
    console.log("");
  }

  if (impact.downstream.length === 0) {
    console.log(pc.green("No downstream dependencies.\n"));
  } else {
    console.log(pc.bold(pc.cyan("⬇️  Downstream")));
    impact.downstream.forEach((edge) => {
      console.log(` - ${edge.file} ${pc.gray(`(${edge.reason}, weight ${edge.weight})`)}`);
    });
    console.log("");
  }
}
