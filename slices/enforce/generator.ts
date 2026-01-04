
import fs from "fs-extra";
import path from "path";
import { askOpenAI } from "../shared/openai.js";
import { GuardScript, EnforcementResult } from "./types.js";
import { execa } from "execa";

export async function generateGuard(projectPath: string, issue: string, solution: string): Promise<EnforcementResult> {

    // 1. Generate Script Content
    const systemPrompt = "You are a Senior DevOps Engineer. You write Node.js scripts to enforce codebase quality.";
    const userPrompt = `
Context: A user reported a regression/issue in our codebase.
Issue: "${issue}"
Proposed Solution Strategy: "${solution}"

Task: Write a standalone Node.js script (using 'fs-extra', 'glob', or standard lib) that:
1. Scans the codebase.
2. Checks for the violation described.
3. Exits with code 1 if violation found (and prints error).
4. Exits with code 0 if all good.

IMPORTANT: Use ESM syntax (import/export), NOT CommonJS (require).
Output ONLY the raw JavaScript/TypeScript code. No markdown.
Target file path: scripts/guards/[descriptive_name].ts
`;

    const response = await askOpenAI(systemPrompt, userPrompt);

    // Parse response (simple heuristic)
    const code = response.replace(/```(typescript|ts|javascript|js)?/g, "").replace(/```/g, "").trim();

    // Determine filename
    // Ask LLM or just derive? Let's ask LLM for a filename in a structured way next time. 
    // For now, heuristic:
    const nameMatch = response.match(/Target file path: (.*)/);
    let filename = nameMatch ? nameMatch[1].trim() : `scripts/guards/enforce_${Date.now()}.ts`;
    if (!filename.endsWith(".ts")) filename += ".ts";

    // 2. Save Script
    const fullPath = path.join(projectPath, filename);
    await fs.outputFile(fullPath, code);

    // 3. Verify (Dry Run)
    // We run it. If it fails (exit 1), it means it CAUGHT something (or is broken).
    // Ideally we want to know if it *works*.
    // For this MVP, we just return the path.

    return {
        success: true,
        scriptPath: filename,
        output: "Script generated. Please register in package.json manually for now."
    };
}
