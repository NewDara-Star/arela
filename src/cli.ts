#!/usr/bin/env node
/**
 * Arela CLI
 * 
 * The AI's Memory Layer for Vibecoding
 */

import { Command } from "commander";
import { runServer } from "./mcp/server.js";
import { checkOllama, startAutoIndexer, searchVectorIndex, buildVectorIndex } from "../slices/vector/ops.js";
import { summarizeScratchpad } from "../slices/focus/ops.js";
import { listPRDs, getPRDStatus } from "../slices/prd/ops.js";
import { indexCodebase } from "../slices/graph/indexer.js";
import fs from "fs-extra";
import path from "node:path";

const program = new Command();

program
    .name("arela")
    .description("The AI's Memory Layer for Vibecoding")
    .version("5.0.0");

// ============================================
// MCP SERVER
// ============================================
program
    .command("mcp")
    .description("Start MCP server for IDE integration")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .action(async (options) => {
        await runServer({ cwd: options.cwd });
    });

// ============================================
// STATUS & HEALTH
// ============================================
program
    .command("status")
    .description("Check system health and connected components")
    .action(async () => {
        console.log("🏥 Arela Health Check\n");
        const root = process.cwd();

        // 1. Check Ollama
        const ollama = await checkOllama();
        console.log(`🧠 Ollama Logic:     ${ollama ? "✅ Connected" : "❌ Not Reachable"}`);

        // 2. Check OpenAI Key
        const hasKey = process.env.OPENAPI_KEY || process.env.OPENAI_API_KEY;
        // Don't print key, just check presence (and maybe dotenv load)
        console.log(`🔑 OpenAI Key:      ${hasKey ? "✅ Present" : "❌ Missing (.env?)"}`);

        // 3. Check Filesystem
        const scratchpad = await fs.pathExists(path.join(root, "SCRATCHPAD.md"));
        console.log(`📝 SCRATCHPAD.md:   ${scratchpad ? "✅ Found" : "❌ Missing"}`);

        const graphDb = await fs.pathExists(path.join(root, ".arela/graph.db"));
        console.log(`🕸️  Graph DB:        ${graphDb ? "✅ Found" : "❌ Missing"}`);

        const index = await fs.pathExists(path.join(root, ".rag-index.json")); // OLD NAME, check slice?
        const ragIndex = await fs.pathExists(path.join(root, ".arela/.rag-index.json"));
        console.log(`👁️  Vector Index:    ${ragIndex || index ? "✅ Found" : "❌ Missing"}`);
    });

// ============================================
// VECTOR MEMORY
// ============================================
const vector = program.command("vector").description("Manage vector memory");

vector
    .command("search <query>")
    .description("Search the codebase using embeddings")
    .action(async (query) => {
        const root = process.cwd();
        console.log(`🔍 Searching for: "${query}"...`);
        try {
            const results = await searchVectorIndex(root, query);
            if (results.length === 0) {
                console.log("No results found.");
                return;
            }
            console.log("\nTop Matches:");
            results.forEach((r, i) => {
                console.log(`${i + 1}. [${r.score.toFixed(2)}] ${r.file}`);
                console.log(`   "${r.chunk.replace(/\n/g, " ").slice(0, 100)}..."`);
            });
        } catch (e) {
            console.error("Failed:", e);
        }
    });

vector
    .command("reindex")
    .description("Rebuild index from scratch")
    .action(async () => {
        console.log("👁️  Rebuilding Vector Index...");
        const count = await buildVectorIndex(process.cwd());
        console.log(`✅ Indexed ${count} files.`);
    });

// ============================================
// GRAPH MEMORY
// ============================================
const graph = program.command("graph").description("Manage graph memory");

graph
    .command("refresh")
    .description("Rebuild dependency graph")
    .action(async () => {
        console.log("🕸️  Rebuilding Graph...");
        const count = await indexCodebase(process.cwd());
        console.log(`✅ Indexed ${count} files.`);
    });

// ============================================
// FOCUS (SUMMARIZATION)
// ============================================
program
    .command("focus")
    .description("Summarize SCRATCHPAD.md (Context Rolling)")
    .option("--dry-run", "Preview only", false)
    .action(async (options) => {
        console.log("🧠 Rolling Context...");
        const result = await summarizeScratchpad(process.cwd(), options.dryRun);
        console.log("\n" + result);
    });

// ============================================
// PRD MANAGEMENT
// ============================================
const prd = program.command("prd").description("Manage Product Requirement Documents");

prd
    .command("list")
    .description("List all PRDs")
    .action(async () => {
        const prds = await listPRDs();
        console.log(`📋 Found ${prds.length} PRDs:\n`);
        prds.forEach((p: any) => {
            console.log(`- [${p.id}] ${p.title} (${p.status})`);
        });
    });

program.parse();
