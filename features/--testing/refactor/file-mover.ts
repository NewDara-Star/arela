/**
 * File movement operations for slice extraction
 */

import path from "node:path";
import fs from "fs-extra";
import type { Slice } from "../detect/types.js";
import type { FileMovement, RollbackInfo } from "./types.js";

export class FileMover {
  private rollbackInfo: RollbackInfo = {
    originalState: new Map(),
    stagedChanges: [],
    createdDirs: [],
  };

  /**
   * Create extraction plan for files - determine where each file should go
   */
  async planFileMovement(
    slice: Slice,
    cwd: string = process.cwd()
  ): Promise<FileMovement[]> {
    const movements: FileMovement[] = [];
    const sliceDir = path.join(cwd, "features", this.slugify(slice.name));

    for (const filePath of slice.files) {
      const fullPath = path.join(cwd, filePath);

      // Validate file exists before planning movement
      if (!await fs.pathExists(fullPath)) {
        console.warn(`⚠️  Skipping non-existent file: ${filePath}`);
        continue;
      }

      // Preserve directory structure within the slice
      // e.g., src/components/Button.tsx -> features/ui/components/Button.tsx
      let relativePath = filePath;

      // Remove src/ prefix if present
      if (relativePath.startsWith("src/")) {
        relativePath = relativePath.slice(4);
      }

      const destination = path.join(sliceDir, relativePath);

      movements.push({
        source: fullPath,
        destination,
        type: path.extname(filePath).slice(1) || "unknown",
      });
    }

    return movements;
  }

  /**
   * Move files to their target locations
   */
  async moveFiles(
    movements: FileMovement[],
    dryRun: boolean = false
  ): Promise<void> {
    // Group by destination directory to create them first
    const dirSet = new Set<string>();
    for (const movement of movements) {
      const dir = path.dirname(movement.destination);
      dirSet.add(dir);
    }

    // Create all directories
    for (const dir of dirSet) {
      if (!dryRun) {
        await fs.ensureDir(dir);
        this.rollbackInfo.createdDirs.push(dir);
      }
    }

    // Move all files
    for (const movement of movements) {
      if (dryRun) {
        continue;
      }

      // Store original content for rollback
      if (await fs.pathExists(movement.source)) {
        const content = await fs.readFile(movement.source, "utf-8");
        this.rollbackInfo.originalState.set(movement.source, content);
      }

      // Move the file
      await fs.move(movement.source, movement.destination, {
        overwrite: true,
      });

      this.rollbackInfo.stagedChanges.push(movement.destination);
    }
  }

  /**
   * Clean up empty directories after file movements
   */
  async cleanupEmptyDirs(cwd: string = process.cwd()): Promise<void> {
    const srcDir = path.join(cwd, "src");

    if (!await fs.pathExists(srcDir)) {
      return;
    }

    // Walk the directory and remove empty folders
    await this.removeEmptyDirsRecursive(srcDir);
  }

  /**
   * Recursively remove empty directories
   */
  private async removeEmptyDirsRecursive(dirPath: string): Promise<boolean> {
    if (!await fs.pathExists(dirPath)) {
      return true;
    }

    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await this.removeEmptyDirsRecursive(fullPath);
      }
    }

    // Check if directory is now empty
    const remaining = await fs.readdir(dirPath);
    if (remaining.length === 0) {
      await fs.remove(dirPath);
      return true;
    }

    return false;
  }

  /**
   * Rollback file movements
   */
  async rollback(): Promise<void> {
    // Restore original files
    for (const [originalPath, content] of this.rollbackInfo.originalState) {
      if (await fs.pathExists(path.dirname(originalPath))) {
        await fs.writeFile(originalPath, content);
      }
    }

    // Remove moved files
    for (const movedFile of this.rollbackInfo.stagedChanges) {
      if (await fs.pathExists(movedFile)) {
        await fs.remove(movedFile);
      }
    }

    // Remove created directories (in reverse order)
    for (const dir of this.rollbackInfo.createdDirs.reverse()) {
      if (await fs.pathExists(dir)) {
        try {
          await fs.remove(dir);
        } catch {
          // Directory may not be empty, which is fine
        }
      }
    }

    // Cleanup
    this.rollbackInfo = {
      originalState: new Map(),
      stagedChanges: [],
      createdDirs: [],
    };
  }

  /**
   * Convert slice name to directory slug
   * e.g., "Authentication" -> "authentication"
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  /**
   * Get rollback info for inspection/testing
   */
  getRollbackInfo(): RollbackInfo {
    return this.rollbackInfo;
  }
}
