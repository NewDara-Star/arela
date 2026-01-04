import { upsertFileIndex, searchVectorIndex, checkOllama } from "../slices/vector/ops.js";
import { summarizeScratchpad } from "../slices/focus/ops.js";
import path from "node:path";
import fs from "fs-extra";

const LOG_FILE = "verification_result.txt";

function log(msg: any) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + "\n");
}

async function run() {
    await fs.writeFile(LOG_FILE, ""); // Clear log
    const root = process.cwd();

    log("🧪 Testing Vector Slice (Ollama)...");
    const ollamaUp = await checkOllama();
    if (!ollamaUp) {
        log("❌ Ollama not reachable / model pull failed.");
    } else {
        log("✅ Ollama is up.");

        // Test Indexing
        const testFile = "TEST_VECTOR.md";
        await fs.writeFile(testFile, "The quick brown fox jumps over the lazy dog. Programming is art.");
        await upsertFileIndex(root, testFile);
        log("✅ Indexed test file.");

        // Wait for async file write/debounce if any? (upsert is async but writes to disk)
        await new Promise(r => setTimeout(r, 1000));

        // Test Search
        const results = await searchVectorIndex(root, "lazy dog");
        log(`🔍 Search Results for 'lazy dog': ${JSON.stringify(results.map(r => ({ file: r.file, score: r.score })))}`);

        if (results.some(r => r.file === testFile)) {
            log("✅ Vector Found Match!");
        } else {
            log("❌ Vector Search failed to find local file.");
        }

        await fs.remove(testFile);
    }

    log("\n🧪 Testing Focus Slice (OpenAI)...");
    // Create dummy scratchpad
    const scratchpad = path.join(root, "SCRATCHPAD.md");
    const backup = path.join(root, "SCRATCHPAD.bak"); // Store backup in root to verify restoration
    const hasOriginal = await fs.pathExists(scratchpad);

    // Backup existing
    if (hasOriginal) await fs.copy(scratchpad, backup);

    // Write long dummy content (600 lines)
    const dummyContent = Array(600).fill("Log entry: worked on stuff.").join("\n");
    await fs.writeFile(scratchpad, dummyContent);

    try {
        const result = await summarizeScratchpad(root, true); // Dry run
        log(`🧠 Focus Result: ${result}`);
        if (result.includes("Dry Run Summary") || result.includes("Dry Run")) {
            log("✅ Focus Summarization (Dry Run) worked!");
        } else {
            log(`⚠️ Unexpected Focus output: ${result}`);
        }
    } catch (e) {
        log(`❌ Focus Test Failed: ${e}`);
    } finally {
        // Restore
        if (hasOriginal) {
            await fs.move(backup, scratchpad, { overwrite: true });
            log("✅ Restored original SCRATCHPAD.md");
        } else {
            await fs.remove(scratchpad);
        }
    }
}

run().catch(console.error);
