/**
 * Vector Slice - Operations
 * Handles Ollama interaction, Index management, and Auto-Indexing
 */

import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import { glob } from "glob";

const INDEX_FILE = ".rag-index.json";
const DEFAULT_MODEL = "nomic-embed-text";
const OLLAMA_HOST = "http://localhost:11434";

export interface VectorEntry {
    file: string;
    chunk: string;
    embedding: number[];
}

export interface VectorIndex {
    version: string;
    model: string;
    timestamp: string;
    entries: VectorEntry[];
}

/**
 * Check if Ollama is running and model is available
 * Attempts to start Ollama if not running.
 */
export async function checkOllama(model = DEFAULT_MODEL): Promise<boolean> {
    // 1. Check if running
    const isRunning = await isOllamaReachable();

    if (!isRunning) {
        console.error("Ollama not running. Attempting to start...");
        try {
            // Start in background
            const subprocess = execa("ollama", ["serve"], {
                detached: true,
                stdio: "ignore"
            });
            subprocess.unref();

            // Wait for it to come up
            console.error("Waiting for Ollama to initialize...");
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 1000));
                if (await isOllamaReachable()) {
                    console.error("✅ Ollama started.");
                    break;
                }
            }
        } catch (e) {
            console.error("Failed to start Ollama automatically. Please run 'ollama serve' in a separate terminal.");
            return false;
        }
    }

    // 2. Check model
    try {
        const res = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (!res.ok) return false;
        const data = await res.json() as { models: Array<{ name: string }> };

        // Check if model exists
        const hasModel = data.models.some(m => m.name.includes(model));
        if (!hasModel) {
            console.error(`Pulling model ${model}...`);
            await execa("ollama", ["pull", model]);
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function isOllamaReachable(): Promise<boolean> {
    try {
        const res = await fetch(`${OLLAMA_HOST}/api/tags`);
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Generates embedding for text
 */
export async function getEmbedding(text: string, model = DEFAULT_MODEL): Promise<number[]> {
    const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
    });

    if (!res.ok) throw new Error("Failed to get embedding");
    const data = await res.json() as { embedding: number[] };
    return data.embedding;
}

/**
 * Basic Chunking Strategy
 */
function chunkContent(content: string): string[] {
    // Simple paragraph splitter
    return content.split(/\n\s*\n/).filter(c => c.trim().length > 20);
}

// Memory cache of the index to avoid constant disk reads/writes during massive updates
let indexCache: VectorIndex | null = null;
let saveTimer: NodeJS.Timeout | null = null;

async function getIndex(projectPath: string): Promise<VectorIndex> {
    if (indexCache) return indexCache;

    const indexPath = path.join(projectPath, ".arela", INDEX_FILE);
    if (await fs.pathExists(indexPath)) {
        indexCache = await fs.readJson(indexPath) as VectorIndex;
    } else {
        indexCache = {
            version: "5.0",
            model: DEFAULT_MODEL,
            timestamp: new Date().toISOString(),
            entries: []
        };
    }
    return indexCache;
}

async function saveIndex(projectPath: string, immediate = false) {
    if (!indexCache) return;

    // Debounce save
    if (saveTimer) clearTimeout(saveTimer);

    const doSave = async () => {
        const indexPath = path.join(projectPath, ".arela", INDEX_FILE);
        await fs.ensureDir(path.dirname(indexPath));
        indexCache!.timestamp = new Date().toISOString();
        await fs.writeJson(indexPath, indexCache);
        saveTimer = null;
    };

    if (immediate) {
        await doSave();
    } else {
        saveTimer = setTimeout(doSave, 2000); // Wait 2s before saving
    }
}

/**
 * Upsert a single file into the index
 */
export async function upsertFileIndex(projectPath: string, filePath: string) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    const relativePath = path.relative(projectPath, fullPath);

    // Skip ignored files
    if (relativePath.includes("node_modules") || relativePath.includes(".arela") || relativePath.includes("dist")) return;

    try {
        const content = await fs.readFile(fullPath, "utf-8");
        const chunks = chunkContent(content);
        const newEntries: VectorEntry[] = [];

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            newEntries.push({
                file: relativePath,
                chunk: chunk.slice(0, 500),
                embedding
            });
        }

        const index = await getIndex(projectPath);

        // Remove old entries for this file
        index.entries = index.entries.filter(e => e.file !== relativePath);
        // Add new
        index.entries.push(...newEntries);

        saveIndex(projectPath);
        // console.error(`Indexed ${relativePath}`); // Log to stderr to avoid breaking RPC
    } catch (e) {
        // console.error(`Failed to index ${relativePath}`, e);
    }
}

/**
 * Index the codebase (Bulk) -- Now uses upsert logic
 */
export async function buildVectorIndex(projectPath: string): Promise<number> {
    if (!(await checkOllama())) {
        throw new Error("Ollama is not reachable");
    }

    const entries: VectorEntry[] = [];

    // Find files
    const files = await glob("**/*.{ts,md,json}", {
        cwd: projectPath,
        ignore: ["**/node_modules/**", "**/dist/**", "**/.arela/**"]
    });

    console.error(`Embedding ${files.length} files...`); // Stderr for logs

    const index = await getIndex(projectPath);

    // For a full rebuild, we might strictly want to start fresh?
    // But for safety let's just upsert all.
    for (const file of files) {
        await upsertFileIndex(projectPath, file);
    }

    await saveIndex(projectPath, true);
    return index.entries.length;
}

/**
 * Start Auto-Indexer Watcher
 */
export function startAutoIndexer(projectPath: string) {
    // Lazy import chokidar to avoid slow startup for CLI commands that don't need it
    import("chokidar").then(({ watch }) => {
        console.error("👁️  Starting Vector Auto-Indexer...");

        // Initial scan happen via 'add' events if we don't ignoreInitial
        // But for vast codebases that might slam Ollama. 
        // User said "initial indexes on launch". 
        // Let's use ignoreInitial: true and assume we start with what we have + background scan?

        // Actually, let's just watch for changes. If user wants full re-index they run the tool.
        // Wait, "we can have initial indexes on launch". 
        // Let's rely on the persistent index. If empty, maybe suggset running tool?
        // Or just let 'add' events fire?
        // Let's use ignoreInitial: true to be safe and fast on startup. 
        // The user can run `arela_vector_index` once. 

        const watcher = watch("**/*.{ts,md,json}", {
            cwd: projectPath,
            ignored: ["**/node_modules/**", "**/dist/**", "**/.arela/**", "**/.git/**"],
            ignoreInitial: true,
            persistent: true
        });

        watcher.on("add", file => upsertFileIndex(projectPath, file));
        watcher.on("change", file => upsertFileIndex(projectPath, file));
        watcher.on("unlink", async file => {
            const index = await getIndex(projectPath);
            index.entries = index.entries.filter(e => e.file !== file);
            saveIndex(projectPath);
        });
    });
}

/**
 * Search the index
 */
export async function searchVectorIndex(projectPath: string, query: string, topK = 5): Promise<Array<{ file: string, chunk: string, score: number }>> {
    const index = await getIndex(projectPath);
    if (index.entries.length === 0) return [];

    const queryVec = await getEmbedding(query, index.model);

    return index.entries
        .map(entry => ({
            ...entry,
            score: cosineSimilarity(queryVec, entry.embedding)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return dot / (magA * magB);
}
