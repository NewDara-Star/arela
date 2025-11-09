import { execSync } from "child_process";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";

export interface ApplyResult {
  success: boolean;
  branch?: string;
  error?: string;
}

export async function applyPatchWithGit(
  cwd: string,
  findingId: string,
  patch: string,
  opts: { dryRun?: boolean; createPR?: boolean } = {}
): Promise<ApplyResult> {
  try {
    if (opts.dryRun) {
      console.log(pc.cyan("Dry run - showing patch:\n"));
      console.log(patch);
      return { success: true };
    }
    
    // Check if git repo
    try {
      execSync("git rev-parse --git-dir", { cwd, stdio: "ignore" });
    } catch {
      throw new Error("Not a git repository");
    }
    
    // Create branch
    const branchName = `arela/fix-${findingId}`;
    console.log(pc.dim(`Creating branch: ${branchName}`));
    
    try {
      execSync(`git checkout -b ${branchName}`, { cwd, stdio: "ignore" });
    } catch {
      // Branch might exist, try to switch
      execSync(`git checkout ${branchName}`, { cwd, stdio: "ignore" });
    }
    
    // Apply patch
    console.log(pc.dim("Applying patch..."));
    
    // Write patch to temp file
    const patchFile = path.join(cwd, ".arela", "temp.patch");
    await fs.ensureDir(path.dirname(patchFile));
    await fs.writeFile(patchFile, patch);
    
    try {
      execSync(`git apply --allow-empty --whitespace=fix ${patchFile}`, {
        cwd,
        stdio: "pipe",
      });
    } catch (error) {
      throw new Error(`Failed to apply patch: ${(error as Error).message}`);
    } finally {
      await fs.remove(patchFile);
    }
    
    // Stage and commit
    console.log(pc.dim("Committing changes..."));
    execSync("git add -A", { cwd, stdio: "ignore" });
    execSync(`git commit -m "fix(arela): ${findingId}"`, { cwd, stdio: "ignore" });
    
    console.log(pc.green(`✓ Patch applied on branch: ${branchName}`));
    
    // Create PR if requested and gh is available
    if (opts.createPR) {
      try {
        console.log(pc.dim("Creating pull request..."));
        execSync("gh pr create --fill", { cwd, stdio: "inherit" });
        console.log(pc.green("✓ Pull request created"));
      } catch {
        console.log(pc.yellow("\nCouldn't create PR automatically. Create manually:"));
        console.log(pc.dim(`  git push -u origin ${branchName}`));
        console.log(pc.dim(`  gh pr create --fill`));
      }
    } else {
      console.log(pc.dim("\nTo push and create PR:"));
      console.log(pc.dim(`  git push -u origin ${branchName}`));
      console.log(pc.dim(`  gh pr create --fill`));
    }
    
    return { success: true, branch: branchName };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export function applyUnifiedDiff(cwd: string, patch: string): void {
  execSync("git apply --allow-empty --whitespace=fix -p0", {
    cwd,
    input: patch,
    stdio: "inherit",
  });
}
