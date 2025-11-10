import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { globalConfig } from "./global-config.js";

export interface Pattern {
  id: string;
  violation: string;
  rule: string;
  severity: "low" | "medium" | "high";
  occurrences: number;
  projects: number;
  status: "suggested" | "approved" | "enforced";
  createdAt: string;
  lastSeen: string;
}

export interface PatternConfig {
  thresholds: {
    createPattern: { occurrences: number; projects: number };
    suggestRule: { occurrences: number; projects: number };
    autoEnforce: { occurrences: number; projects: number };
  };
  patterns: Pattern[];
}

/**
 * Get pattern config path
 */
function getPatternConfigPath(): string {
  const os = require("os");
  return path.join(os.homedir(), ".arela", "patterns.json");
}

/**
 * Load pattern config
 */
export async function loadPatternConfig(): Promise<PatternConfig> {
  const configPath = getPatternConfigPath();
  
  if (!(await fs.pathExists(configPath))) {
    return {
      thresholds: {
        createPattern: { occurrences: 3, projects: 2 },
        suggestRule: { occurrences: 5, projects: 3 },
        autoEnforce: { occurrences: 10, projects: 5 },
      },
      patterns: [],
    };
  }
  
  try {
    return await fs.readJson(configPath);
  } catch {
    return {
      thresholds: {
        createPattern: { occurrences: 3, projects: 2 },
        suggestRule: { occurrences: 5, projects: 3 },
        autoEnforce: { occurrences: 10, projects: 5 },
      },
      patterns: [],
    };
  }
}

/**
 * Save pattern config
 */
export async function savePatternConfig(config: PatternConfig): Promise<void> {
  const configPath = getPatternConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Show pattern learning configuration
 */
export async function showPatternConfig(): Promise<void> {
  const config = await loadPatternConfig();
  
  console.log(pc.bold(pc.cyan("\n📊 Pattern Learning Configuration\n")));
  
  console.log(pc.bold("Thresholds:\n"));
  console.log(
    `- Create pattern: ${config.thresholds.createPattern.occurrences} occurrences across ${config.thresholds.createPattern.projects} projects`,
  );
  console.log(
    `- Suggest rule: ${config.thresholds.suggestRule.occurrences} occurrences across ${config.thresholds.suggestRule.projects} projects`,
  );
  console.log(
    `- Auto-enforce: ${config.thresholds.autoEnforce.occurrences} occurrences across ${config.thresholds.autoEnforce.projects} projects`,
  );
  console.log("");
  
  if (config.patterns.length === 0) {
    console.log(pc.yellow("No patterns learned yet."));
    console.log(pc.gray("\nPatterns will be created automatically as violations are detected.\n"));
    return;
  }
  
  console.log(pc.bold(`Current Patterns (${config.patterns.length}):\n`));
  
  for (let i = 0; i < config.patterns.length; i++) {
    const pattern = config.patterns[i];
    const statusIcon = {
      suggested: pc.yellow("📋"),
      approved: pc.green("✅"),
      enforced: pc.cyan("🔒"),
    }[pattern.status];
    
    console.log(`${i + 1}. ${statusIcon} ${pc.bold(pattern.violation)}`);
    console.log(pc.gray(`   Rule: ${pattern.rule}`));
    console.log(pc.gray(`   Severity: ${pattern.severity}`));
    console.log(pc.gray(`   Occurrences: ${pattern.occurrences} (${pattern.projects} projects)`));
    console.log(pc.gray(`   Status: ${pattern.status}`));
    console.log("");
  }
}

/**
 * Add pattern manually
 */
export async function addPattern(
  violation: string,
  rule: string,
  severity: "low" | "medium" | "high",
): Promise<void> {
  const config = await loadPatternConfig();
  
  // Check if pattern already exists
  const existing = config.patterns.find((p) => p.violation === violation);
  
  if (existing) {
    console.log(pc.yellow(`\n⚠️  Pattern already exists: ${violation}\n`));
    return;
  }
  
  const pattern: Pattern = {
    id: `pattern-${Date.now()}`,
    violation,
    rule,
    severity,
    occurrences: 1,
    projects: 1,
    status: "approved",
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  
  config.patterns.push(pattern);
  await savePatternConfig(config);
  
  console.log(pc.green(`\n✓ Pattern added: ${violation}`));
  console.log(pc.gray(`  Rule: ${rule}`));
  console.log(pc.gray(`  Severity: ${severity}\n`));
}

/**
 * Approve pattern
 */
export async function approvePattern(patternId: string): Promise<void> {
  const config = await loadPatternConfig();
  
  const pattern = config.patterns.find((p) => p.id === patternId);
  
  if (!pattern) {
    throw new Error(`Pattern not found: ${patternId}`);
  }
  
  if (pattern.status === "approved" || pattern.status === "enforced") {
    console.log(pc.yellow(`\n⚠️  Pattern already approved: ${pattern.violation}\n`));
    return;
  }
  
  pattern.status = "approved";
  await savePatternConfig(config);
  
  console.log(pc.green(`\n✓ Pattern approved: ${pattern.violation}\n`));
}

/**
 * List patterns
 */
export async function listPatterns(filter?: "suggested" | "approved" | "enforced"): Promise<void> {
  const config = await loadPatternConfig();
  
  let patterns = config.patterns;
  
  if (filter) {
    patterns = patterns.filter((p) => p.status === filter);
  }
  
  if (patterns.length === 0) {
    console.log(pc.yellow(`\nNo ${filter || ""} patterns found.\n`));
    return;
  }
  
  console.log(pc.bold(pc.cyan(`\n📋 ${filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : "All"} Patterns\n`)));
  
  for (const pattern of patterns) {
    const statusIcon = {
      suggested: pc.yellow("📋"),
      approved: pc.green("✅"),
      enforced: pc.cyan("🔒"),
    }[pattern.status];
    
    console.log(`${statusIcon} ${pc.bold(pattern.violation)}`);
    console.log(pc.gray(`  ID: ${pattern.id}`));
    console.log(pc.gray(`  Rule: ${pattern.rule}`));
    console.log(pc.gray(`  Severity: ${pattern.severity}`));
    console.log(pc.gray(`  Occurrences: ${pattern.occurrences} (${pattern.projects} projects)`));
    console.log("");
  }
}

/**
 * Export patterns for team sharing
 */
export async function exportPatterns(outputPath: string): Promise<void> {
  const config = await loadPatternConfig();
  
  const exportData = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    patterns: config.patterns.filter((p) => p.status === "approved" || p.status === "enforced"),
  };
  
  await fs.writeJson(outputPath, exportData, { spaces: 2 });
  
  console.log(pc.green(`\n✓ Exported ${exportData.patterns.length} patterns to: ${outputPath}\n`));
}

/**
 * Import patterns from team
 */
export async function importPatterns(inputPath: string): Promise<void> {
  if (!(await fs.pathExists(inputPath))) {
    throw new Error(`File not found: ${inputPath}`);
  }
  
  const importData = await fs.readJson(inputPath);
  const config = await loadPatternConfig();
  
  let imported = 0;
  let skipped = 0;
  
  for (const pattern of importData.patterns) {
    const existing = config.patterns.find((p) => p.violation === pattern.violation);
    
    if (existing) {
      skipped++;
      continue;
    }
    
    config.patterns.push({
      ...pattern,
      id: `pattern-${Date.now()}-${imported}`,
      createdAt: new Date().toISOString(),
    });
    
    imported++;
  }
  
  await savePatternConfig(config);
  
  console.log(pc.green(`\n✓ Imported ${imported} patterns`));
  
  if (skipped > 0) {
    console.log(pc.yellow(`⚠️  Skipped ${skipped} duplicate patterns`));
  }
  
  console.log("");
}
