import { execa } from "execa";
import path from "path";
import { TestResult } from "./types.js";

export async function runTest(projectPath: string, featurePath: string): Promise<TestResult> {
    const startTime = Date.now();
    try {
        // Construct paths
        // featurePath is relative, e.g. "tests/features/hello.feature"

        // Command: npx tsx node_modules/.bin/cucumber-js [feature] --import [steps]
        // This wraps the execution in tsx environment
        const cmd = "npx";
        const args = [
            "tsx",
            path.join("node_modules", ".bin", "cucumber-js"),
            featurePath,
            "--import", "tests/steps/*.ts",
            "--format", "progress"
        ];

        const result = await execa(cmd, args, {
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
