import { execa } from "execa";
import path from "path";
import fs from "fs-extra";
import { TestResult } from "./types.js";
import { exportDashboard } from "../dashboard/export.js";

type StoredTestResult = TestResult & { featurePath: string; timestamp: string };

export async function runTest(projectPath: string, featurePath: string): Promise<TestResult> {
    const startTime = Date.now();
    try {
        // Construct paths
        // featurePath is relative, e.g. "spec/tests/features/hello.feature"

        // Command: npx tsx node_modules/.bin/cucumber-js [feature] --import [steps]
        // This wraps the execution in tsx environment
        const cmd = "npx";
        const specSteps = path.join("spec", "tests", "steps", "*.ts");
        const legacySteps = path.join("tests", "steps", "*.ts");
        const stepsGlob = await fs.pathExists(path.join(projectPath, "spec", "tests", "steps"))
            ? specSteps
            : legacySteps;
        const args = [
            "tsx",
            path.join("node_modules", ".bin", "cucumber-js"),
            featurePath,
            "--import", stepsGlob,
            "--format", "progress"
        ];

        const result = await execa(cmd, args, {
            cwd: projectPath,
            reject: false
        });

        const output = result.stdout + "\n" + result.stderr;
        const testResult: TestResult = {
            success: result.exitCode === 0,
            output,
            durationMs: Date.now() - startTime
        };

        await persistTestResult(projectPath, featurePath, testResult);
        try {
            await exportDashboard(projectPath);
        } catch {
            // Dashboard export is best-effort
        }
        return testResult;

    } catch (e: any) {
        return {
            success: false,
            output: `Execution failed: ${e.message}`,
            durationMs: Date.now() - startTime
        };
    }
}

async function persistTestResult(projectPath: string, featurePath: string, result: TestResult) {
    const resultsPath = path.join(projectPath, ".arela", "test-results.json");
    const timestamp = new Date().toISOString();
    const relativeFeaturePath = path.isAbsolute(featurePath)
        ? path.relative(projectPath, featurePath)
        : featurePath;
    const normalizedFeaturePath = relativeFeaturePath.split(path.sep).join("/");
    let existing: { generated: string; results: StoredTestResult[] } = { generated: timestamp, results: [] };

    try {
        if (await fs.pathExists(resultsPath)) {
            existing = await fs.readJson(resultsPath);
        }
    } catch {
        // ignore parse errors, overwrite with fresh
    }

    const entry: StoredTestResult = { ...result, featurePath: normalizedFeaturePath, timestamp };
    existing.results = existing.results.filter(r => r.featurePath !== normalizedFeaturePath);
    existing.results.unshift(entry);
    existing.generated = timestamp;

    await fs.ensureDir(path.dirname(resultsPath));
    await fs.writeJson(resultsPath, existing, { spaces: 2 });
}
