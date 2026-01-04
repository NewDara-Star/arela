
import { controlTools } from "../src/mcp/tools/control.js";
import { integrationTools } from "../src/mcp/tools/integration.js";
import { miscTools } from "../src/mcp/tools/misc.js";
import { checklistTools } from "../slices/checklist/tools.js";

const allTools = [
    ...controlTools,
    ...integrationTools,
    ...miscTools,
    ...checklistTools
];

const mockContext = {
    server: {} as any,
    projectPath: process.cwd(),
    requireSession: () => ({ blocked: false })
};

async function runVerification() {
    console.error("🧪 Starting Logic Verification Suite...\n");
    let failures = 0;

    for (const tool of allTools) {
        console.error(`Please wait... Testing [${tool.name}]...`);
        try {
            // Prepare mock args based on schema
            let args = {};
            if (tool.name === "arela_update") args = { content: "Test update", mode: "append" };
            if (tool.name === "arela_vector_search") args = { query: "test", limit: 1 };
            if (tool.name === "arela_graph_impact") args = { path: "src/cli.ts" };
            if (tool.name === "read_file") args = { path: "package.json" };
            if (tool.name === "list_dir") args = { path: "src" };
            if (tool.name === "edit_file") args = { path: "SCRATCHPAD.md", edits: [], dryRun: true };
            if (tool.name === "write_file") continue; // Skip destructive
            if (tool.name === "delete_file") continue; // Skip destructive
            if (tool.name === "move_file") continue; // Skip destructive
            if (tool.name === "create_dir") continue; // Skip destructive
            if (tool.name === "arela_checklist") args = { rigorous: false };
            if (tool.name === "arela_translate") args = { vibe: "build a backend" };
            if (tool.name === "arela_prd") args = { action: "list" };
            if (tool.name === "arela_verify") args = { claim: "File exists", path: "package.json", type: "file_exists" };
            // Skip confirm/reject hypothesis as they need specific IDs
            if (tool.name.includes("hypothesis")) continue;

            // Capture stdout to check for pollution
            const originalStdoutWrite = process.stdout.write;
            let capturedStdout = "";
            process.stdout.write = (chunk: any) => {
                capturedStdout += chunk.toString();
                return true;
            };

            // Run Handler
            await tool.handler(args, mockContext);

            // Restore stdout
            process.stdout.write = originalStdoutWrite;

            if (capturedStdout.trim().length > 0) {
                console.error(`❌ [${tool.name}] FAILED: Polluted STDOUT with: "${capturedStdout.slice(0, 50)}..."`);
                failures++;
            } else {
                console.error(`✅ [${tool.name}] PASSED`);
            }

        } catch (e: any) {
            console.error(`❌ [${tool.name}] CRASHED: ${e.message}`);
            failures++;
        }
    }

    console.error(`\n📊 Result: ${failures === 0 ? "ALL CLEAN" : `${failures} FAILURES`}`);
    if (failures > 0) process.exit(1);
}

runVerification();
