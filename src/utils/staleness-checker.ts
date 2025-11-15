import fs from "fs";
import path from "path";
import { spawn } from "child_process";

/**
 * Checks if memory (RAG index, Graph DB) is stale and auto-updates if needed
 * 
 * Triggers:
 * - On every CLI command (via preAction hook)
 * - On MCP server start
 * - Before expensive operations (search, analyze)
 * 
 * Strategy:
 * - Check file age every 5 minutes (don't spam)
 * - If >1 hour old → update in background (non-blocking)
 * - If >24 hours old → update now (blocking, critical)
 */
export class StalenessChecker {
  private lastCheck: number = 0;
  private checkInterval: number;
  private maxAge: number;
  private blockingThreshold: number;
  private cwd: string;

  constructor(options: {
    cwd?: string;
    checkInterval?: number; // How often to check (ms)
    maxAge?: number; // Max age before update (ms)
    blockingThreshold?: number; // Age at which we block (ms)
  } = {}) {
    this.cwd = options.cwd || process.cwd();
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // 5 minutes
    this.maxAge = options.maxAge || 60 * 60 * 1000; // 1 hour
    this.blockingThreshold = options.blockingThreshold || 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Check if memory is stale and update if needed
   * Called on every CLI command via preAction hook
   */
  async checkAndUpdate(options: { silent?: boolean } = {}): Promise<void> {
    const now = Date.now();

    // Don't check too frequently (avoid spam)
    if (now - this.lastCheck < this.checkInterval) {
      return;
    }

    this.lastCheck = now;

    // Check file ages
    const ragAge = this.getFileAge(".arela/.rag-index.json");
    const graphAge = this.getFileAge(".arela/memory/graph.db");

    const maxAgeMs = Math.max(ragAge, graphAge);

    // If files don't exist, skip (don't force update on first run)
    if (maxAgeMs === Infinity) {
      return;
    }

    // Fresh enough, no update needed
    if (maxAgeMs < this.maxAge) {
      return;
    }

    // Very stale (>24 hours) - just notify, don't block
    // Blocking updates hang the CLI, so we always do background updates
    if (maxAgeMs > this.blockingThreshold) {
      if (!options.silent) {
        console.log(
          `⚠️  Memory very stale (last updated ${this.formatAge(maxAgeMs)} ago)`
        );
        console.log("💡 Run 'arela index' to update");
      }
      return;
    }

    // Stale (>1 hour) - just notify
    if (!options.silent && maxAgeMs > this.maxAge) {
      console.log(
        `💡 Memory stale (${this.formatAge(maxAgeMs)} old). Run 'arela index' to update.`
      );
    }
  }

  /**
   * Get age of file in milliseconds
   * Returns Infinity if file doesn't exist
   */
  private getFileAge(relativePath: string): number {
    try {
      const fullPath = path.join(this.cwd, relativePath);
      const stats = fs.statSync(fullPath);
      return Date.now() - stats.mtimeMs;
    } catch {
      return Infinity; // File doesn't exist = very stale
    }
  }

  /**
   * Format age in human-readable format
   */
  private formatAge(ms: number): string {
    if (ms === Infinity) return "never";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }

  /**
   * Update memory in background (non-blocking)
   * Spawns detached process that continues after parent exits
   */
  private updateInBackground(): void {
    try {
      const child = spawn("npm", ["run", "arela", "--", "auto-index"], {
        detached: true,
        stdio: "ignore",
        cwd: this.cwd,
      });

      // Don't wait for child process
      child.unref();
    } catch (error) {
      // Silently fail - not critical
      console.error("⚠️  Failed to start background update:", error);
    }
  }

  /**
   * Update memory now (blocking)
   * Waits for update to complete before continuing
   */
  private async updateBlocking(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("npm", ["run", "arela", "--", "auto-index"], {
        stdio: "inherit",
        cwd: this.cwd,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Update failed with code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }

  /**
   * Force update now (for manual refresh)
   */
  async forceUpdate(): Promise<void> {
    console.log("🔄 Forcing memory update...");
    await this.updateBlocking();
    console.log("✅ Memory updated!");
  }

  /**
   * Get staleness info (for status commands)
   */
  getStalenessInfo(): {
    ragAge: number;
    graphAge: number;
    isStale: boolean;
    isVeryStale: boolean;
  } {
    const ragAge = this.getFileAge(".arela/.rag-index.json");
    const graphAge = this.getFileAge(".arela/memory/graph.db");
    const maxAge = Math.max(ragAge, graphAge);

    return {
      ragAge,
      graphAge,
      isStale: maxAge > this.maxAge,
      isVeryStale: maxAge > this.blockingThreshold,
    };
  }
}

// Singleton instance
let instance: StalenessChecker | null = null;

/**
 * Get global staleness checker instance
 */
export function getStalenessChecker(
  options?: ConstructorParameters<typeof StalenessChecker>[0]
): StalenessChecker {
  if (!instance) {
    instance = new StalenessChecker(options);
  }
  return instance;
}
