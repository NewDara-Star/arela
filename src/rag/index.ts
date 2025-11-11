import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import { glob } from "glob";
import pc from "picocolors";
import { IndexingFailure } from "../types.js";
import { generateRagignore, readRagignorePatterns, categorizeError } from "../utils/ragignore.js";

export interface RagConfig {
  cwd: string;
  model?: string;
  ollamaHost?: string;
  excludePatterns?: string[];
}

export interface IndexStats {
  filesIndexed: number;
  totalChunks: number;
  timeMs: number;
}

const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.map",
  "**/pnpm-lock.yaml",
  "**/package-lock.json",
  "**/yarn.lock",
];

/**
 * Check if Ollama is installed
 */
export async function isOllamaInstalled(): Promise<boolean> {
  try {
    await execa("which", ["ollama"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Ollama if not present
 */
export async function ensureOllamaInstalled(): Promise<void> {
  if (await isOllamaInstalled()) {
    return;
  }

  console.log(pc.yellow("🔧 Ollama not found. Installing..."));
  
  try {
    // Detect OS and install accordingly
    const { stdout: platform } = await execa("uname", ["-s"]);
    
    if (platform === "Darwin") {
      // macOS: Use Homebrew
      console.log(pc.cyan("📦 Installing Ollama via Homebrew..."));
      await execa("brew", ["install", "ollama"]);
    } else if (platform === "Linux") {
      // Linux: Use official install script
      console.log(pc.cyan("📦 Installing Ollama via official script..."));
      await execa("sh", ["-c", "curl -fsSL https://ollama.ai/install.sh | sh"]);
    } else {
      throw new Error(`Unsupported platform: ${platform}. Please install Ollama manually from https://ollama.ai`);
    }
    
    console.log(pc.green("✅ Ollama installed successfully!"));
  } catch (error) {
    throw new Error(`Failed to install Ollama: ${(error as Error).message}. Please install manually from https://ollama.ai`);
  }
}

/**
 * Check if a specific Ollama model is available
 */
export async function isModelAvailable(model: string, host = "http://localhost:11434"): Promise<boolean> {
  try {
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) return false;
    
    const data = await response.json() as { models: Array<{ name: string }> };
    return data.models.some(m => m.name.includes(model));
  } catch {
    return false;
  }
}

/**
 * Pull an Ollama model if not available
 */
export async function ensureModelAvailable(model: string, host = "http://localhost:11434"): Promise<void> {
  if (await isModelAvailable(model, host)) {
    return;
  }

  console.log(pc.yellow(`🔧 Model '${model}' not found. Pulling...`));
  
  try {
    console.log(pc.cyan(`📦 Pulling ${model} model...`));
    const pullProcess = execa("ollama", ["pull", model]);
    
    // Show progress
    pullProcess.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(pc.dim(`   ${output}`));
      }
    });
    
    await pullProcess;
    console.log(pc.green(`✅ Model '${model}' pulled successfully!`));
  } catch (error) {
    throw new Error(`Failed to pull model '${model}': ${(error as Error).message}`);
  }
}

/**
 * Check if Ollama server is running
 */
export async function isOllamaRunning(host = "http://localhost:11434"): Promise<boolean> {
  try {
    const response = await fetch(`${host}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start Ollama server in the background
 */
export async function startOllamaServer(): Promise<void> {
  console.log(pc.cyan("Starting Ollama server..."));
  
  try {
    // Start ollama serve in background
    execa("ollama", ["serve"], { 
      detached: true,
      stdio: "ignore",
    }).unref();
    
    // Wait for server to be ready
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await isOllamaRunning()) {
        console.log(pc.green("✓ Ollama server started"));
        return;
      }
    }
    
    throw new Error("Ollama server failed to start");
  } catch (error) {
    throw new Error(`Failed to start Ollama: ${(error as Error).message}`);
  }
}

/**
 * Get list of files to index
 */
async function getFilesToIndex(cwd: string, excludePatterns: string[]): Promise<string[]> {
  const patterns = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.py",
    "**/*.go",
    "**/*.rs",
    "**/*.java",
    "**/*.md",
    "**/*.json",
    "**/*.yaml",
    "**/*.yml",
  ];

  // Load .ragignore patterns
  const ragignorePatterns = await readRagignorePatterns(cwd);

  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      ignore: [...DEFAULT_EXCLUDE, ...excludePatterns, ...ragignorePatterns],
      absolute: true,
    });
    files.push(...matches);
  }

  return [...new Set(files)]; // dedupe
}

/**
 * Chunk file content for embedding
 */
function chunkContent(content: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = [];
  const lines = content.split("\n");
  let currentChunk: string[] = [];
  let currentSize = 0;
  
  for (const line of lines) {
    const lineSize = line.length + 1; // +1 for newline
    
    if (currentSize + lineSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentSize = 0;
    }
    
    currentChunk.push(line);
    currentSize += lineSize;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }
  
  return chunks;
}

/**
 * Generate embedding for text using Ollama
 */
async function generateEmbedding(
  text: string,
  model: string,
  host: string,
): Promise<number[]> {
  const response = await fetch(`${host}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.statusText}`);
  }
  
  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

/**
 * Index a single file with failure tracking
 */
async function indexFile(
  filePath: string,
  cwd: string,
  model: string,
  host: string,
  failures: IndexingFailure[]
): Promise<Array<{ file: string; chunk: string; embedding: number[] }>> {
  const relativePath = path.relative(cwd, filePath);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const chunks = chunkContent(content);

    const indexed = [];

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk, model, host);
        indexed.push({
          file: relativePath,
          chunk,
          embedding,
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        // Track file-level failure on first chunk failure
        if (indexed.length === 0) {
          const stats = await fs.stat(filePath);
          failures.push({
            file: relativePath,
            reason: errorMessage,
            size: stats.size,
            type: categorizeError(error as Error) as any,
          });
        }
        // Continue with other chunks
      }
    }

    return indexed;
  } catch (error) {
    // Track file-level errors (read errors, etc)
    const stats = await fs.stat(filePath).catch(() => ({ size: 0 }));
    failures.push({
      file: relativePath,
      reason: (error as Error).message,
      size: stats.size,
      type: categorizeError(error as Error) as any,
    });
    return [];
  }
}

export interface BuildIndexOptions extends RagConfig {
  progress?: boolean;
  parallel?: boolean;
}

/**
 * Build RAG index for the codebase with failure handling
 */
export async function buildIndex(config: BuildIndexOptions): Promise<IndexStats> {
  const {
    cwd,
    model = "nomic-embed-text",
    ollamaHost = "http://localhost:11434",
    excludePatterns = [],
    progress = false,
    parallel = false,
  } = config;

  return await buildIndexWithAutoRetry(
    {
      cwd,
      model,
      ollamaHost,
      excludePatterns,
      progress,
      parallel,
    },
    0 // recursion depth
  );
}

/**
 * Internal function to handle indexing with auto-retry on failures
 */
async function buildIndexWithAutoRetry(
  config: BuildIndexOptions,
  retryDepth: number
): Promise<IndexStats> {
  const {
    cwd,
    model = "nomic-embed-text",
    ollamaHost = "http://localhost:11434",
    excludePatterns = [],
    progress = false,
    parallel = false,
  } = config;

  const startTime = Date.now();

  // Ensure Ollama is installed (only on first try)
  if (retryDepth === 0) {
    await ensureOllamaInstalled();

    // Ensure Ollama is running
    if (!(await isOllamaRunning(ollamaHost))) {
      await startOllamaServer();
    }

    // Ensure the required model is available
    await ensureModelAvailable(model, ollamaHost);
  }

  console.log(pc.cyan("Scanning codebase..."));
  const files = await getFilesToIndex(cwd, excludePatterns);
  console.log(pc.dim(`Found ${files.length} files to index`));

  if (parallel) {
    console.log(pc.yellow("⚠️  Parallel indexing uses more memory but may be slower"));
  }

  const indexPath = path.join(cwd, ".arela", ".rag-index.json");
  await fs.ensureDir(path.dirname(indexPath));

  const allEmbeddings: Array<{ file: string; chunk: string; embedding: number[] }> = [];
  const failures: IndexingFailure[] = [];

  // Progress bar
  let progressBar: any = null;
  if (progress) {
    const { ProgressBar } = await import("../utils/progress.js");
    progressBar = new ProgressBar({ total: files.length, label: "Indexing" });
  }

  let processed = 0;
  for (const file of files) {
    const embeddings = await indexFile(file, cwd, model, ollamaHost, failures);
    allEmbeddings.push(...embeddings);
    processed++;

    if (progressBar) {
      progressBar.update(processed);
    } else if (processed % 10 === 0) {
      console.log(pc.dim(`Indexed ${processed}/${files.length} files...`));
    }
  }

  if (progressBar) {
    progressBar.complete();
  }

  // Handle failures - auto-generate .ragignore and retry
  if (failures.length > 0 && retryDepth === 0) {
    console.log("");
    console.log(
      pc.yellow(
        `\n⚠️  ${failures.length} file${failures.length !== 1 ? "s" : ""} failed to index`
      )
    );

    // Generate .ragignore with analysis
    await generateRagignore(failures, cwd);

    // Retry indexing after creating .ragignore
    console.log(pc.cyan(`\n🔄 Re-running index without failed files...\n`));
    return await buildIndexWithAutoRetry(
      {
        cwd,
        model,
        ollamaHost,
        excludePatterns,
        progress,
        parallel,
      },
      1 // Mark as retry
    );
  }

  // Save index
  await fs.writeJson(
    indexPath,
    {
      version: "1.0",
      model,
      timestamp: new Date().toISOString(),
      embeddings: allEmbeddings,
    },
    { spaces: 2 }
  );

  const timeMs = Date.now() - startTime;

  if (allEmbeddings.length > 0) {
    console.log(
      pc.green(
        `\n✅ Indexed ${processed} files successfully in ${formatDuration(timeMs)}`
      )
    );
  } else {
    console.log(pc.yellow(`\n⚠️  No files were successfully indexed`));
  }

  return {
    filesIndexed: processed,
    totalChunks: allEmbeddings.length,
    timeMs,
  };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Search the RAG index
 */
export async function search(
  query: string,
  config: RagConfig,
  topK = 5,
): Promise<Array<{ file: string; chunk: string; score: number }>> {
  const {
    cwd,
    model = "nomic-embed-text",
    ollamaHost = "http://localhost:11434",
  } = config;
  
  const indexPath = path.join(cwd, ".arela", ".rag-index.json");
  
  if (!(await fs.pathExists(indexPath))) {
    throw new Error("RAG index not found. Run 'npx arela index' first.");
  }
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, model, ollamaHost);
  
  // Load index
  const index = await fs.readJson(indexPath);
  
  // Calculate cosine similarity
  const results = index.embeddings.map((item: { file: string; chunk: string; embedding: number[] }) => {
    const score = cosineSimilarity(queryEmbedding, item.embedding);
    return {
      file: item.file,
      chunk: item.chunk,
      score,
    };
  });
  
  // Sort by score and return top K
  return results
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// RAG server implementation moved to src/rag/server.ts
