/**
 * Import path update operations for slice extraction
 */

import path from "node:path";
import fs from "fs-extra";
import type { ImportUpdate, ImportStatement, SliceExtractionPlan } from "./types.js";

export class ImportUpdater {
  private fileMapping: Map<string, string> = new Map(); // old path -> new path
  private originalContents: Map<string, string> = new Map(); // file path -> original content

  /**
   * Build mapping of old file locations to new locations
   */
  buildFileMapping(plans: SliceExtractionPlan[], cwd: string = process.cwd()): void {
    this.fileMapping.clear();

    for (const plan of plans) {
      for (const movement of plan.sourceFiles) {
        const oldPath = path.relative(cwd, movement.source);
        const newPath = path.relative(cwd, movement.destination);
        this.fileMapping.set(oldPath, newPath);
      }
    }
  }

  /**
   * Find all files that need import updates and plan them
   */
  async planImportUpdates(
    plans: SliceExtractionPlan[],
    cwd: string = process.cwd()
  ): Promise<ImportUpdate[]> {
    const updates: ImportUpdate[] = [];
    const allFiles = await this.findAllSourceFiles(cwd);

    for (const filePath of allFiles) {
      const fullPath = path.join(cwd, filePath);
      const content = await fs.readFile(fullPath, "utf-8");
      this.originalContents.set(fullPath, content);

      const imports = this.parseImports(content, filePath);
      const fileUpdates = this.calculateImportUpdates(
        imports,
        filePath,
        cwd
      );

      updates.push(...fileUpdates);
    }

    return updates;
  }

  /**
   * Apply import updates to files
   */
  async updateImports(
    updates: ImportUpdate[],
    dryRun: boolean = false,
    cwd: string = process.cwd()
  ): Promise<void> {
    // Group updates by file
    const updatesByFile = new Map<string, ImportUpdate[]>();

    for (const update of updates) {
      const fullPath = path.join(cwd, update.filePath);
      if (!updatesByFile.has(fullPath)) {
        updatesByFile.set(fullPath, []);
      }
      updatesByFile.get(fullPath)!.push(update);
    }

    // Apply updates to each file
    for (const [filePath, fileUpdates] of updatesByFile) {
      if (dryRun) {
        continue;
      }

      if (!await fs.pathExists(filePath)) {
        continue;
      }

      let content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Sort by line number in reverse to maintain correct indices
      fileUpdates.sort((a, b) => b.lineNumber - a.lineNumber);

      for (const update of fileUpdates) {
        const lineIndex = update.lineNumber - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
          lines[lineIndex] = lines[lineIndex].replace(
            update.oldImport,
            update.newImport
          );
        }
      }

      const updatedContent = lines.join("\n");
      await fs.writeFile(filePath, updatedContent);
    }
  }

  /**
   * Parse imports from file content
   */
  private parseImports(content: string, filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const lines = content.split("\n");

    // Determine file type
    const ext = path.extname(filePath);
    let type: "esm" | "cjs" | "ts" | "python" | "go" = "esm";

    if (ext === ".ts" || ext === ".tsx") {
      type = "ts";
    } else if (ext === ".js" || ext === ".jsx") {
      type = "cjs"; // Could be either, but assume CJS
    } else if (ext === ".py") {
      type = "python";
    } else if (ext === ".go") {
      type = "go";
    }

    // Parse based on file type
    if (type === "ts" || type === "esm" || type === "cjs") {
      imports.push(...this.parseJavaScriptImports(content, lines));
    } else if (type === "python") {
      imports.push(...this.parsePythonImports(content, lines));
    } else if (type === "go") {
      imports.push(...this.parseGoImports(content, lines));
    }

    return imports;
  }

  /**
   * Parse JavaScript/TypeScript imports
   */
  private parseJavaScriptImports(
    content: string,
    lines: string[]
  ): ImportStatement[] {
    const imports: ImportStatement[] = [];

    // ESM imports: import ... from '...'
    const esmRegex = /import\s+(?:[\w\s,{}*]*\s+)?from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = esmRegex.exec(content)) !== null) {
      const specifier = match[1];
      const lineNumber =
        content.substring(0, match.index).split("\n").length;
      const fullLine = lines[lineNumber - 1] || "";

      imports.push({
        type: "esm",
        specifier,
        isRelative: specifier.startsWith("."),
        lineNumber,
        originalLine: fullLine,
      });
    }

    // CommonJS requires: require('...')
    const cjsRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = cjsRegex.exec(content)) !== null) {
      const specifier = match[1];
      const lineNumber =
        content.substring(0, match.index).split("\n").length;
      const fullLine = lines[lineNumber - 1] || "";

      imports.push({
        type: "cjs",
        specifier,
        isRelative: specifier.startsWith("."),
        lineNumber,
        originalLine: fullLine,
      });
    }

    return imports;
  }

  /**
   * Parse Python imports
   */
  private parsePythonImports(
    content: string,
    lines: string[]
  ): ImportStatement[] {
    const imports: ImportStatement[] = [];

    // Python relative imports: from . import, from .. import, from .module import
    const relativeRegex =
      /from\s+(\.+[\w.]*)\s+import|import\s+(\.+[\w.]*)/g;
    let match;

    while ((match = relativeRegex.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      const lineNumber =
        content.substring(0, match.index).split("\n").length;
      const fullLine = lines[lineNumber - 1] || "";

      imports.push({
        type: "python",
        specifier,
        isRelative: true,
        lineNumber,
        originalLine: fullLine,
      });
    }

    return imports;
  }

  /**
   * Parse Go imports
   */
  private parseGoImports(
    content: string,
    lines: string[]
  ): ImportStatement[] {
    const imports: ImportStatement[] = [];

    // Go relative imports are handled differently, just track them
    const importBlockRegex = /import\s*\(\s*([\s\S]*?)\s*\)|\s+(?:[\w]+\s+)?"([^"]+)"/g;
    let match;

    while ((match = importBlockRegex.exec(content)) !== null) {
      const specifier = match[2] || match[1];
      if (specifier && specifier.includes("/")) {
        const lineNumber =
          content.substring(0, match.index).split("\n").length;
        const fullLine = lines[lineNumber - 1] || "";

        imports.push({
          type: "go",
          specifier,
          isRelative: !specifier.includes(":") && specifier.startsWith("."),
          lineNumber,
          originalLine: fullLine,
        });
      }
    }

    return imports;
  }

  /**
   * Calculate import updates needed for a file
   */
  private calculateImportUpdates(
    imports: ImportStatement[],
    filePath: string,
    cwd: string
  ): ImportUpdate[] {
    const updates: ImportUpdate[] = [];
    const fileDir = path.dirname(filePath);

    for (const imp of imports) {
      if (!imp.isRelative) {
        // Skip absolute imports (node_modules, etc.)
        continue;
      }

      // Resolve the import to an absolute path
      let importedPath: string;
      try {
        importedPath = path.normalize(
          path.join(fileDir, imp.specifier)
        );
      } catch {
        continue;
      }

      // Check if the imported file has been moved
      const newImportPath = this.fileMapping.get(importedPath);
      if (!newImportPath) {
        continue; // File not in our moves
      }

      // Calculate new relative path
      const newFileDir = path.dirname(filePath);
      const newRelativePath = path.relative(newFileDir, newImportPath);
      const normalizedPath = newRelativePath.startsWith(".")
        ? newRelativePath
        : `./${newRelativePath}`;

      // Create the new import statement
      const newImport = imp.originalLine.replace(
        imp.specifier,
        normalizedPath
      );

      updates.push({
        filePath,
        oldImport: imp.specifier,
        newImport: normalizedPath,
        lineNumber: imp.lineNumber,
      });
    }

    return updates;
  }

  /**
   * Find all source files in the project
   */
  private async findAllSourceFiles(cwd: string): Promise<string[]> {
    const sourceFiles: string[] = [];
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go"];

    const walk = async (dir: string, prefix: string = ""): Promise<void> => {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        // Skip common non-source directories
        if (
          entry === "node_modules" ||
          entry === ".git" ||
          entry === ".arela" ||
          entry === "dist" ||
          entry === "build" ||
          entry === "coverage"
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry);
        const relativePath = prefix ? `${prefix}/${entry}` : entry;
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          await walk(fullPath, relativePath);
        } else if (extensions.some(ext => entry.endsWith(ext))) {
          sourceFiles.push(relativePath);
        }
      }
    };

    await walk(cwd);
    return sourceFiles;
  }

  /**
   * Rollback import updates
   */
  async rollback(): Promise<void> {
    for (const [filePath, originalContent] of this.originalContents) {
      if (await fs.pathExists(filePath)) {
        await fs.writeFile(filePath, originalContent);
      }
    }

    this.originalContents.clear();
    this.fileMapping.clear();
  }
}
