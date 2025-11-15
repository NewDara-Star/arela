import path from "path";
import fs from "fs-extra";
import pc from "picocolors";
import { GraphDB } from "./storage.js";
import { ingestCodebase } from "./index.js";

export interface AutoRefreshOptions {
  cwd: string;
  maxAgeHours?: number;
  silent?: boolean;
  force?: boolean;
}

/**
 * Check if graph DB needs refresh and auto-refresh if stale
 * Called on session start (first command)
 */
export async function checkAndRefreshGraph(
  options: AutoRefreshOptions
): Promise<{ refreshed: boolean; reason?: string }> {
  const { cwd, maxAgeHours = 24, silent = false, force = false } = options;

  const dbPath = path.join(cwd, ".arela", "memory", "graph.db");

  // If DB doesn't exist, ingest is needed
  if (!(await fs.pathExists(dbPath))) {
    if (!silent) {
      console.log(pc.yellow("\n⚠️  Graph DB not found. Running initial ingest..."));
    }

    await ingestCodebase(cwd, { refresh: true, verbose: !silent });

    return { refreshed: true, reason: "initial_ingest" };
  }

  // Check if stale
  const db = new GraphDB(dbPath);
  const isStale = force || db.isStale(maxAgeHours);
  db.close();

  if (!isStale) {
    if (!silent) {
      const lastIngest = new GraphDB(dbPath).getMetadata("last_ingest_time");
      new GraphDB(dbPath).close();
      console.log(
        pc.gray(
          `✓ Graph DB is fresh (last updated: ${lastIngest ? new Date(lastIngest).toLocaleString() : "unknown"})`
        )
      );
    }
    return { refreshed: false };
  }

  // Refresh in background (non-blocking)
  if (!silent) {
    console.log(
      pc.yellow(
        `\n🔄 Graph DB is stale (>${maxAgeHours}h old). Refreshing in background...`
      )
    );
  }

  // Run refresh asynchronously
  ingestCodebase(cwd, { refresh: true, verbose: false })
    .then(() => {
      if (!silent) {
        console.log(pc.green("\n✅ Graph DB refreshed successfully!"));
      }
    })
    .catch((error) => {
      if (!silent) {
        console.error(pc.red("\n❌ Graph DB refresh failed:"), error.message);
      }
    });

  return { refreshed: true, reason: "stale_data" };
}

/**
 * Get graph DB staleness info
 */
export function getGraphStaleness(cwd: string): {
  exists: boolean;
  lastIngest?: string;
  ageHours?: number;
  isStale: boolean;
} {
  const dbPath = path.join(cwd, ".arela", "memory", "graph.db");

  if (!fs.existsSync(dbPath)) {
    return { exists: false, isStale: true };
  }

  const db = new GraphDB(dbPath);
  const lastIngest = db.getMetadata("last_ingest_time");
  const isStale = db.isStale(24);
  db.close();

  if (!lastIngest) {
    return { exists: true, isStale: true };
  }

  const lastIngestTime = new Date(lastIngest).getTime();
  const ageHours = (Date.now() - lastIngestTime) / (1000 * 60 * 60);

  return {
    exists: true,
    lastIngest,
    ageHours,
    isStale,
  };
}
