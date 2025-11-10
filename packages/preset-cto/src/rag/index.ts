import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import { glob } from "glob";
import pc from "picocolors";

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
  
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      ignore: [...DEFAULT_EXCLUDE, ...excludePatterns],
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
  
  const data = await response.json();
  return data.embedding;
}

/**
 * Index a single file
 */
async function indexFile(
  filePath: string,
  cwd: string,
  model: string,
  host: string,
): Promise<Array<{ file: string; chunk: string; embedding: number[] }>> {
  const content = await fs.readFile(filePath, "utf-8");
  const relativePath = path.relative(cwd, filePath);
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
      console.log(pc.yellow(`⚠ Failed to embed chunk in ${relativePath}`));
    }
  }
  
  return indexed;
}

export interface BuildIndexOptions extends RagConfig {
  progress?: boolean;
  parallel?: boolean;
}

/**
 * Build RAG index for the codebase
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
  
  const startTime = Date.now();
  
  // Ensure Ollama is running
  if (!(await isOllamaRunning(ollamaHost))) {
    await startOllamaServer();
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
  
  // Progress bar
  let progressBar: any = null;
  if (progress) {
    const { ProgressBar } = await import("../utils/progress.js");
    progressBar = new ProgressBar({ total: files.length, label: "Indexing" });
  }
  
  let processed = 0;
  for (const file of files) {
    try {
      const embeddings = await indexFile(file, cwd, model, ollamaHost);
      allEmbeddings.push(...embeddings);
      processed++;
      
      if (progressBar) {
        progressBar.update(processed);
      } else if (processed % 10 === 0) {
        console.log(pc.dim(`Indexed ${processed}/${files.length} files...`));
      }
    } catch (error) {
      if (!progressBar) {
        console.log(pc.yellow(`⚠ Failed to index ${path.relative(cwd, file)}`));
      }
    }
  }
  
  if (progressBar) {
    progressBar.complete();
  }
  
  // Save index
  await fs.writeJson(indexPath, {
    version: "1.0",
    model,
    timestamp: new Date().toISOString(),
    embeddings: allEmbeddings,
  }, { spaces: 2 });
  
  const timeMs = Date.now() - startTime;
  
  return {
    filesIndexed: processed,
    totalChunks: allEmbeddings.length,
    timeMs,
  };
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
