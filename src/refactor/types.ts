/**
 * Types for slice extraction and refactoring
 */

import type { Slice } from "../detect/types.js";

export interface ExtractionOptions {
  dryRun?: boolean;
  skipTests?: boolean;
  interactive?: boolean;
  verbose?: boolean;
  minCohesion?: number;
  cwd?: string;
}

export interface ExtractionPlan {
  slices: SliceExtractionPlan[];
  totalFiles: number;
  totalImports: number;
  estimatedTime: number; // seconds
  sharedFiles: string[];
}

export interface SliceExtractionPlan extends Slice {
  sourceFiles: FileMovement[];
  importUpdates: ImportUpdate[];
  newImportCount: number;
}

export interface FileMovement {
  source: string;
  destination: string;
  type: string;
}

export interface ImportUpdate {
  filePath: string;
  oldImport: string;
  newImport: string;
  lineNumber: number;
}

export interface ExtractionProgress {
  currentSlice: number;
  totalSlices: number;
  currentStep: string;
  status: "planning" | "moving" | "updating" | "testing" | "committing" | "complete" | "rolled-back";
  errors: string[];
}

export interface TestResult {
  passed: boolean;
  framework: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failedTestNames: string[];
  output: string;
}

export interface RollbackInfo {
  originalState: Map<string, string>;
  stagedChanges: string[];
  createdDirs: string[];
}

export interface ImportAnalysis {
  filePath: string;
  imports: ImportStatement[];
}

export interface ImportStatement {
  type: "esm" | "cjs" | "ts" | "python" | "go";
  specifier: string;
  isRelative: boolean;
  absolutePath?: string;
  lineNumber: number;
  originalLine: string;
}

export interface SliceExtractionResult {
  success: boolean;
  extractedSlices: number;
  movedFiles: number;
  updatedImports: number;
  createdCommits: number;
  testsStatus: TestResult | null;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
}
