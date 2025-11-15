/**
 * Codebase Ingestion System - Main Orchestrator
 * Parses TypeScript/JavaScript files, builds dependency graph, stores in SQLite
 */

import path from "path";
import fs from "fs";
import pc from "picocolors";
import { IngestOptions, CodebaseMap } from "./types.js";
import { GraphDB } from "./storage.js";
import { scanDirectory, getLineCount } from "./file-scanner.js";
import { analyzeFile, closeProject } from "./static-analyzer.js";
import { analyzeFileUniversal } from "./universal-analyzer.js";
import { buildGraph, getGraphStats } from "./graph-builder.js";

/**
 * Main ingestion function
 * Scans, analyzes, and ingests a codebase into the graph database
 */
export async function ingestCodebase(
  repoPath: string,
  options?: IngestOptions
): Promise<CodebaseMap> {
  const startTime = Date.now();
  const absolutePath = path.resolve(repoPath);
  const dbPath = path.join(absolutePath, '.arela', 'memory', 'graph.db');

  // Ensure .arela/memory directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Initialize graph database
  let db: GraphDB | null = null;

  try {
    db = new GraphDB(dbPath);

    // Clear if refresh option is set
    if (options?.refresh) {
      if (process.stdout.isTTY && !process.env.CI) {
        console.log(pc.yellow("🔄 Refreshing graph database..."));
      }
      db.clear();
    }

    // Phase 1: Scan directory for files
    if (process.stdout.isTTY && !process.env.CI) {
      console.log(pc.cyan("\n📥 Ingesting codebase...\n"));
    }

    const files = await scanDirectory(absolutePath, {
      ignore: options?.refresh ? [] : undefined,
      verbose: options?.verbose,
    });

    if (process.stdout.isTTY && !process.env.CI) {
      console.log(pc.green(`✅ Scanned ${files.length} files`));
    }

    // Phase 2: Analyze each file
    const analyses = [];

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const absoluteFilePath = path.join(absolutePath, filePath);

      if (options?.verbose && process.stdout.isTTY && !process.env.CI) {
        console.log(pc.gray(`  Analyzing ${filePath}...`));
      }

      // Use universal analyzer for all languages
      const analysis = await analyzeFileUniversal(absoluteFilePath, undefined);
      // Store relative path for portability
      analysis.filePath = filePath;
      analyses.push(analysis);

      // Progress indicator
      if ((i + 1) % 50 === 0 && process.stdout.isTTY && !process.env.CI) {
        console.log(pc.gray(`  Progress: ${i + 1}/${files.length}`));
      }
    }

    if (process.stdout.isTTY && !process.env.CI) {
      // Count extracted elements
      const importCount = analyses.reduce((sum, a) => sum + a.imports.length, 0);
      const functionCount = analyses.reduce((sum, a) => sum + a.functions.length, 0);
      const apiCallCount = analyses.reduce((sum, a) => sum + a.apiCalls.length, 0);

      console.log(pc.green(`✅ Found ${importCount} imports`));
      console.log(pc.green(`✅ Identified ${functionCount} functions`));
      console.log(pc.green(`✅ Mapped ${apiCallCount} API calls`));
    }

    // Phase 3: Build graph
    await buildGraph(analyses, absolutePath, db, (message) => {
      if (options?.verbose && process.stdout.isTTY && !process.env.CI) {
        console.log(pc.gray(`  ${message}`));
      }
    });

    closeProject();

    // Phase 4: Update metadata with last ingest time
    db.setMetadata('last_ingest_time', new Date().toISOString());

    // Phase 5: Get statistics
    const summary = db.getSummary();
    const graphStats = getGraphStats(db);

    if (process.stdout.isTTY && !process.env.CI) {
      console.log(pc.cyan("\n📊 Codebase Map:"));
      console.log(pc.gray(`   - Modules: ${graphStats.modules}`));
      console.log(pc.gray(`   - Components: ${graphStats.components}`));
      console.log(pc.gray(`   - Services: ${graphStats.services}`));
      console.log(pc.gray(`   - API endpoints: ${graphStats.apiEndpoints}`));
    }

    const duration = Date.now() - startTime;

    if (process.stdout.isTTY && !process.env.CI) {
      console.log(pc.cyan(`\n💾 Stored in Graph DB: ${path.relative(process.cwd(), dbPath)}`));
      console.log(pc.gray(`\n⏱️  Completed in ${(duration / 1000).toFixed(2)}s`));
      console.log(pc.cyan("\n📋 Next step: arela detect slices\n"));
    }

    return {
      summary: {
        filesScanned: files.length,
        importsFound: summary.importsCount,
        functionsDefined: summary.functionsCount,
        apiCallsFound: summary.apiCallsCount,
      },
      stats: graphStats,
      dbPath: path.relative(process.cwd(), dbPath),
      duration,
    };
  } catch (error) {
    closeProject();
    if (db) {
      db.close();
    }
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * Query the graph database
 */
export async function queryGraph(
  repoPath: string,
  sql: string,
  params?: any[]
): Promise<any[]> {
  const absolutePath = path.resolve(repoPath);
  const dbPath = path.join(absolutePath, '.arela', 'memory', 'graph.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Graph database not found at ${dbPath}. Run 'arela ingest codebase' first.`);
  }

  const db = new GraphDB(dbPath);
  try {
    return db.query(sql, params ?? []);
  } finally {
    db.close();
  }
}

/**
 * Get graph statistics
 */
export async function getGraphStatistics(repoPath: string): Promise<{
  files: number;
  functions: number;
  imports: number;
  functionCalls: number;
  apiEndpoints: number;
  apiCalls: number;
}> {
  const absolutePath = path.resolve(repoPath);
  const dbPath = path.join(absolutePath, '.arela', 'memory', 'graph.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Graph database not found at ${dbPath}. Run 'arela ingest codebase' first.`);
  }

  const db = new GraphDB(dbPath);
  try {
    const summary = db.getSummary();
    return {
      files: summary.filesCount,
      functions: summary.functionsCount,
      imports: summary.importsCount,
      functionCalls: summary.functionCallsCount,
      apiEndpoints: summary.apiEndpointsCount,
      apiCalls: summary.apiCallsCount,
    };
  } finally {
    db.close();
  }
}

/**
 * Export types
 */
export * from "./types.js";
