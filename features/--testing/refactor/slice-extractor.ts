/**
 * Main orchestrator for slice extraction
 */

import path from "node:path";
import pc from "picocolors";
import { detectSlices } from "../detect/index.js";
import { FileMover } from "./file-mover.js";
import { ImportUpdater } from "./import-updater.js";
import { TestRunner } from "./test-runner.js";
import { GitManager } from "./git-manager.js";
import type {
  ExtractionOptions,
  ExtractionPlan,
  SliceExtractionPlan,
  ExtractionProgress,
  SliceExtractionResult,
} from "./types.js";
import type { Slice, SliceReport } from "../detect/types.js";

export class SliceExtractor {
  private progress: ExtractionProgress = {
    currentSlice: 0,
    totalSlices: 0,
    currentStep: "planning",
    status: "planning",
    errors: [],
  };

  private fileMover: FileMover;
  private importUpdater: ImportUpdater;
  private testRunner: TestRunner;
  private gitManager: GitManager;

  constructor() {
    this.fileMover = new FileMover();
    this.importUpdater = new ImportUpdater();
    this.testRunner = new TestRunner();
    this.gitManager = new GitManager();
  }

  /**
   * Main entry point - extract all slices
   */
  async extractAllSlices(
    options: ExtractionOptions = {}
  ): Promise<SliceExtractionResult> {
    const startTime = new Date();
    const cwd = options.cwd || process.cwd();

    try {
      // Check for uncommitted changes
      if (await this.gitManager.hasUncommittedChanges(cwd)) {
        throw new Error(
          "Uncommitted changes detected. Please commit or stash changes before extraction."
        );
      }

      // 1. Detect slices
      this.log("🔍 Detecting slices...");
      const sliceReport = await this.detectSlices(cwd);

      if (sliceReport.slices.length === 0) {
        throw new Error("No slices detected. Unable to proceed with extraction.");
      }

      // 2. Validate slices
      const validSlices = this.filterSlicesByQuality(
        sliceReport.slices,
        options.minCohesion || 70
      );

      if (validSlices.length === 0) {
        throw new Error(
          `No slices met quality threshold (${options.minCohesion || 70}% cohesion)`
        );
      }

      this.log(`✅ Found ${validSlices.length} slices with high quality\n`);

      // 3. Plan extraction
      this.log("📋 Creating extraction plan...");
      const plan = await this.createExtractionPlan(validSlices, cwd);
      this.logPlan(plan);

      // 4. Dry run (if requested)
      if (options.dryRun) {
        this.log("\n✨ Dry run complete - no changes made\n");
        return {
          success: true,
          extractedSlices: plan.slices.length,
          movedFiles: plan.totalFiles,
          updatedImports: plan.totalImports,
          createdCommits: 0,
          testsStatus: null,
          errors: [],
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        };
      }

      // 5. Interactive mode (if requested)
      if (options.interactive) {
        const confirmed = await this.confirmExtraction(plan);
        if (!confirmed) {
          this.log("❌ Extraction cancelled by user\n");
          return {
            success: false,
            extractedSlices: 0,
            movedFiles: 0,
            updatedImports: 0,
            createdCommits: 0,
            testsStatus: null,
            errors: ["Extraction cancelled by user"],
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
          };
        }
      }

      // 6. Execute extraction
      this.log("\n🚀 Starting extraction...\n");
      this.progress.status = "moving";
      const extractionResult = await this.executeExtraction(plan, cwd, options);

      if (!extractionResult.success) {
        // Rollback on failure
        this.log("\n⚠️ Extraction failed, rolling back...");
        await this.fileMover.rollback();
        await this.importUpdater.rollback();
        await this.gitManager.resetToHead(cwd);

        return {
          success: false,
          extractedSlices: 0,
          movedFiles: 0,
          updatedImports: 0,
          createdCommits: 0,
          testsStatus: null,
          errors: extractionResult.errors,
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        };
      }

      // 7. Verify with tests (if not skipped)
      let testResult = null;
      if (!options.skipTests) {
        this.log("\n🧪 Running tests...");
        this.progress.status = "testing";
        testResult = await this.testRunner.runTests(cwd);

        if (!testResult.passed) {
          this.log(`\n❌ Tests failed! Rolling back...\n`);
          await this.fileMover.rollback();
          await this.importUpdater.rollback();
          await this.gitManager.resetToHead(cwd);

          return {
            success: false,
            extractedSlices: 0,
            movedFiles: 0,
            updatedImports: 0,
            createdCommits: 0,
            testsStatus: testResult,
            errors: [
              `${testResult.failedTests} tests failed`,
              ...testResult.failedTestNames,
            ],
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
          };
        }

        this.log(`✅ All tests passed (${testResult.passedTests}/${testResult.totalTests})\n`);
      }

      // 8. Commit changes
      this.log("📝 Creating commits...");
      this.progress.status = "committing";
      const commitCount = await this.commitSlices(plan.slices, cwd);
      this.log(`✅ Created ${commitCount} commits\n`);

      // 9. Summary
      this.logSuccess(plan, testResult);

      return {
        success: true,
        extractedSlices: plan.slices.length,
        movedFiles: plan.totalFiles,
        updatedImports: plan.totalImports,
        createdCommits: commitCount,
        testsStatus: testResult,
        errors: [],
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.progress.errors.push(errorMessage);
      this.progress.status = "rolled-back";

      return {
        success: false,
        extractedSlices: 0,
        movedFiles: 0,
        updatedImports: 0,
        createdCommits: 0,
        testsStatus: null,
        errors: [errorMessage],
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
      };
    }
  }

  /**
   * Detect slices using existing detection logic
   */
  private async detectSlices(cwd: string): Promise<SliceReport> {
    try {
      return await detectSlices(["."], cwd);
    } catch (error) {
      throw new Error(
        `Failed to detect slices: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Filter slices by quality metrics
   */
  private filterSlicesByQuality(slices: Slice[], minCohesion: number): Slice[] {
    return slices.filter(slice => slice.cohesion >= minCohesion);
  }

  /**
   * Create extraction plan with file movements and import updates
   */
  private async createExtractionPlan(
    slices: Slice[],
    cwd: string
  ): Promise<ExtractionPlan> {
    const plans: SliceExtractionPlan[] = [];
    let totalFiles = 0;
    let totalImports = 0;
    const sharedFiles: string[] = [];

    // Create individual plans for each slice
    for (const slice of slices) {
      const fileMover = new FileMover();
      const importUpdater = new ImportUpdater();

      const sourceFiles = await fileMover.planFileMovement(slice, cwd);
      importUpdater.buildFileMapping([{ ...slice, sourceFiles, importUpdates: [], newImportCount: 0 }], cwd);
      const importUpdates = await importUpdater.planImportUpdates(
        [{ ...slice, sourceFiles, importUpdates: [], newImportCount: 0 }],
        cwd
      );

      totalFiles += slice.fileCount;
      totalImports += importUpdates.length;

      plans.push({
        ...slice,
        sourceFiles,
        importUpdates,
        newImportCount: importUpdates.length,
      });
    }

    // Identify shared files (would be used by multiple slices)
    // For now, we'll keep them as-is - future improvement

    return {
      slices: plans,
      totalFiles,
      totalImports,
      estimatedTime: Math.ceil((totalFiles * 0.1) + (totalImports * 0.005)), // Very rough estimate
      sharedFiles,
    };
  }

  /**
   * Execute the extraction
   */
  private async executeExtraction(
    plan: ExtractionPlan,
    cwd: string,
    options: ExtractionOptions
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 1. Move all files
      this.log("📁 Moving files...");
      const allMovements = plan.slices.flatMap(s => s.sourceFiles);
      await this.fileMover.moveFiles(allMovements, options.dryRun || false);
      this.log("✅ Files moved successfully");

      // 2. Update all imports
      this.log("🔗 Updating imports...");
      this.importUpdater.buildFileMapping(plan.slices, cwd);
      const allImportUpdates = plan.slices.flatMap(s => s.importUpdates);
      await this.importUpdater.updateImports(
        allImportUpdates,
        options.dryRun || false,
        cwd
      );
      this.log(`✅ Updated ${allImportUpdates.length} imports`);

      // 3. Clean up empty directories
      await this.fileMover.cleanupEmptyDirs(cwd);

      return { success: true, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      return { success: false, errors };
    }
  }

  /**
   * Commit extracted slices
   */
  private async commitSlices(slices: SliceExtractionPlan[], cwd: string): Promise<number> {
    try {
      // Stage all changes at once (new files + deletions)
      await this.gitManager.stageFiles([], cwd); // Empty array triggers git add -A
      
      // Create a single commit for all slices
      const sliceNames = slices.map(s => s.name).join(', ');
      const totalFiles = slices.reduce((sum, s) => sum + s.fileCount, 0);
      
      const commitMessage = [
        `feat: extract ${slices.length} vertical slices`,
        '',
        `Slices: ${sliceNames}`,
        `Files moved: ${totalFiles}`,
        '',
        'Generated by Arela v4.0.0'
      ].join('\n');
      
      await this.gitManager.commitWithMessage(commitMessage, cwd);
      
      this.log(`  ✅ Committed: ${slices.length} slices in single commit`);
      return 1; // One commit for all slices
      
    } catch (error) {
      this.log(
        `  ⚠️ Failed to commit slices: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return 0;
    }
  }

  /**
   * Confirm extraction with user
   */
  private async confirmExtraction(plan: ExtractionPlan): Promise<boolean> {
    // For now, always confirm in CLI
    // In real implementation, would prompt user
    return true;
  }

  /**
   * Logging utilities
   */
  private log(message: string): void {
    console.log(message);
  }

  private logPlan(plan: ExtractionPlan): void {
    this.log("");
    for (const slice of plan.slices) {
      const emoji = this.getSliceEmoji(slice.name);
      this.log(
        `  ${emoji} ${slice.name} (${slice.fileCount} files, ${slice.newImportCount} imports)`
      );
    }
    this.log("");
    this.log(`  Total: ${plan.totalFiles} files, ${plan.totalImports} imports`);
    this.log(`  Estimated time: ~${plan.estimatedTime}s\n`);
  }

  private logSuccess(plan: ExtractionPlan, testResult: any): void {
    this.log(pc.bold(pc.green("\n🎉 Extraction complete!")));
    this.log(
      `  - ${plan.slices.length} slices extracted`
    );
    this.log(`  - ${plan.totalFiles} files moved`);
    this.log(`  - ${plan.totalImports} imports updated`);
    if (testResult) {
      this.log(`  - ${testResult.passedTests} tests passed`);
    }
    this.log(pc.yellow("\nYour architecture is now vertical! 🎯\n"));
  }

  private getSliceEmoji(name: string): string {
    const emojiMap: Record<string, string> = {
      auth: "🔐",
      authentication: "🔐",
      user: "👤",
      profile: "👤",
      workout: "💪",
      exercise: "💪",
      nutrition: "🍎",
      social: "👥",
      messaging: "💬",
      notification: "🔔",
      payment: "💳",
      ui: "🎨",
      component: "🎨",
      util: "🔧",
      helper: "🔧",
      common: "📦",
      shared: "📦",
    };

    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (lower.includes(key)) {
        return emoji;
      }
    }

    return "📦";
  }
}
