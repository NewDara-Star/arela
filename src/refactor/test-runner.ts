/**
 * Test runner for verifying slice extraction
 */

import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import type { TestResult } from "./types.js";

export class TestRunner {
  /**
   * Detect the test framework used in the project
   */
  async detectTestFramework(cwd: string = process.cwd()): Promise<string> {
    const packageJsonPath = path.join(cwd, "package.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      return "none";
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for common test frameworks
    if (deps.vitest) return "vitest";
    if (deps.jest) return "jest";
    if (deps.mocha) return "mocha";
    if (deps.pytest) return "pytest";
    if (deps["@testing-library/react"]) return "jest"; // Likely using Jest

    return "none";
  }

  /**
   * Run tests and return results
   */
  async runTests(
    cwd: string = process.cwd(),
    framework?: string
  ): Promise<TestResult> {
    const detectedFramework = framework || (await this.detectTestFramework(cwd));

    if (detectedFramework === "none") {
      return {
        passed: true,
        framework: "none",
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        failedTestNames: [],
        output: "No test framework detected",
      };
    }

    try {
      const result = await this.runTestCommand(detectedFramework, cwd);
      return result;
    } catch (error) {
      // Parse error output to extract test results
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        framework: detectedFramework,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        failedTestNames: ["Test execution failed"],
        output: errorMessage,
      };
    }
  }

  /**
   * Run test command for specific framework
   */
  private async runTestCommand(
    framework: string,
    cwd: string
  ): Promise<TestResult> {
    let command = "";
    let args: string[] = [];

    switch (framework) {
      case "vitest":
        command = "vitest";
        args = ["run"];
        break;
      case "jest":
        command = "jest";
        args = ["--json"];
        break;
      case "mocha":
        command = "mocha";
        args = [];
        break;
      case "pytest":
        command = "pytest";
        args = ["--json-report"];
        break;
      default:
        throw new Error(`Unknown test framework: ${framework}`);
    }

    try {
      const result = await execa(command, args, {
        cwd,
        timeout: 120000, // 2 minutes
      });

      return this.parseTestOutput(result.stdout, framework);
    } catch (error) {
      const output =
        error instanceof Error ? error.message : String(error);
      return this.parseTestOutput(output, framework);
    }
  }

  /**
   * Parse test output based on framework
   */
  private parseTestOutput(output: string, framework: string): TestResult {
    let passed = false;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const failedTestNames: string[] = [];

    try {
      if (framework === "jest") {
        // Jest outputs JSON
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          passed = json.success;
          totalTests = json.numTotalTests || 0;
          passedTests = json.numPassedTests || 0;
          failedTests = json.numFailedTests || 0;

          if (json.testResults) {
            for (const suite of json.testResults) {
              if (suite.assertionResults) {
                for (const test of suite.assertionResults) {
                  if (test.status === "failed") {
                    failedTestNames.push(
                      `${suite.name}: ${test.fullName}`
                    );
                  }
                }
              }
            }
          }
        }
      } else if (framework === "vitest") {
        // Vitest outputs text, parse for patterns
        const passMatch = output.match(/(\d+)\s+passed/);
        const failMatch = output.match(/(\d+)\s+failed/);

        passedTests = passMatch ? parseInt(passMatch[1]) : 0;
        failedTests = failMatch ? parseInt(failMatch[1]) : 0;
        totalTests = passedTests + failedTests;
        passed = failedTests === 0;

        // Extract failed test names
        const failedMatches = output.matchAll(/✓|×\s+(.+?)(?:\n|$)/g);
        for (const match of failedMatches) {
          if (match[0].startsWith("×")) {
            failedTestNames.push(match[1] || "Unknown test");
          }
        }
      } else if (framework === "mocha") {
        // Mocha format
        const passMatch = output.match(/(\d+)\s+passing/);
        const failMatch = output.match(/(\d+)\s+failing/);

        passedTests = passMatch ? parseInt(passMatch[1]) : 0;
        failedTests = failMatch ? parseInt(failMatch[1]) : 0;
        totalTests = passedTests + failedTests;
        passed = failedTests === 0;
      } else if (framework === "pytest") {
        // Pytest format
        const passMatch = output.match(/(\d+)\s+passed/);
        const failMatch = output.match(/(\d+)\s+failed/);

        passedTests = passMatch ? parseInt(passMatch[1]) : 0;
        failedTests = failMatch ? parseInt(failMatch[1]) : 0;
        totalTests = passedTests + failedTests;
        passed = failedTests === 0;
      }
    } catch {
      // If parsing fails, check for common success indicators
      passed = !output.includes("FAILED") && !output.includes("failed");
    }

    return {
      passed,
      framework,
      totalTests,
      passedTests,
      failedTests,
      failedTestNames,
      output,
    };
  }
}
