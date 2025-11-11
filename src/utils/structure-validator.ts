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
  
  // Check for Windsurf rules (v3.0 uses .windsurf/rules/)
  const windsurfRulesDir = path.join(cwd, ".windsurf", "rules");
  if (!fs.existsSync(windsurfRulesDir)) {
    issues.push({
      type: "error",
      message: "Missing .windsurf/rules directory",
      fix: "Run: arela init",
    });
  } else {
    // Check if arela-cto.md exists
    const personaFile = path.join(windsurfRulesDir, "arela-cto.md");
    if (!fs.existsSync(personaFile)) {
      issues.push({
        type: "warning",
        message: "Missing Arela CTO persona file",
        fix: "Run: arela init --force",
      });
    }
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
    
    if (issue.message.includes("Missing .windsurf/rules")) {
      console.log(pc.yellow("⚠️  Windsurf rules missing. Run:"));
      console.log(pc.cyan("   arela init"));
    }
    
    if (issue.message.includes("Missing Arela CTO persona")) {
      console.log(pc.yellow("⚠️  Arela CTO persona missing. Run:"));
      console.log(pc.cyan("   arela init --force"));
    }
  }
}
