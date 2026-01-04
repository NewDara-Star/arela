
import { generateTests, runTest } from "../slices/test/ops.js";
import path from "path";
import fs from "fs-extra";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const projectRoot = process.cwd();
    const prdPath = "prds/spec-to-test-compiler.prd.md";

    console.log("🧪 Starting Compiler Verification (Self-Hosting)...");

    try {
        // 1. Generate
        console.log(`\n📝 Generating tests from ${prdPath}...`);
        const genResult = await generateTests(projectRoot, prdPath);

        console.log("✅ Generation Complete.");
        console.log(`   Feature: ${genResult.featurePath}`);
        console.log(`   Steps:   ${genResult.stepsPath}`);

        // Read content preview
        console.log("\n--- Feature Preview ---");
        console.log(genResult.featureContent.slice(0, 200) + "...");

        console.log("\n--- Steps Preview ---");
        console.log(genResult.stepsContent.slice(0, 200) + "...");

        // 2. Run
        console.log(`\n🏃 Running generated test: ${genResult.featurePath}...`);
        const runResult = await runTest(projectRoot, genResult.featurePath);

        if (runResult.success) {
            console.log("✅ Test PASSED!");
        } else {
            console.error("❌ Test FAILED!");
        }
        console.log(`   Duration: ${runResult.durationMs}ms`);
        console.log("\n--- Output ---");
        console.log(runResult.output);

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

main();
