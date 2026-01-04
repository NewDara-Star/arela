#!/usr/bin/env node
/**
 * Arela v5 - Comprehensive Test Suite
 * Tests all 10 MCP tools in sequence
 * 
 * Run: node scripts/test_all.js
 */

import { spawn } from "child_process";

const TESTS = [
    { name: "Context", tool: "arela_context", args: {} },
    { name: "Status", tool: "arela_status", args: {} },
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
    console.log("🧪 ARELA v5 TEST SUITE\n");
    console.log("=".repeat(50));

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
                const response = JSON.parse(line);
                if (response.id !== undefined && pendingRequests.has(response.id)) {
                    const { resolve } = pendingRequests.get(response.id);
                    resolve(response);
                    pendingRequests.delete(response.id);
                }
            } catch (e) { /* ignore non-JSON */ }
        }
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
            const timeout = setTimeout(() => reject(new Error(`Timeout: ${toolName}`)), 30000);
            pendingRequests.set(id, {
                resolve: (res) => {
                    clearTimeout(timeout);
                    resolve(res);
                }
            });
        });
    }

    // Wait for server to start
    await new Promise(r => setTimeout(r, 4000));

    let passed = 0;
    let failed = 0;

    for (const test of TESTS) {
        process.stdout.write(`Testing ${test.name.padEnd(25)} `);
        try {
            const result = await callTool(test.tool, test.args);
            if (result.error) {
                console.log(`❌ ${result.error.message}`);
                failed++;
            } else {
                console.log(`✅ PASS`);
                passed++;
            }
        } catch (e) {
            console.log(`❌ ${e.message}`);
            failed++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("=".repeat(50));

    serverProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
