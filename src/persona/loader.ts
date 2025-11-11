import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface InitProjectOptions {
  cwd: string;
  force?: boolean;
  preset?: "startup" | "enterprise" | "solo" | "custom";
}

export interface InitProjectResult {
  created: string[];
  skipped: string[];
}

interface PresetConfig {
  name: string;
  description: string;
  rules: string[];
}

/**
 * Load preset configuration
 */
async function loadPreset(preset: string): Promise<PresetConfig> {
  const presetPath = path.join(__dirname, "templates", "presets", `${preset}.json`);
  return await fs.readJson(presetPath);
}

/**
 * Initialize Arela in a project
 */
export async function initProject(opts: InitProjectOptions): Promise<InitProjectResult> {
  const { cwd, force = false, preset = "startup" } = opts;
  const created: string[] = [];
  const skipped: string[] = [];

  // Create .windsurf/rules directory
  const windsurfRulesDir = path.join(cwd, ".windsurf", "rules");
  await fs.ensureDir(windsurfRulesDir);

  // Create .arela/tickets directory structure
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  await fs.ensureDir(ticketsDir);

  // Create agent-specific ticket directories
  const agentDirs = ["codex", "claude", "deepseek", "ollama", "cascade"];
  for (const agent of agentDirs) {
    const agentDir = path.join(ticketsDir, agent);
    await fs.ensureDir(agentDir);
  }

  // Load preset and copy rules
  const templatesDir = path.join(__dirname, "templates");
  const rulesDir = path.join(templatesDir, "rules");
  const templateExists = await fs.pathExists(templatesDir);

  if (templateExists) {
    // Copy main persona file
    const personaSource = path.join(templatesDir, "arela-cto.md");
    const personaDest = path.join(windsurfRulesDir, "arela-cto.md");
    
    if (await fs.pathExists(personaSource)) {
      const exists = await fs.pathExists(personaDest);
      if (!exists || force) {
        await fs.copyFile(personaSource, personaDest);
        created.push(path.relative(cwd, personaDest));
      } else {
        skipped.push(path.relative(cwd, personaDest));
      }
    }
    
    // Load preset configuration
    const presetConfig = await loadPreset(preset);
    
    // Copy rules based on preset
    for (const ruleFile of presetConfig.rules) {
      const ruleSource = path.join(rulesDir, ruleFile);
      const ruleDest = path.join(windsurfRulesDir, ruleFile);
      
      if (!(await fs.pathExists(ruleSource))) {
        console.warn(`Warning: Rule file not found: ${ruleFile}`);
        continue;
      }
      
      const exists = await fs.pathExists(ruleDest);
      if (!exists || force) {
        await fs.copyFile(ruleSource, ruleDest);
        created.push(path.relative(cwd, ruleDest));
      } else {
        skipped.push(path.relative(cwd, ruleDest));
      }
    }
  }

  // Create README in tickets directory
  const ticketsReadmePath = path.join(ticketsDir, "README.md");
  const readmeExists = await fs.pathExists(ticketsReadmePath);
  
  if (!readmeExists || force) {
    await fs.writeFile(
      ticketsReadmePath,
      `# Arela Tickets

Create tickets in agent-specific folders:

- \`codex/\` - Simple tasks (CRUD, boilerplate)
- \`claude/\` - Complex tasks (architecture, refactoring)
- \`deepseek/\` - Optimization tasks
- \`ollama/\` - Offline/unlimited tasks
- \`cascade/\` - IDE-integrated tasks

## Ticket Format

### Markdown (TICKET-001.md)
\`\`\`markdown
# CODEX-001: Create Login Component

**Agent:** codex
**Priority:** high
**Complexity:** simple

## Description
Build login form with email/password validation

## Tasks
- [ ] Email input
- [ ] Password input
- [ ] Form validation
\`\`\`

### YAML (TICKET-001.yaml)
\`\`\`yaml
id: CODEX-001
title: Create Login Component
agent: codex
priority: high
complexity: simple
description: Build login form with email/password validation
tasks:
  - Email input
  - Password input
  - Form validation
\`\`\`

## Running Tickets

\`\`\`bash
# Run all tickets
arela orchestrate

# Run in parallel
arela orchestrate --parallel

# Run specific agent
arela orchestrate --agent codex

# Check status
arela status
\`\`\`
`,
      "utf-8"
    );
    created.push(path.relative(cwd, ticketsReadmePath));
  } else {
    skipped.push(path.relative(cwd, ticketsReadmePath));
  }

  return { created, skipped };
}
