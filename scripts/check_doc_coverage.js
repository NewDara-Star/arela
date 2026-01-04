#!/usr/bin/env node
/**
 * Documentation Coverage Checker
 * 
 * Programmatic enforcement of AGENTS.md Rule #8:
 * "Every new feature or tool MUST have a corresponding page in website/"
 * 
 * This script:
 * 1. Scans server.ts for registered MCP tools
 * 2. Checks if each tool has a doc page in website/tools/
 * 3. Fails with exit code 1 if any are missing
 * 
 * Run: node scripts/check_doc_coverage.js
 * Add to CI: npm run check:docs
 */

import fs from "fs-extra";
import path from "path";

const SERVER_PATH = "src/mcp/server.ts";
const DOCS_DIR = "website/tools";

async function checkDocCoverage() {
    console.log("📚 DOCUMENTATION COVERAGE CHECK\n");
    console.log("=".repeat(50));

    // 1. Read server.ts
    const serverCode = await fs.readFile(SERVER_PATH, "utf-8");

    // 2. Extract tool names using regex
    const toolPattern = /server\.registerTool\(\s*["']([^"']+)["']/g;
    const tools = [];
    let match;
    while ((match = toolPattern.exec(serverCode)) !== null) {
        tools.push(match[1]);
    }

    console.log(`\nFound ${tools.length} registered tools in server.ts:\n`);

    // 3. Check each tool has docs
    let missing = [];
    let present = [];

    for (const tool of tools) {
        // Convert tool name to doc filename
        // arela_vector_search -> vector-search.md
        const docName = tool.replace("arela_", "").replace(/_/g, "-") + ".md";
        const docPath = path.join(DOCS_DIR, docName);

        if (await fs.pathExists(docPath)) {
            console.log(`  ✅ ${tool} → ${docName}`);
            present.push(tool);
        } else {
            console.log(`  ❌ ${tool} → ${docName} (MISSING!)`);
            missing.push({ tool, expected: docPath });
        }
    }

    // 4. Also check if tools/index.md exists
    const indexPath = path.join(DOCS_DIR, "index.md");
    if (await fs.pathExists(indexPath)) {
        console.log(`\n  ✅ Tools index page exists`);
    } else {
        console.log(`\n  ❌ Tools index page missing (${indexPath})`);
        missing.push({ tool: "tools/index", expected: indexPath });
    }

    // 5. Report
    console.log("\n" + "=".repeat(50));
    console.log(`Results: ${present.length} documented, ${missing.length} missing`);

    if (missing.length > 0) {
        console.log("\n❌ ENFORCEMENT FAILED: Missing documentation!\n");
        console.log("Create these files to comply with AGENTS.md Rule #8:");
        for (const m of missing) {
            console.log(`  - ${m.expected}`);
        }
        console.log("\nNo feature is complete without documentation.\n");
        process.exit(1);
    } else {
        console.log("\n✅ ALL TOOLS DOCUMENTED\n");
        console.log("AGENTS.md Rule #8 is satisfied.\n");
        process.exit(0);
    }
}

checkDocCoverage().catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
});
