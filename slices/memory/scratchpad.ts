/**
 * Memory Slice - Scratchpad Operations
 */

import { readFileOp, writeFileOp, fileExistsOp } from "../fs/ops.js";
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

    if (await fileExistsOp(scratchpadPath)) {
        return readFileOp(scratchpadPath);
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

    if (options.mode === "append" && await fileExistsOp(scratchpadPath)) {
        const existing = await readFileOp(scratchpadPath);
        finalContent = `${existing}\n\n---\n\n## Update: ${timestamp}\n\n${content}`;
    } else {
        finalContent = `# SCRATCHPAD.md\n\n**Last Updated:** ${timestamp}\n\n${content}`;
    }

    await writeFileOp(scratchpadPath, finalContent);

    return {
        success: true,
        path: scratchpadPath,
        bytesWritten: Buffer.byteLength(finalContent, "utf-8"),
    };
}
