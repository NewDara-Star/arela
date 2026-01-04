/**
 * Memory Slice - Scratchpad Operations
 */

import fs from "fs-extra";
import path from "node:path";

export interface UpdateOptions {
    mode: "replace" | "append";
}

export interface UpdateResult {
    success: boolean;
    path: string;
    bytesWritten: number;
}

/**
 * Read the current scratchpad content
 */
export async function readScratchpad(projectPath: string): Promise<string | null> {
    const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");

    if (await fs.pathExists(scratchpadPath)) {
        return fs.readFile(scratchpadPath, "utf-8");
    }

    return null;
}

/**
 * Update the scratchpad with new content
 */
export async function updateScratchpad(
    projectPath: string,
    content: string,
    options: UpdateOptions = { mode: "replace" }
): Promise<UpdateResult> {
    const scratchpadPath = path.join(projectPath, "SCRATCHPAD.md");
    const timestamp = new Date().toISOString();

    let finalContent: string;

    if (options.mode === "append" && await fs.pathExists(scratchpadPath)) {
        const existing = await fs.readFile(scratchpadPath, "utf-8");
        finalContent = `${existing}\n\n---\n\n## Update: ${timestamp}\n\n${content}`;
    } else {
        finalContent = `# SCRATCHPAD.md\n\n**Last Updated:** ${timestamp}\n\n${content}`;
    }

    await fs.writeFile(scratchpadPath, finalContent, "utf-8");

    return {
        success: true,
        path: scratchpadPath,
        bytesWritten: Buffer.byteLength(finalContent, "utf-8"),
    };
}
