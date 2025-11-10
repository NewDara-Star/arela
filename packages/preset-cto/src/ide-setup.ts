import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IDEConfig {
  name: string;
  ruleFile: string;
  templateFile: string;
}

export const IDE_CONFIGS: Record<string, IDEConfig> = {
  windsurf: {
    name: "Windsurf",
    ruleFile: ".windsurfrules",
    templateFile: "windsurfrules.txt",
  },
  cursor: {
    name: "Cursor",
    ruleFile: ".cursorrules",
    templateFile: "cursorrules.txt",
  },
  cline: {
    name: "Cline",
    ruleFile: ".clinerules",
    templateFile: "clinerules.txt",
  },
};

/**
 * Create IDE rule files
 */
export async function createIDERules(
  cwd: string,
  options: {
    ide?: string;
    force?: boolean;
  } = {}
): Promise<{ created: string[]; skipped: string[] }> {
  const { ide, force = false } = options;
  const created: string[] = [];
  const skipped: string[] = [];
  
  // Determine which IDEs to set up
  const ides = ide ? [ide] : Object.keys(IDE_CONFIGS);
  
  for (const ideName of ides) {
    const config = IDE_CONFIGS[ideName];
    if (!config) {
      console.log(pc.yellow(`⚠️  Unknown IDE: ${ideName}`));
      continue;
    }
    
    const destPath = path.join(cwd, config.ruleFile);
    
    // Check if file already exists
    if (fs.existsSync(destPath) && !force) {
      console.log(pc.gray(`⏭️  ${config.ruleFile} already exists, skipping`));
      skipped.push(config.ruleFile);
      continue;
    }
    
    // Load template
    const templatePath = path.join(__dirname, "..", "templates", "ide", config.templateFile);
    
    if (!fs.existsSync(templatePath)) {
      console.log(pc.yellow(`⚠️  Template not found: ${config.templateFile}`));
      continue;
    }
    
    const template = await fs.promises.readFile(templatePath, "utf-8");
    
    // Write to destination
    await fs.promises.writeFile(destPath, template, "utf-8");
    console.log(pc.green(`✅ Created ${config.ruleFile} for ${config.name}`));
    created.push(config.ruleFile);
  }
  
  return { created, skipped };
}

/**
 * Setup IDE integration
 */
export async function setupIDE(
  cwd: string,
  ideName: string
): Promise<void> {
  const config = IDE_CONFIGS[ideName];
  if (!config) {
    throw new Error(`Unknown IDE: ${ideName}. Supported: ${Object.keys(IDE_CONFIGS).join(", ")}`);
  }
  
  console.log(pc.bold(pc.cyan(`\n🔧 Setting up ${config.name} integration\n`)));
  
  // Create IDE rules
  await createIDERules(cwd, { ide: ideName });
  
  // Check for .arela directory
  const arelaDir = path.join(cwd, ".arela");
  if (!fs.existsSync(arelaDir)) {
    console.log(pc.yellow("\n⚠️  .arela directory not found"));
    console.log(pc.gray("Run: npx arela init"));
    return;
  }
  
  console.log(pc.green("\n✅ IDE setup complete!"));
  console.log(pc.gray("\nNext steps:"));
  console.log(pc.cyan("  1. Restart your IDE to load the rules"));
  console.log(pc.cyan("  2. Run: npx arela doctor --check-structure"));
  console.log(pc.cyan("  3. Start RAG server: npx arela serve"));
}

/**
 * List available IDEs
 */
export function listIDEs(): void {
  console.log(pc.bold(pc.cyan("\n📝 Supported IDEs:\n")));
  
  for (const [key, config] of Object.entries(IDE_CONFIGS)) {
    console.log(pc.bold(config.name));
    console.log(pc.gray(`  Command: npx arela setup --ide ${key}`));
    console.log(pc.gray(`  Rule file: ${config.ruleFile}`));
    console.log("");
  }
}
