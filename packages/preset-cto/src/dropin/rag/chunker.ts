import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import crypto from "crypto";
import type { DocChunk } from "./db.js";

const CHUNK_SIZE = 1500; // chars
const CHUNK_OVERLAP = 200; // chars

const IGNORE_PATTERNS = [
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  ".next/**",
  ".turbo/**",
  "coverage/**",
  "*.min.js",
  "*.map",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

export async function chunkRepo(cwd: string): Promise<DocChunk[]> {
  const chunks: DocChunk[] = [];
  
  // Find all files
  const files = await glob("**/*", {
    cwd,
    ignore: IGNORE_PATTERNS,
    nodir: true,
    dot: false,
  });
  
  for (const file of files) {
    const filePath = path.join(cwd, file);
    const stats = await fs.stat(filePath);
    
    // Skip large files (>1MB)
    if (stats.size > 1024 * 1024) {
      continue;
    }
    
    // Determine kind and language
    const { kind, lang } = classifyFile(file);
    
    try {
      const content = await fs.readFile(filePath, "utf8");
      const fileChunks = chunkText(content, {
        path: file,
        kind,
        lang,
        mtime: stats.mtimeMs,
      });
      
      chunks.push(...fileChunks);
    } catch (error) {
      // Skip binary or unreadable files
      continue;
    }
  }
  
  return chunks;
}

function classifyFile(filePath: string): { kind: DocChunk["kind"]; lang?: string } {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  
  // Documentation
  if (
    ext === ".md" ||
    ext === ".mdx" ||
    ext === ".txt" ||
    basename.startsWith("readme")
  ) {
    return { kind: "doc", lang: "markdown" };
  }
  
  // Configuration
  if (
    ext === ".json" ||
    ext === ".yaml" ||
    ext === ".yml" ||
    ext === ".toml" ||
    ext === ".env" ||
    basename === "dockerfile" ||
    basename.includes("config")
  ) {
    return { kind: "config", lang: ext.slice(1) || "text" };
  }
  
  // Code
  const langMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".sh": "shell",
    ".bash": "shell",
    ".sql": "sql",
  };
  
  return { kind: "code", lang: langMap[ext] || "text" };
}

function chunkText(
  text: string,
  meta: { path: string; kind: DocChunk["kind"]; lang?: string; mtime: number }
): DocChunk[] {
  const chunks: DocChunk[] = [];
  
  if (text.length <= CHUNK_SIZE) {
    // Single chunk
    const id = generateChunkId(meta.path, 0, text);
    chunks.push({
      id,
      path: meta.path,
      kind: meta.kind,
      lang: meta.lang,
      mtime: meta.mtime,
      chunk: 0,
      text,
    });
    return chunks;
  }
  
  // Multiple chunks with overlap
  let start = 0;
  let chunkIndex = 0;
  
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunkText = text.slice(start, end);
    
    const id = generateChunkId(meta.path, chunkIndex, chunkText);
    chunks.push({
      id,
      path: meta.path,
      kind: meta.kind,
      lang: meta.lang,
      mtime: meta.mtime,
      chunk: chunkIndex,
      text: chunkText,
    });
    
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    chunkIndex++;
  }
  
  return chunks;
}

function generateChunkId(filePath: string, chunkIndex: number, text: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${filePath}:${chunkIndex}:${text}`)
    .digest("hex")
    .slice(0, 16);
  
  return `${filePath}:${chunkIndex}:${hash}`;
}
