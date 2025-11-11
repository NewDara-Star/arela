import path from "node:path";
import fs from "fs-extra";
import pc from "picocolors";
import { IndexingFailure } from "../types.js";

/**
 * Analysis result for a failed file
 */
export interface FailureAnalysis {
  action: "ignore" | "refactor" | "split";
  reason: string;
  suggestions: string[];
}

/**
 * Categorize error type from error message
 */
export function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("too large") || message.includes("exceeds") || message.includes("payload")) {
    return "too_large";
  }
  if (message.includes("string") || message.includes("encoding") || message.includes("invalid")) {
    return "invalid_string";
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }

  return "other";
}

/**
 * Analyze a failed file to determine if it should be ignored or refactored
 */
export async function analyzeFailure(failure: IndexingFailure): Promise<FailureAnalysis> {
  const { file, size, type } = failure;

  // Check if it's a dependency directory
  if (
    file.includes("node_modules/") ||
    file.includes("venv/") ||
    file.includes(".venv/") ||
    file.includes("site-packages/")
  ) {
    return {
      action: "ignore",
      reason: "Third-party dependency",
      suggestions: ["These files are not part of your source code"],
    };
  }

  // Check if it's generated code
  if (
    file.includes("dist/") ||
    file.includes("build/") ||
    file.includes(".next/") ||
    file.includes(".turbo/") ||
    file.endsWith(".min.js") ||
    file.endsWith(".bundle.js") ||
    file.endsWith(".map")
  ) {
    return {
      action: "ignore",
      reason: "Generated/compiled code",
      suggestions: ["Index source files instead of build output"],
    };
  }

  // Check if it's version control or cache
  if (
    file.includes(".git/") ||
    file.includes(".github/") ||
    file.includes(".cache/") ||
    file.includes("__pycache__/")
  ) {
    return {
      action: "ignore",
      reason: "Version control or cache directory",
      suggestions: ["These are system or cache files, not source code"],
    };
  }

  // Check if it's data files by extension
  if (file.endsWith(".json") || file.endsWith(".csv") || file.endsWith(".xml")) {
    return {
      action: "refactor",
      reason: "Large data file",
      suggestions: [
        "Split into smaller files",
        "Move to database or separate storage",
        "Use pagination/streaming for large datasets",
      ],
    };
  }

  // Check if it's a huge source file (more than 100KB)
  if (size > 100_000 && (file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".py"))) {
    return {
      action: "split",
      reason: "Large source file",
      suggestions: [
        "Split into smaller modules",
        "Extract functions/classes into separate files",
        "Consider architectural refactoring",
      ],
    };
  }

  // Check if it's too large (more than 5MB)
  if (size > 5_000_000) {
    return {
      action: "ignore",
      reason: "File too large for RAG indexing",
      suggestions: [
        "Consider splitting the file",
        "Or exclude it from RAG if it's not essential",
      ],
    };
  }

  // Default: ignore
  return {
    action: "ignore",
    reason: "File failed to index",
    suggestions: ["Added to .ragignore for now"],
  };
}

/**
 * Extract a glob pattern from a file path
 */
export function extractPattern(filePath: string): string {
  // Extract directory patterns
  if (filePath.includes("node_modules/")) return "node_modules/";
  if (filePath.includes("venv/")) return "venv/";
  if (filePath.includes(".venv/")) return ".venv/";
  if (filePath.includes("site-packages/")) return "**/site-packages/";
  if (filePath.includes("dist/")) return "dist/";
  if (filePath.includes("build/")) return "build/";
  if (filePath.includes(".next/")) return ".next/";
  if (filePath.includes(".turbo/")) return ".turbo/";
  if (filePath.includes(".git/")) return ".git/";
  if (filePath.includes(".cache/")) return ".cache/";
  if (filePath.includes("__pycache__/")) return "__pycache__/";

  // Extract file patterns
  if (filePath.endsWith(".min.js")) return "*.min.js";
  if (filePath.endsWith(".bundle.js")) return "*.bundle.js";
  if (filePath.endsWith(".map")) return "*.map";

  // Default: exact file
  return filePath;
}

/**
 * Generate or update .ragignore based on failures
 */
export async function generateRagignore(
  failures: IndexingFailure[],
  cwd: string
): Promise<{ patterns: Set<string>; recommendations: string[] }> {
  const patterns = new Set<string>();
  const recommendations: string[] = [];

  for (const failure of failures) {
    const analysis = await analyzeFailure(failure);

    // Extract pattern
    const pattern = extractPattern(failure.file);
    patterns.add(pattern);

    // Log failure and recommendation
    console.log("");
    console.log(pc.yellow(`⚠️  Failed to embed: ${failure.file}`));
    console.log(pc.gray(`    Reason: ${failure.reason}`));

    console.log(pc.cyan(`\n🤖 Analyzing failure...`));
    console.log("");

    if (analysis.action === "ignore") {
      console.log(pc.green(`✅ Recommendation: IGNORE`));
      console.log(pc.gray(`    ${analysis.reason}`));
      for (const suggestion of analysis.suggestions) {
        console.log(pc.gray(`    ${suggestion}`));
      }
    } else if (analysis.action === "refactor") {
      console.log(pc.yellow(`⚠️  Recommendation: REFACTOR`));
      console.log(pc.gray(`    ${analysis.reason}`));
      console.log(pc.gray(`    Consider:`));
      for (let i = 0; i < analysis.suggestions.length; i++) {
        console.log(pc.gray(`    ${i + 1}. ${analysis.suggestions[i]}`));
      }
      recommendations.push(`${failure.file}: ${analysis.reason}`);
    } else if (analysis.action === "split") {
      console.log(pc.yellow(`⚠️  Recommendation: SPLIT`));
      console.log(pc.gray(`    ${analysis.reason}`));
      console.log(pc.gray(`    Consider:`));
      for (let i = 0; i < analysis.suggestions.length; i++) {
        console.log(pc.gray(`    ${i + 1}. ${analysis.suggestions[i]}`));
      }
      recommendations.push(`${failure.file}: ${analysis.reason}`);
    }

    console.log(pc.gray(`\n    Added to .ragignore for now.`));
  }

  // Create or update .ragignore
  const ragignorePath = path.join(cwd, ".ragignore");
  const existingContent = (await fs.pathExists(ragignorePath))
    ? await fs.readFile(ragignorePath, "utf-8")
    : "";

  const newContent = [
    existingContent,
    "",
    "# Auto-generated from indexing failures",
    `# Generated: ${new Date().toISOString()}`,
    "",
    ...Array.from(patterns).sort(),
  ]
    .join("\n")
    .trim();

  await fs.writeFile(ragignorePath, newContent + "\n");

  console.log("");
  console.log(
    pc.green(
      `📝 Created/updated .ragignore with ${patterns.size} pattern${patterns.size !== 1 ? "s" : ""}`
    )
  );

  // Save recommendations to file
  if (recommendations.length > 0) {
    const recsPath = path.join(cwd, ".arela", "indexing-recommendations.md");
    await fs.ensureDir(path.dirname(recsPath));
    await fs.writeFile(
      recsPath,
      [
        "# RAG Indexing Recommendations",
        "",
        "These files failed to index and may need attention:",
        "",
        ...recommendations.map((r) => `- ${r}`),
        "",
        `Generated: ${new Date().toISOString()}`,
      ].join("\n")
    );

    console.log(
      pc.cyan(`📋 Saved recommendations to .arela/indexing-recommendations.md`)
    );
  }

  return { patterns, recommendations };
}

/**
 * Read and parse .ragignore patterns
 */
export async function readRagignorePatterns(cwd: string): Promise<string[]> {
  const ragignorePath = path.join(cwd, ".ragignore");

  if (!(await fs.pathExists(ragignorePath))) {
    return [];
  }

  const content = await fs.readFile(ragignorePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
