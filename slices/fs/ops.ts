/**
 * Guarded Filesystem Tools
 * 
 * Standard FS operations wrapped with Session Guard checks.
 */

import fs from 'fs-extra';
import path from 'node:path';
import { checkWriteAccessOp, trackFileReadOp } from '../guard/ops.js';

// =============================================================================
// Helper: Strict Path Validation
// =============================================================================

function validatePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid path: Path must be a non-empty string');
    }

    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

    return absolutePath;
}

// =============================================================================
// Guarded Write Operations
// =============================================================================

export interface EditFileInput {
    path: string;
    edits: Array<{
        oldText: string;
        newText: string;
    }>;
    dryRun?: boolean;
}

export async function editFileOp(input: EditFileInput): Promise<string> {
    // 1. Check Guard Access
    const access = checkWriteAccessOp('edit_file');
    if (!access.allowed) {
        throw new Error(access.message);
    }

    const absolutePath = validatePath(input.path);

    if (!await fs.pathExists(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    let content = await fs.readFile(absolutePath, 'utf-8');
    let appliedCount = 0;

    for (const edit of input.edits) {
        if (content.includes(edit.oldText)) {
            content = content.replace(edit.oldText, edit.newText);
            appliedCount++;
        } else {
            throw new Error(`Text match failed for edit #${appliedCount + 1}.\nTarget text not found:\n${edit.oldText.substring(0, 100)}...`);
        }
    }

    if (!input.dryRun) {
        await fs.writeFile(absolutePath, content, 'utf-8');
    }

    return `✅ Successfully applied ${appliedCount} edits to ${path.basename(absolutePath)}`;
}

export async function writeFileOp(filePath: string, content: string): Promise<string> {
    const access = checkWriteAccessOp('write_file');
    if (!access.allowed) {
        throw new Error(access.message);
    }

    const absolutePath = validatePath(filePath);
    await fs.ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, content, 'utf-8');

    return `✅ Wrote file: ${path.basename(absolutePath)}`;
}

export async function deleteFileOp(filePath: string): Promise<string> {
    const access = checkWriteAccessOp('delete_file');
    if (!access.allowed) {
        throw new Error(access.message);
    }

    const absolutePath = validatePath(filePath);
    await fs.remove(absolutePath);

    return `✅ Deleted: ${path.basename(absolutePath)}`;
}

export async function createDirectoryOp(dirPath: string): Promise<string> {
    const access = checkWriteAccessOp('create_directory');
    if (!access.allowed) {
        throw new Error(access.message);
    }

    const absolutePath = validatePath(dirPath);
    await fs.ensureDir(absolutePath);

    return `✅ Created directory: ${path.basename(absolutePath)}`;
}

export async function moveFileOp(source: string, destination: string): Promise<string> {
    const access = checkWriteAccessOp('move_file');
    if (!access.allowed) {
        throw new Error(access.message);
    }

    const absSource = validatePath(source);
    const absDest = validatePath(destination);

    await fs.move(absSource, absDest, { overwrite: false });

    return `✅ Moved ${path.basename(absSource)} to ${path.basename(absDest)}`;
}

// =============================================================================
// Unguarded Read Operations (But Tracked)
// =============================================================================

export async function readFileOp(filePath: string): Promise<string> {
    const absolutePath = validatePath(filePath);

    if (!await fs.pathExists(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
        throw new Error(`Path is a directory: ${absolutePath}. Use list_directory instead.`);
    }

    // Track that this file was read (for Evidence verification)
    trackFileReadOp(absolutePath);

    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
}

export async function listDirectoryOp(dirPath: string): Promise<string[]> {
    const absolutePath = validatePath(dirPath);

    if (!await fs.pathExists(absolutePath)) {
        throw new Error(`Directory not found: ${absolutePath}`);
    }

    const files = await fs.readdir(absolutePath);

    // Start with directory itself
    const results: string[] = [];

    for (const file of files) {
        const fullPath = path.join(absolutePath, file);
        try {
            const stats = await fs.stat(fullPath);
            const prefix = stats.isDirectory() ? 'DIR' : 'FILE';
            results.push(`[${prefix}] ${file}`);
        } catch (e) {
            // Ignore access errors
        }
    }

    return results;
}

export interface DirectoryEntry {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

export async function listDirectoryStructuredOp(dirPath: string): Promise<DirectoryEntry[]> {
    const absolutePath = validatePath(dirPath);

    if (!await fs.pathExists(absolutePath)) {
        throw new Error(`Directory not found: ${absolutePath}`);
    }

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    return entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(absolutePath, entry.name)
    }));
}

export async function fileExistsOp(filePath: string): Promise<boolean> {
    const absolutePath = validatePath(filePath);
    return fs.pathExists(absolutePath);
}

export async function fileStatOp(filePath: string): Promise<fs.Stats> {
    const absolutePath = validatePath(filePath);
    return fs.stat(absolutePath);
}
