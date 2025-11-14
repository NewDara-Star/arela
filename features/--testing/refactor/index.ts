/**
 * Slice extraction and refactoring module
 */

export { SliceExtractor } from "./slice-extractor.js";
export { FileMover } from "./file-mover.js";
export { ImportUpdater } from "./import-updater.js";
export { TestRunner } from "./test-runner.js";
export { GitManager } from "./git-manager.js";

export type {
  ExtractionOptions,
  ExtractionPlan,
  SliceExtractionPlan,
  FileMovement,
  ImportUpdate,
  ExtractionProgress,
  TestResult,
  RollbackInfo,
  ImportAnalysis,
  ImportStatement,
  SliceExtractionResult,
} from "./types.js";
