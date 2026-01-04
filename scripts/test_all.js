#!/usr/bin/env node
/**
 * Arela v5 - Comprehensive Test Suite
 * Tests all 10 MCP tools in sequence
 * 
 * Run: node scripts/test_all.js
 */

import { spawn } from "child_process";
import fs from "fs-extra";

const REPORT_FILE = "test_report.txt";

function log(msg) {
    console.log(msg);
    fs.appendFileSync(REPORT_FILE, msg + "\n");
}

const TESTS = [
    { name: "Status (warmup)", tool: "arela_status", args: {} },
    { name: "Context", tool: "arela_context", args: {} },
    { name: "Verify (file_exists)", tool: "arela_verify", args: { claim: "AGENTS.md exists", path: "AGENTS.md", type: "file_exists" } },
    { name: "Verify (contains)", tool: "arela_verify", args: { claim: "TRUTH > LIKABILITY in AGENTS", path: "AGENTS.md", type: "contains", pattern: "TRUTH" } },
    { name: "Graph Refresh", tool: "arela_graph_refresh", args: {} },
    { name: "Graph Impact", tool: "arela_graph_impact", args: { path: "slices/graph/schema.ts" } },
    { name: "Vector Search", tool: "arela_vector_search", args: { query: "memory update logic" } },
    { name: "Focus (dry-run)", tool: "arela_focus", args: { dryRun: true } },
    { name: "Translate", tool: "arela_translate", args: { vibe: "Add a README to the docs folder" } },
    { name: "Update (append)", tool: "arela_update", args: { content: "Test Suite Run Complete", mode: "append" } },
];

async function runTests() {
    await fs.writeFile(REPORT_FILE, "");
    log("🧪 ARELA v5 TEST SUITE\n");
    log("=".repeat(50));

    const serverProcess = spawn("node", ["dist/src/cli.js", "mcp"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd()
    });

    let messageId = 0;
    const pendingRequests = new Map();

    serverProcess.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                // Check if it's a JSONRPC response
                if (line.trim().startsWith("{")) {
                    const response = JSON.parse(line);
                    if (response.id !== undefined && pendingRequests.has(response.id)) {
                        const { resolve } = pendingRequests.get(response.id);
                        resolve(response);
                        pendingRequests.delete(response.id);
                    }
                } else {
                    // Log non-JSON output from server
                    log(`[SERVER STDOUT] ${line}`);
                }
            } catch (e) {
                log(`[SERVER STDOUT RAW] ${line}`);
            }
        }
    });

    serverProcess.stderr.on("data", (data) => {
        log(`[SERVER STDERR] ${data}`);
    });

    async function callTool(toolName, args = {}) {
        messageId++;
        const id = messageId;

        const request = {
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name: toolName, arguments: args }
        };

        serverProcess.stdin.write(JSON.stringify(request) + "\n");

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout"));
                pendingRequests.delete(id);
            }, 10000);

            pendingRequests.set(id, {
                resolve: (res) => {
                    clearTimeout(timeout);
                    resolve(res);
                }
            });
        });
    }

    // Wait for server to start (Vector + Graph auto-indexers need time)
    log("Waiting for server startup...");
    await new Promise(r => setTimeout(r, 5000));

    let passed = 0;
    let failed = 0;

    for (const test of TESTS) {
        log(`Testing ${test.name.padEnd(25)}... `);
        try {
            const result = await callTool(test.tool, test.args);
            if (result.error) {
                log(`❌ FAIL: ${result.error.message}`);
                if (result.error.data) log(`   Data: ${JSON.stringify(result.error.data)}`);
                failed++;
            } else {
                log(`✅ PASS`);
                // log(`   Result: ${JSON.stringify(result.result)}`);
                passed++;
            }
        } catch (e) {
            log(`❌ CRASH: ${e.message}`);
            failed++;
        }
    }

    log("\n" + "=".repeat(50));
    log(`Results: ${passed} passed, ${failed} failed`);
    log("=".repeat(50));

    serverProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
    console.error(e);
    fs.appendFileSync(REPORT_FILE, `FATAL: ${e.message}\n`);
});
