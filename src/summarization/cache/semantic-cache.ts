import fs from "fs-extra";
import path from "path";
import type { SemanticContract } from "../extractor/types.js";
import type { TechnicalSummary } from "../synthesizer/types.js";
import { computeSemanticHash } from "./semantic-hash.js";
import type { CacheEntry, CacheStats } from "./types.js";

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_PRICE_PER_CALL = 0.0001; // Approximate $ cost per LLM call

export interface SemanticCacheOptions {
  /**
   * Override cache directory. Defaults to:
   *   <projectPath>/.arela/cache/summaries
   */
  cacheDir?: string;
  /**
   * Time-to-live for entries in milliseconds.
   * Defaults to 30 days.
   */
  ttlMs?: number;
  /**
   * Maximum number of cache entries to keep.
   * Defaults to 1000.
   */
  maxEntries?: number;
  /**
   * Approximate price per LLM call in dollars,
   * used for savings estimates.
   */
  pricePerCall?: number;
  /**
   * Optional logger. Defaults to console.log.
   */
  logger?: (message: string) => void;
}

export class SemanticCache {
  private readonly cacheDir: string;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly pricePerCall: number;
  private readonly log: (message: string) => void;

  private stats: CacheStats;

  constructor(projectPath: string, options: SemanticCacheOptions = {}) {
    this.cacheDir =
      options.cacheDir ??
      path.join(projectPath, ".arela", "cache", "summaries");
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.pricePerCall = options.pricePerCall ?? DEFAULT_PRICE_PER_CALL;
    this.log = options.logger ?? ((msg: string) => console.log(msg));

    this.stats = {
      hits: 0,
      misses: 0,
      savings: 0,
    };
  }

  /**
   * Get cached summary if semantic contract unchanged.
   * Returns null on cache miss or expired entry.
   */
  async get(contract: SemanticContract): Promise<TechnicalSummary | null> {
    const hash = computeSemanticHash(contract);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);

    try {
      if (!(await fs.pathExists(cacheFile))) {
        this.stats.misses++;
        return null;
      }

      const entry = (await fs.readJSON(cacheFile)) as CacheEntry;

      const age = Date.now() - new Date(entry.cachedAt).getTime();
      if (age > this.ttlMs) {
        await fs.remove(cacheFile);
        this.stats.misses++;
        return null;
      }

      entry.hits += 1;
      await fs.writeJSON(cacheFile, entry, { spaces: 2 });

      this.stats.hits += 1;
      this.stats.savings += this.pricePerCall;

      this.log(
        `✅ Semantic cache HIT: ${contract.filePath} (hash=${hash}, hits=${entry.hits})`,
      );
      return entry.summary;
    } catch {
      // On any cache error, behave as a miss but avoid crashing the caller.
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store summary in cache (overwriting any existing entry).
   */
  async set(
    contract: SemanticContract,
    summary: TechnicalSummary,
  ): Promise<void> {
    const hash = computeSemanticHash(contract);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);

    const entry: CacheEntry = {
      semanticHash: hash,
      summary,
      contract: {
        ...contract,
      },
      cachedAt: new Date().toISOString(),
      hits: 0,
    };

    try {
      await fs.ensureDir(this.cacheDir);
      await fs.writeJSON(cacheFile, entry, { spaces: 2 });
      await this.enforceSizeLimit();

      this.log(`💾 Semantic cache WRITE: ${contract.filePath} (hash=${hash})`);
    } catch {
      // Ignore cache write errors; caller's flow should not fail.
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate =
      total === 0 ? 0 : Math.round((this.stats.hits / total) * 100);

    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * Clear expired cache entries and return the number removed.
   */
  async cleanup(): Promise<number> {
    let removed = 0;

    try {
      if (!(await fs.pathExists(this.cacheDir))) {
        return 0;
      }

      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const entry = (await fs.readJSON(filePath)) as CacheEntry;
        const age = Date.now() - new Date(entry.cachedAt).getTime();

        if (age > this.ttlMs) {
          await fs.remove(filePath);
          removed += 1;
        }
      }
    } catch {
      // Ignore cleanup errors; best-effort only.
    }

    return removed;
  }

  /**
   * Remove least-recently-cached entries when over size limit.
   * Uses cachedAt as a proxy for recency.
   */
  private async enforceSizeLimit(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.cacheDir))) {
        return;
      }

      const files = await fs.readdir(this.cacheDir);

      if (files.length <= this.maxEntries) {
        return;
      }

      const entries: { file: string; cachedAt: number }[] = [];

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        try {
          const entry = (await fs.readJSON(filePath)) as CacheEntry;
          const ts = new Date(entry.cachedAt).getTime() || 0;
          entries.push({ file: filePath, cachedAt: ts });
        } catch {
          // If a file is unreadable, remove it proactively.
          await fs.remove(filePath);
        }
      }

      // Sort oldest first and remove until within limit
      entries.sort((a, b) => a.cachedAt - b.cachedAt);

      while (entries.length > this.maxEntries) {
        const oldest = entries.shift();
        if (oldest) {
          await fs.remove(oldest.file);
        }
      }
    } catch {
      // Ignore size enforcement errors.
    }
  }
}

