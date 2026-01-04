import { execa } from "execa";
import path from "path";
import { TestResult } from "./types.js";

export async function runTest(projectPath: string, featurePath: string): Promise<TestResult> {
    const startTime = Date.now();
    try {
        // Construct paths
        // featurePath is relative, e.g. "tests/features/hello.feature"

        // Command: npx cucumber-js [feature] --require [steps] --require-module ts-node/register
        const result = await execa("npx", [
            "cucumber-js",
            featurePath,
            "--require", "tests/steps/*.ts",
            "--require-module", "ts-node/register",
            "--format", "progress"
        ], {
            cwd: projectPath,
            reject: false
        });

        return {
            success: result.exitCode === 0,
            output: result.stdout + "\n" + result.stderr,
            durationMs: Date.now() - startTime
        };

    } catch (e: any) {
        return {
            success: false,
            output: `Execution failed: ${e.message}`,
            durationMs: Date.now() - startTime
        };
    }
}
