import fs from "fs";
import path from "path";
import { glob } from "glob";
import pc from "picocolors";

export interface StructureIssue {
  type: "error" | "warning";
  message: string;
  fix?: string;
  files?: string[];
}

/**
 * Check project structure for common issues
 */
export async function checkStructure(cwd: string): Promise<StructureIssue[]> {
  const issues: StructureIssue[] = [];
  
  // Check for tickets in wrong location
  const wrongTickets = await glob("docs/tickets/**/*.md", { cwd });
  if (wrongTickets.length > 0) {
    issues.push({
      type: "error",
      message: `Found ${wrongTickets.length} tickets in docs/tickets/, should be in .arela/tickets/`,
      fix: "Move tickets to .arela/tickets/",
      files: wrongTickets,
    });
  }
  
  // Check for .arela directory
  const arelaDir = path.join(cwd, ".arela");
  if (!fs.existsSync(arelaDir)) {
    issues.push({
      type: "error",
      message: "Missing .arela directory",
      fix: "Run: npx arela init",
    });
    return issues; // Can't check further without .arela
  }
  
  // Check for .arela/tickets directory
  const ticketsDir = path.join(arelaDir, "tickets");
  if (!fs.existsSync(ticketsDir)) {
    issues.push({
      type: "warning",
      message: "Missing .arela/tickets directory",
      fix: "Create directory: .arela/tickets/",
    });
  }
  
  // Check for IDE rules
  const ideRules = [
    { file: ".windsurfrules", name: "Windsurf" },
    { file: ".cursorrules", name: "Cursor" },
    { file: ".clinerules", name: "Cline" },
  ];
  
  const missingRules: string[] = [];
  for (const rule of ideRules) {
    if (!fs.existsSync(path.join(cwd, rule.file))) {
      missingRules.push(rule.name);
    }
  }
  
  if (missingRules.length > 0) {
    issues.push({
      type: "warning",
      message: `Missing IDE rules: ${missingRules.join(", ")}`,
      fix: "Create with: npx arela init --create-ide-rules",
    });
  }
  
  // Check for .arela/rules directory
  const rulesDir = path.join(arelaDir, "rules");
  if (!fs.existsSync(rulesDir)) {
    issues.push({
      type: "warning",
      message: "Missing .arela/rules directory",
      fix: "Run: npx arela init",
    });
  }
  
  // Check for .arela/workflows directory
  const workflowsDir = path.join(arelaDir, "workflows");
  if (!fs.existsSync(workflowsDir)) {
    issues.push({
      type: "warning",
      message: "Missing .arela/workflows directory",
      fix: "Run: npx arela init",
    });
  }
  
  return issues;
}

/**
 * Auto-fix structure issues
 */
export async function fixStructure(cwd: string, issues: StructureIssue[]): Promise<void> {
  for (const issue of issues) {
    // Move tickets from docs/tickets/ to .arela/tickets/
    if (issue.message.includes("tickets in docs/tickets/") && issue.files) {
      const destDir = path.join(cwd, ".arela/tickets");
      await fs.promises.mkdir(destDir, { recursive: true });
      
      for (const file of issue.files) {
        const src = path.join(cwd, file);
        const dest = path.join(cwd, file.replace("docs/tickets/", ".arela/tickets/"));
        
        // Create destination directory
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        
        // Move file
        await fs.promises.rename(src, dest);
        console.log(pc.green(`✓ Moved ${file} → ${dest.replace(cwd + "/", "")}`));
      }
      
      // Remove empty docs/tickets directory
      try {
        const docsTicketsDir = path.join(cwd, "docs/tickets");
        const remaining = await fs.promises.readdir(docsTicketsDir);
        if (remaining.length === 0) {
          await fs.promises.rmdir(docsTicketsDir);
          console.log(pc.gray("  Removed empty docs/tickets/"));
        }
      } catch {
        // Directory not empty or doesn't exist, ignore
      }
    }
    
    // Create missing directories
    if (issue.message.includes("Missing .arela/tickets")) {
      const ticketsDir = path.join(cwd, ".arela/tickets");
      await fs.promises.mkdir(ticketsDir, { recursive: true });
      console.log(pc.green(`✓ Created .arela/tickets/`));
    }
    
    if (issue.message.includes("Missing .arela/rules")) {
      const rulesDir = path.join(cwd, ".arela/rules");
      await fs.promises.mkdir(rulesDir, { recursive: true });
      console.log(pc.green(`✓ Created .arela/rules/`));
    }
    
    if (issue.message.includes("Missing .arela/workflows")) {
      const workflowsDir = path.join(cwd, ".arela/workflows");
      await fs.promises.mkdir(workflowsDir, { recursive: true });
      console.log(pc.green(`✓ Created .arela/workflows/`));
    }
    
    // Create IDE rules (handled by init command)
    if (issue.message.includes("Missing IDE rules")) {
      console.log(pc.yellow("⚠️  IDE rules need to be created manually:"));
      console.log(pc.cyan("   npx arela init --create-ide-rules"));
    }
  }
}
