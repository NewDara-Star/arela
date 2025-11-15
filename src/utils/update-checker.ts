import pc from "picocolors";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

interface PackageInfo {
  version: string;
  "dist-tags": {
    latest: string;
  };
}

interface UpdateCache {
  lastCheck: number;
  latestVersion: string;
}

const CACHE_FILE = path.join(os.homedir(), ".arela", ".update-cache.json");
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a newer version of arela is available
 */
export async function checkForUpdates(
  currentVersion: string,
  silent = false
): Promise<{ hasUpdate: boolean; latestVersion?: string }> {
  try {
    // Check npm registry for latest version
    const { stdout } = await execAsync("npm view arela version", {
      timeout: 3000, // 3 second timeout
    });

    const latestVersion = stdout.trim();

    if (!latestVersion) {
      return { hasUpdate: false };
    }

    // Compare versions
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    if (hasUpdate && !silent) {
      showUpdateNotification(currentVersion, latestVersion);
    }

    return { hasUpdate, latestVersion };
  } catch (error) {
    // Silently fail - don't block the CLI
    return { hasUpdate: false };
  }
}

/**
 * Compare semantic versions
 */
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split(".").map(Number);
  const currentParts = current.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;

    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

/**
 * Show update notification
 */
function showUpdateNotification(current: string, latest: string): void {
  console.log("");
  console.log(pc.yellow("┌─────────────────────────────────────────────┐"));
  console.log(pc.yellow("│") + "  📦 Update available!                      " + pc.yellow("│"));
  console.log(pc.yellow("│") + "                                            " + pc.yellow("│"));
  console.log(
    pc.yellow("│") +
      `  ${pc.dim(current)} → ${pc.green(pc.bold(latest))}                           ` +
      pc.yellow("│")
  );
  console.log(pc.yellow("│") + "                                            " + pc.yellow("│"));
  console.log(
    pc.yellow("│") +
      "  Run: " +
      pc.cyan(pc.bold("npm install -g arela@latest")) +
      "     " +
      pc.yellow("│")
  );
  console.log(pc.yellow("└─────────────────────────────────────────────┘"));
  console.log("");
}

/**
 * Get cached update info
 */
async function getCachedUpdate(): Promise<UpdateCache | null> {
  try {
    if (await fs.pathExists(CACHE_FILE)) {
      const cache = await fs.readJson(CACHE_FILE);
      const age = Date.now() - cache.lastCheck;
      
      // Cache is still valid
      if (age < CACHE_DURATION) {
        return cache;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save update info to cache
 */
async function saveCachedUpdate(latestVersion: string): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(CACHE_FILE));
    await fs.writeJson(CACHE_FILE, {
      lastCheck: Date.now(),
      latestVersion,
    });
  } catch {
    // Ignore cache errors
  }
}

/**
 * Check for updates in background (non-blocking)
 */
export function checkForUpdatesAsync(currentVersion: string): void {
  // Check cache first (fast, synchronous check)
  getCachedUpdate()
    .then((cache) => {
      if (cache) {
        // Use cached version
        const hasUpdate = isNewerVersion(cache.latestVersion, currentVersion);
        if (hasUpdate) {
          showUpdateNotification(currentVersion, cache.latestVersion);
        }
        return;
      }
      
      // No cache, check npm (but don't block)
      checkForUpdates(currentVersion, false)
        .then(({ latestVersion }) => {
          if (latestVersion) {
            saveCachedUpdate(latestVersion);
          }
        })
        .catch(() => {
          // Silently fail
        });
    })
    .catch(() => {
      // Silently fail
    });
}

/**
 * Force update check and show result
 */
export async function forceUpdateCheck(
  currentVersion: string
): Promise<void> {
  console.log(pc.cyan("\n🔍 Checking for updates...\n"));

  const { hasUpdate, latestVersion } = await checkForUpdates(
    currentVersion,
    true
  );

  if (hasUpdate && latestVersion) {
    showUpdateNotification(currentVersion, latestVersion);
  } else {
    console.log(pc.green("✅ You're on the latest version!"));
    console.log(pc.dim(`   Current: ${currentVersion}\n`));
  }
}
