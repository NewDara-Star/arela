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
import { generateTests, runTest } from "../slices/test/ops.js";
import { generateGuard } from "../slices/enforce/ops.js";
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

        // 4. Check Test Suit
        const cucumber = await fs.pathExists(path.join(root, "node_modules/.bin/cucumber-js"));
        console.log(`🥒 Cucumber:        ${cucumber ? "✅ Installed" : "❌ Missing"}`);

        // 5. Check Guards
        const guards = await fs.pathExists(path.join(root, "scripts/guards"));
        const guardCount = guards ? (await fs.readdir(path.join(root, "scripts/guards"))).length : 0;
        console.log(`🛡️  Enforce Guards:  ${guards ? `✅ Found (${guardCount})` : "❌ Missing"}`);
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

// ============================================
// TEST ENGINE
// ============================================
const testCmd = program.command("test").description("Manage generated tests");

testCmd
    .command("generate <prdPath>")
    .description("Generate tests from a PRD")
    .action(async (prdPath) => {
        const root = process.cwd();
        console.log(`🧪 Generating tests for: ${prdPath}...`);
        try {
            const result = await generateTests(root, prdPath);
            console.log("✅ Generation Complete!");
            console.log(`📂 Feature: ${result.featurePath}`);
            console.log(`📂 Steps:   ${result.stepsPath}`);
        } catch (e: any) {
            console.error("❌ Failed:", e.message);
        }
    });

testCmd
    .command("run <featurePath>")
    .description("Run a specific feature test")
    .action(async (featurePath) => {
        const root = process.cwd();
        console.log(`🏃 Running test: ${featurePath}...`);
        const result = await runTest(root, featurePath);
        console.log(result.output);
        console.log(`\nResult: ${result.success ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Duration: ${result.durationMs}ms`);
    });

// ============================================
// ENFORCE ENGINE (ANTI-FRAGILITY)
// ============================================
program
    .command("enforce")
    .description("Create a permanent regression guard")
    .argument("<issue>", "Description of the failure")
    .argument("<solution>", "Strategy to prevent it")
    .action(async (issue, solution) => {
        const root = process.cwd();
        console.log("🛡️  Creating Guardrail...");
        try {
            const result = await generateGuard(root, issue, solution);
            console.log("✅ Guard Created!");
            console.log(`📂 Path: ${result.scriptPath}`);
            console.log("\nNote: Please add this script to your CI/CD or package.json scripts.");
        } catch (e: any) {
            console.error("❌ Failed:", e.message);
        }
    });

program.parse();
