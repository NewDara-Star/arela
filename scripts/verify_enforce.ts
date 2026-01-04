
import dotenv from "dotenv";
import path from "path";
import { generateGuard } from "../slices/enforce/ops.js";

dotenv.config();

async function run() {
    console.log("🛡️ Testing Anti-Fragility System (arela_enforce)...");

    const projectRoot = path.resolve(process.cwd());

    // Scenario: User complains about missing READMEs in slices
    const issue = "Some slices are missing README.md files.";
    const solution = "Scan all subdirectories in 'slices/' and ensure they contain a README.md. Ignore 'shared' if you want, but generally all slices need docs.";

    console.log(`\n🗣️ Issue: "${issue}"`);
    console.log(`💡 Solution: "${solution}"`);
    console.log("\n⚙️ Generating Guard Script...");

    try {
        const result = await generateGuard(projectRoot, issue, solution);

        console.log("\n✅ Generation Complete!");
        console.log(`📂 Script Path: ${result.scriptPath}`);
        console.log(`📝 Output: ${result.output}`);

        // We aren't running it here, just verifying generation.
        // User would manually run it or CI would pick it up.

    } catch (e: any) {
        console.error("\n❌ Generation Failed:", e.message);
        process.exit(1);
    }
}

run();
