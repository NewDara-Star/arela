import fs from "fs-extra";
import path from "path";
import { execa } from "execa";
import pc from "picocolors";

export interface IndexTrigger {
  type: "lines_added" | "files_added" | "time_elapsed" | "commits" | "manual";
  threshold: number;
  last_triggered?: string;
  count?: number;
}

export interface AutoIndexConfig {
  enabled: boolean;
  silent: boolean;
  triggers: IndexTrigger[];
  exclude_patterns?: string[];
}

const CONFIG_FILE = ".arela/auto-index.json";
const STATE_FILE = ".arela/.auto-index-state.json";

/**
 * Default auto-index configuration
 */
const DEFAULT_CONFIG: AutoIndexConfig = {
  enabled: true,
  silent: true,
  triggers: [
    {
      type: "lines_added",
      threshold: 1000,
    },
    {
      type: "files_added",
      threshold: 10,
    },
    {
      type: "time_elapsed",
      threshold: 3600000, // 1 hour in ms
    },
    {
      type: "commits",
      threshold: 5,
    },
  ],
  exclude_patterns: [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    "*.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ],
};

interface IndexState {
  last_index_time: string;
  last_index_commit?: string;
  lines_since_last_index: number;
  files_since_last_index: number;
  commits_since_last_index: number;
}

/**
 * Load auto-index configuration
 */
export async function loadAutoIndexConfig(cwd: string): Promise<AutoIndexConfig> {
  const configPath = path.join(cwd, CONFIG_FILE);
  
  if (!(await fs.pathExists(configPath))) {
    // Create default config
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSON(configPath, DEFAULT_CONFIG, { spaces: 2 });
    return DEFAULT_CONFIG;
  }
  
  return await fs.readJSON(configPath);
}

/**
 * Load index state
 */
async function loadIndexState(cwd: string): Promise<IndexState> {
  const statePath = path.join(cwd, STATE_FILE);
  
  if (!(await fs.pathExists(statePath))) {
    return {
      last_index_time: new Date().toISOString(),
      lines_since_last_index: 0,
      files_since_last_index: 0,
      commits_since_last_index: 0,
    };
  }
  
  return await fs.readJSON(statePath);
}

/**
 * Save index state
 */
async function saveIndexState(cwd: string, state: IndexState): Promise<void> {
  const statePath = path.join(cwd, STATE_FILE);
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJSON(statePath, state, { spaces: 2 });
}

/**
 * Count lines added since last index
 */
async function countLinesAdded(cwd: string, state: IndexState): Promise<number> {
  try {
    // Get diff stats since last index
    const { stdout } = await execa("git", [
      "diff",
      "--numstat",
      state.last_index_commit || "HEAD~10",
      "HEAD",
    ], { cwd });
    
    let totalLines = 0;
    const lines = stdout.split("\n");
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const [added] = line.split("\t");
      totalLines += parseInt(added, 10) || 0;
    }
    
    return totalLines;
  } catch {
    return 0;
  }
}

/**
 * Count files added since last index
 */
async function countFilesAdded(cwd: string, state: IndexState): Promise<number> {
  try {
    const { stdout } = await execa("git", [
      "diff",
      "--name-only",
      state.last_index_commit || "HEAD~10",
      "HEAD",
    ], { cwd });
    
    return stdout.split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Count commits since last index
 */
async function countCommitsSince(cwd: string, state: IndexState): Promise<number> {
  try {
    const { stdout } = await execa("git", [
      "rev-list",
      "--count",
      `${state.last_index_commit || "HEAD~10"}..HEAD`,
    ], { cwd });
    
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Get current git commit hash
 */
async function getCurrentCommit(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "HEAD"], { cwd });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

/**
 * Check if any trigger threshold is met
 */
async function checkTriggers(
  cwd: string,
  config: AutoIndexConfig,
  state: IndexState
): Promise<{ triggered: boolean; reason?: string }> {
  for (const trigger of config.triggers) {
    switch (trigger.type) {
      case "lines_added": {
        const lines = await countLinesAdded(cwd, state);
        if (lines >= trigger.threshold) {
          return {
            triggered: true,
            reason: `${lines} lines added (threshold: ${trigger.threshold})`,
          };
        }
        break;
      }
      
      case "files_added": {
        const files = await countFilesAdded(cwd, state);
        if (files >= trigger.threshold) {
          return {
            triggered: true,
            reason: `${files} files added (threshold: ${trigger.threshold})`,
          };
        }
        break;
      }
      
      case "time_elapsed": {
        const elapsed = Date.now() - new Date(state.last_index_time).getTime();
        if (elapsed >= trigger.threshold) {
          return {
            triggered: true,
            reason: `${Math.floor(elapsed / 60000)} minutes elapsed (threshold: ${Math.floor(trigger.threshold / 60000)} minutes)`,
          };
        }
        break;
      }
      
      case "commits": {
        const commits = await countCommitsSince(cwd, state);
        if (commits >= trigger.threshold) {
          return {
            triggered: true,
            reason: `${commits} commits (threshold: ${trigger.threshold})`,
          };
        }
        break;
      }
    }
  }
  
  return { triggered: false };
}

/**
 * Run RAG indexing
 */
async function runIndexing(cwd: string, silent: boolean): Promise<void> {
  if (!silent) {
    console.log(pc.blue("🔄 Running RAG indexing..."));
  }
  
  try {
    await execa("npx", ["arela", "index"], {
      cwd,
      stdio: silent ? "pipe" : "inherit",
    });
    
    if (!silent) {
      console.log(pc.green("✓ Indexing complete"));
    }
  } catch (error) {
    if (!silent) {
      console.error(pc.red("✗ Indexing failed:"), error);
    }
  }
}

/**
 * Check and potentially trigger auto-indexing
 */
export async function checkAutoIndex(cwd: string): Promise<void> {
  const config = await loadAutoIndexConfig(cwd);
  
  if (!config.enabled) {
    return;
  }
  
  const state = await loadIndexState(cwd);
  const { triggered, reason } = await checkTriggers(cwd, config, state);
  
  if (triggered) {
    if (!config.silent) {
      console.log(pc.cyan(`\n📊 Auto-indexing triggered: ${reason}\n`));
    }
    
    await runIndexing(cwd, config.silent);
    
    // Update state
    const newState: IndexState = {
      last_index_time: new Date().toISOString(),
      last_index_commit: await getCurrentCommit(cwd),
      lines_since_last_index: 0,
      files_since_last_index: 0,
      commits_since_last_index: 0,
    };
    
    await saveIndexState(cwd, newState);
  }
}

/**
 * Install git post-commit hook for auto-indexing
 */
export async function installAutoIndexHook(cwd: string): Promise<void> {
  const hookPath = path.join(cwd, ".husky/post-commit");
  
  const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Auto-index on milestones
npx arela check-auto-index
`;
  
  await fs.ensureDir(path.dirname(hookPath));
  await fs.writeFile(hookPath, hookContent);
  await fs.chmod(hookPath, 0o755);
  
  console.log(pc.green("✓ Installed post-commit hook for auto-indexing"));
}

/**
 * Show auto-index status
 */
export async function showAutoIndexStatus(cwd: string): Promise<void> {
  const config = await loadAutoIndexConfig(cwd);
  const state = await loadIndexState(cwd);
  
  console.log(pc.bold(pc.cyan("\n📊 Auto-Index Status\n")));
  
  console.log(pc.bold("Enabled:"), config.enabled ? pc.green("Yes") : pc.red("No"));
  console.log(pc.bold("Silent:"), config.silent ? "Yes" : "No");
  console.log(pc.bold("Last indexed:"), new Date(state.last_index_time).toLocaleString());
  
  console.log(pc.bold("\nTriggers:"));
  
  for (const trigger of config.triggers) {
    let current = 0;
    let unit = "";
    
    switch (trigger.type) {
      case "lines_added":
        current = await countLinesAdded(cwd, state);
        unit = "lines";
        break;
      case "files_added":
        current = await countFilesAdded(cwd, state);
        unit = "files";
        break;
      case "time_elapsed":
        current = Math.floor((Date.now() - new Date(state.last_index_time).getTime()) / 60000);
        unit = "minutes";
        break;
      case "commits":
        current = await countCommitsSince(cwd, state);
        unit = "commits";
        break;
    }
    
    const percent = (current / trigger.threshold) * 100;
    const color = percent >= 100 ? pc.red : percent >= 80 ? pc.yellow : pc.green;
    
    console.log(
      `  ${trigger.type}: ${color(`${current}/${trigger.threshold} ${unit}`)} (${percent.toFixed(0)}%)`
    );
  }
  
  console.log("");
}
