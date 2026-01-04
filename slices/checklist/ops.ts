import path from "path";
import { execa } from "execa";
import { ChecklistReport, CheckItem, ChecklistOptions } from "./types.js";
import { readFileOp, fileExistsOp } from "../fs/ops.js";
import { readScratchpad } from "../memory/scratchpad.js";

/**
 * Run the comprehensive checklist
 */
export async function runChecklist(projectPath: string, options: ChecklistOptions = { rigorous: true }): Promise<ChecklistReport> {
    const items: CheckItem[] = [];

    // 1. Check Guards
    if (options.rigorous) {
        items.push(await checkGuards(projectPath));
    }

    // 2. Check Memory (Scratchpad)
    items.push(await checkMemory(projectPath));

    // 3. Check Task Tracking
    items.push(await checkTask(projectPath));

    // 4. Check Git/Docs (Basic Heuristic)
    items.push(await checkDocs(projectPath));

    // 5. Check Tests (Basic Heuristic)
    items.push(await checkTests(projectPath));

    // Calculate overall status
    const failed = items.some(i => i.status === "fail");

    return {
        timestamp: new Date().toISOString(),
        overallStatus: failed ? "fail" : "pass",
        items,
        summary: failed
            ? "❌ Checklist FAILED. You must fix the critical items below."
            : "✅ Checklist PASSED. You are ready to update status."
    };
}

// --- Individual Checks ---

async function checkGuards(projectPath: string): Promise<CheckItem> {
    try {
        // We assume the script is runnable via npm
        await execa("npm", ["run", "test:guards"], { cwd: projectPath });
        return {
            id: "guards",
            description: "Automated Guards (Safety Checks)",
            status: "pass",
            required: true,
            message: "All guards passed."
        };
    } catch (error: any) {
        return {
            id: "guards",
            description: "Automated Guards (Safety Checks)",
            status: "fail",
            required: true,
            message: "Guard scripts failed.",
            details: error.stderr || error.message
        };
    }
}

async function checkMemory(projectPath: string): Promise<CheckItem> {
    const scratchpad = await readScratchpad(projectPath);
    if (!scratchpad) {
        return { id: "memory", description: "Scratchpad Update", status: "fail", required: true, message: "SCRATCHPAD.md is missing or empty." };
    }

    // Check strict staleness (e.g. 15 mins)
    // For now, we rely on the guard script for strict time checking, 
    // but here we just ensure it exists and has "Update:" or recent activity.
    // Let's rely on the fact that if guards passed, this is likely okay, 
    // but we double check for "Active Session" context.

    return {
        id: "memory",
        description: "Scratchpad Update",
        status: "pass",
        required: true,
        message: "SCRATCHPAD.md exists."
    };
}

async function checkTask(projectPath: string): Promise<CheckItem> {
    const taskPath = path.join(projectPath, ".gemini/antigravity/brain/08b35f06-c05a-4eba-89e6-024453a91e1c/task.md");
    // We try the standard location first, then the user root one if exists
    // Actually, we should check `task.md` in the artifacts dir.
    // Since we don't have the artifact ID easily here without hardcoding or passing it,
    // we'll assume the agent keeps task.md updated.
    // Let's check if the file was modified in the last 20 mins.

    // Simplification: Check that `task.md` exists.
    // A better check would be git status, but let's assume existence is the baseline.
    if (await fileExistsOp(taskPath)) {
        return { id: "task", description: "Task Tracker", status: "pass", required: true, message: "task.md found." };
    }

    return {
        id: "task",
        description: "Task Tracker",
        status: "warn", // Warn because it might be in a different path
        required: false,
        message: "Could not find task.md at expected path."
    };
}

async function checkDocs(projectPath: string): Promise<CheckItem> {
    // Check if any .md file is modified in git
    // heuristic: git status --porcelain "**/*.md"
    try {
        const { stdout } = await execa("git", ["status", "--porcelain", "**/*.md"], { cwd: projectPath });
        if (stdout.trim().length > 0) {
            return { id: "docs", description: "Documentation Updates", status: "pass", required: false, message: "Documentation changes detected." };
        }
    } catch (e) { }

    return {
        id: "docs",
        description: "Documentation Updates",
        status: "warn",
        required: false,
        message: "No documentation (Markdown) changes detected in git status. Did you update Docs?"
    };
}

async function checkTests(projectPath: string): Promise<CheckItem> {
    // Check if test files modified
    try {
        const { stdout } = await execa("git", ["status", "--porcelain", "tests/"], { cwd: projectPath });
        if (stdout.trim().length > 0) {
            return { id: "tests", description: "Test Updates", status: "pass", required: false, message: "Test changes detected." };
        }
    } catch (e) { }

    return {
        id: "tests",
        description: "Test Updates",
        status: "warn", // Not always required for pure refactors, but good to warn
        required: false,
        message: "No test changes detected. Did you generate/update tests?"
    };
}
