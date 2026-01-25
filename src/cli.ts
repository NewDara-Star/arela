#!/usr/bin/env node
/**
 * Arela CLI
 * 
 * The AI's Memory Layer for Vibecoding
 */

import { Command } from "commander";
import { runServer } from "./mcp/server.js";
import { checkOllama, searchVectorIndex, buildVectorIndex } from "../slices/vector/ops.js";
import { summarizeScratchpad } from "../slices/focus/ops.js";
import { listPRDs, getPRDStatus } from "../slices/prd/ops.js";
import { indexCodebase } from "../slices/graph/indexer.js";
import { generateTests, runTest } from "../slices/test/ops.js";
import { generateTicket } from "../slices/ticket/ops.js";
import { generateGuard } from "../slices/enforce/ops.js";
import { runChecklist } from "../slices/checklist/ops.js";
import { exportDashboard } from "../slices/dashboard/export.js";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";

const program = new Command();

program
    .name("arela")
    .description("The AI's Memory Layer for Vibecoding")
    .version("5.1.0");

// ============================================
// INIT (MCP CONFIG)
// ============================================
program
    .command("init")
    .description("Bootstrap a repo: MCP config, agents, prompts, scratchpad, and indexes")
    .action(async () => {
        const writeIfChanged = async (destPath: string, content: string) => {
            if (await fs.pathExists(destPath)) {
                const existing = await fs.readFile(destPath, "utf-8");
                if (existing === content) return;
            }
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, content, "utf-8");
        };

        const copyFileIfChanged = async (srcPath: string, destPath: string) => {
            const src = await fs.readFile(srcPath);
            if (await fs.pathExists(destPath)) {
                const dest = await fs.readFile(destPath);
                if (Buffer.compare(src, dest) === 0) return;
            } else {
                await fs.ensureDir(path.dirname(destPath));
            }
            await fs.writeFile(destPath, src);
        };

        const copyDirIfChanged = async (
            srcDir: string,
            destDir: string,
            shouldSkip?: (srcPath: string, entry: fs.Dirent) => boolean
        ) => {
            await fs.ensureDir(destDir);
            const entries = await fs.readdir(srcDir, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(srcDir, entry.name);
                const destPath = path.join(destDir, entry.name);
                if (shouldSkip && shouldSkip(srcPath, entry)) continue;
                if (entry.isDirectory()) {
                    await copyDirIfChanged(srcPath, destPath, shouldSkip);
                } else {
                    await copyFileIfChanged(srcPath, destPath);
                }
            }
        };

        const projectPath = process.cwd();
        const cliPath = fileURLToPath(import.meta.url);
        const cliDir = path.dirname(cliPath);
        const arelaRoot = path.resolve(cliDir, "..", "..");
        const mcpPath = path.join(projectPath, ".mcp.json");

        let config: any = { mcpServers: {} };
        if (await fs.pathExists(mcpPath)) {
            try {
                config = await fs.readJson(mcpPath);
            } catch (e) {
                console.error("❌ Failed to parse existing .mcp.json. Please fix JSON first.");
                process.exit(1);
            }
        }

        if (!config.mcpServers || typeof config.mcpServers !== "object") {
            config.mcpServers = {};
        }

        config.mcpServers.arela = {
            command: "node",
            args: [cliPath, "mcp"],
            env: {
                CWD: projectPath
            }
        };

        await fs.writeJson(mcpPath, config, { spaces: 2 });

        // 1) Write AGENTS.md and .claude/CLAUDE.md
        const agentsSource = path.join(arelaRoot, "AGENTS.md");
        const agentsContent = await fs.readFile(agentsSource, "utf-8");
        await writeIfChanged(path.join(projectPath, "AGENTS.md"), agentsContent);

        const claudeDir = path.join(projectPath, ".claude");
        await fs.ensureDir(claudeDir);
        await writeIfChanged(path.join(claudeDir, "CLAUDE.md"), agentsContent);

        // 2) Prompts folder (skip if source == destination)
        const promptsSource = path.join(arelaRoot, "prompts");
        const promptsTarget = path.join(projectPath, "prompts");
        const promptsSourceExists = await fs.pathExists(promptsSource);
        const promptsTargetExists = await fs.pathExists(promptsTarget);
        let samePrompts = false;
        if (promptsSourceExists && promptsTargetExists) {
            const srcReal = await fs.realpath(promptsSource);
            const dstReal = await fs.realpath(promptsTarget);
            samePrompts = srcReal === dstReal;
        }
        if (!samePrompts) {
            await copyDirIfChanged(promptsSource, promptsTarget);
        }

        // 2b) Dashboard site scaffold (website/)
        const websiteSource = path.join(arelaRoot, "website");
        const websiteTarget = path.join(projectPath, "website");
        const websiteSourceExists = await fs.pathExists(websiteSource);
        let sameWebsite = false;
        if (websiteSourceExists && await fs.pathExists(websiteTarget)) {
            const srcReal = await fs.realpath(websiteSource);
            const dstReal = await fs.realpath(websiteTarget);
            sameWebsite = srcReal === dstReal;
        }
        if (websiteSourceExists && !sameWebsite) {
            const sourceRoot = await fs.realpath(websiteSource);
            const shouldSkip = (srcPath: string, entry: fs.Dirent) => {
                const rel = path.relative(sourceRoot, srcPath).split(path.sep).join("/");
                if (rel.startsWith("node_modules/")) return true;
                if (rel.startsWith("dist/")) return true;
                if (rel.startsWith(".vitepress/cache/")) return true;
                return false;
            };
            await copyDirIfChanged(websiteSource, websiteTarget, shouldSkip);
        }

        // 3) Spec folder and placeholders
        const specDir = path.join(projectPath, "spec");
        await fs.ensureDir(specDir);
        await fs.ensureDir(path.join(specDir, "tickets"));
        await fs.ensureDir(path.join(specDir, "tests", "features"));
        await fs.ensureDir(path.join(specDir, "tests", "steps"));
        const prdPath = path.join(specDir, "prd.json");
        const stackPath = path.join(specDir, "stack.json");
        if (!await fs.pathExists(prdPath)) {
            await fs.writeJson(prdPath, { meta: {}, features: [] }, { spaces: 2 });
        }
        if (!await fs.pathExists(stackPath)) {
            await fs.writeJson(stackPath, { meta: {}, libraries: [] }, { spaces: 2 });
        }

        // 4) Scratchpad
        const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");
        if (!await fs.pathExists(scratchpadPath)) {
            const timestamp = new Date().toISOString();
            const content = `# SCRATCHPAD.md\n\n**Last Updated:** ${timestamp}\n\n## Session Start\n- Project bootstrapped with arela init\n`;
            await fs.writeFile(scratchpadPath, content, "utf-8");
        }

        // 5) task.md (optional tracker)
        const taskPath = path.join(projectPath, "task.md");
        if (!await fs.pathExists(taskPath)) {
            const taskContent = [
                "# task.md",
                "",
                "## Current",
                "- [ ] Paste PRD into spec/prd.json",
                "- [ ] Paste Stack into spec/stack.json",
                "- [ ] Run first arela_context + arela_update",
                ""
            ].join("\n");
            await fs.writeFile(taskPath, taskContent, "utf-8");
        }

        // 6) .gitignore entries
        const gitignorePath = path.join(projectPath, ".gitignore");
        const ignoreLines = [".arela/", ".mcp.json"];
        let gitignore = "";
        if (await fs.pathExists(gitignorePath)) {
            gitignore = await fs.readFile(gitignorePath, "utf-8");
        }
        let changed = false;
        for (const line of ignoreLines) {
            if (!gitignore.split("\n").includes(line)) {
                gitignore += (gitignore.endsWith("\n") || gitignore.length === 0) ? "" : "\n";
                gitignore += line + "\n";
                changed = true;
            }
        }
        if (changed) {
            await fs.writeFile(gitignorePath, gitignore, "utf-8");
        }

        // 7) .arelaignore (privacy + noise)
        const arelaIgnorePath = path.join(projectPath, ".arelaignore");
        if (!await fs.pathExists(arelaIgnorePath)) {
            const ignoreContent = [
                "# Arela ignore (privacy + noise)",
                ".env",
                ".env.*",
                "**/*.pem",
                "**/*.key",
                "**/.aws/**",
                "**/.ssh/**",
                "**/*token*",
                "**/*.sql",
                "**/*.dump",
                "**/*.bak",
                "**/*.sqlite",
                "**/*.db",
                "",
                "# Add private docs or folders below",
                ""
            ].join("\n");
            await fs.writeFile(arelaIgnorePath, ignoreContent, "utf-8");
        }

        // 8) IDE rules (best effort)
        const windsurfRules = path.join(projectPath, ".windsurfrules");
        await writeIfChanged(windsurfRules, agentsContent);

        const cursorRules = path.join(projectPath, ".cursorrules");
        await writeIfChanged(cursorRules, agentsContent);

        const geminiRules = path.join(os.homedir(), ".gemini", "GEMINI.md");
        if (await fs.pathExists(geminiRules)) {
            await writeIfChanged(geminiRules, agentsContent);
        }

        // 9) Ensure Ollama and index
        const ok = await checkOllama();
        if (!ok) {
            throw new Error("Ollama is not reachable. Please install/run Ollama, then re-run init.");
        }

        const showProgress = (label: string) => {
            let last = 0;
            return (current: number, total: number) => {
                if (current === last) return;
                last = current;
                const pct = Math.floor((current / total) * 100);
                process.stdout.write(`\r${label}: ${pct}% (${current}/${total})`);
                if (current === total) process.stdout.write("\n");
            };
        };

        console.log("🕸️  Indexing code graph...");
        await indexCodebase(projectPath, showProgress("Graph"));

        console.log("🔍 Indexing vector memory (RAG)...");
        await buildVectorIndex(projectPath, showProgress("RAG"));

        console.log("📊 Exporting dashboard data...");
        await exportDashboard(projectPath);

        // 10) Start MCP server (background)
        const child = spawn(process.execPath, [cliPath, "mcp"], {
            cwd: projectPath,
            env: { ...process.env, CWD: projectPath },
            detached: true,
            stdio: "ignore"
        });
        child.unref();

        // 11) Health summary
        const graphDb = await fs.pathExists(path.join(projectPath, ".arela/graph.db"));
        const ragIndex = await fs.pathExists(path.join(projectPath, ".arela/.rag-index.json"));
        const dashboardJson = await fs.pathExists(path.join(projectPath, ".arela/dashboard.json"));
        const hasKey = process.env.OPENAPI_KEY || process.env.OPENAI_API_KEY;

        console.log(`✅ Wrote ${mcpPath}`);
        console.log("✅ Bootstrapped AGENTS.md, .claude/CLAUDE.md, prompts/, website/, spec/, SCRATCHPAD.md, task.md, .arelaignore");
        console.log("✅ Indexed Graph + RAG + Dashboard");
        console.log(`✅ MCP server started (pid ${child.pid})`);
        console.log(`✅ Health: Graph DB ${graphDb ? "OK" : "MISSING"} | RAG Index ${ragIndex ? "OK" : "MISSING"} | Dashboard ${dashboardJson ? "OK" : "MISSING"} | OpenAI Key ${hasKey ? "OK" : "MISSING"}`);
        console.log("👉 Paste your PRD and Stack into spec/prd.json and spec/stack.json");
    });

// ============================================
// MCP SERVER
// ============================================
program
    .command("mcp")
    .description("Start MCP server for IDE integration")
    .option("--cwd <dir>", "Working directory")
    .action(async (options) => {
        const cwd = options.cwd ?? process.env.CWD ?? process.cwd();
        await runServer({ cwd });
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
    .option("--feature <id>", "Feature ID (required for JSON PRDs)")
    .action(async (prdPath, options) => {
        const root = process.cwd();
        console.log(`🧪 Generating tests for: ${prdPath}...`);
        try {
            const result = await generateTests(root, prdPath, options.feature);
            console.log("✅ Generation Complete!");
            console.log(`📂 Feature: ${result.featurePath}`);
            console.log(`📂 Steps:   ${result.stepsPath}`);
            await exportDashboard(root);
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
// TICKET GENERATION
// ============================================
const ticketCmd = program.command("ticket").description("Generate implementation tickets");

ticketCmd
    .command("generate <prdPath> <featureId>")
    .description("Generate a ticket from a JSON PRD feature")
    .option("--out <dir>", "Output directory (default: spec/tickets)")
    .action(async (prdPath, featureId, options) => {
        const root = process.cwd();
        console.log(`🧾 Generating ticket for ${featureId}...`);
        try {
            const result = await generateTicket(root, prdPath, featureId, options.out);
            console.log("✅ Ticket Generated!");
            console.log(`📂 Path: ${result.ticketPath}`);
            await exportDashboard(root);
        } catch (e: any) {
            console.error("❌ Failed:", e.message);
        }
    });

// ============================================
// DASHBOARD EXPORT
// ============================================
const dashboardCmd = program.command("dashboard").description("Dashboard export and utilities");

dashboardCmd
    .command("export")
    .description("Export dashboard data to .arela/dashboard.json and website/public/dashboard.json")
    .action(async () => {
        const root = process.cwd();
        console.log("📊 Exporting dashboard data...");
        try {
            await exportDashboard(root);
            console.log("✅ Dashboard export complete.");
        } catch (e: any) {
            console.error("❌ Failed:", e.message);
        }
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

// ============================================
// CHECKLIST (ENFORCEMENT)
// ============================================
program
    .command("check")
    .description("Run the enforcement checklist")
    .option("--no-rigorous", "Skip slow checks")
    .action(async (options) => {
        console.log("🛑 Running Enforcement Checklist...");
        const report = await runChecklist(process.cwd(), { rigorous: options.rigorous });

        console.log(`\n${report.summary}\n`);

        // Print table-like output
        console.table(report.items.map(i => ({
            Check: i.description,
            Status: i.status === "pass" ? "✅" : i.status === "fail" ? "❌" : "⚠️",
            Message: i.message
        })));

        if (report.overallStatus === "fail") {
            process.exit(1);
        }
    });

program.parse();
