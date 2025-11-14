/**
 * API Contract Generator - Main Orchestrator
 */
import path from 'path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { extractEndpoints, detectSlices } from './endpoint-extractor.js';
import { extractCalls } from './call-extractor.js';
import { matchCallsToEndpoints, findUnmatchedCalls, findUnmatchedEndpoints } from './matcher.js';
import { detectDrift } from './drift-detector.js';
import {
  generateOpenAPISpec,
  specToYaml,
  specToJson,
} from './openapi-generator.js';
import {
  groupEndpointsBySlice,
  groupCallsBySlice,
  groupMatchesBySlice,
  groupDriftBySlice,
  createSliceGroups,
} from './slice-grouper.js';
import { displayContractReport } from './reporter.js';
import {
  ContractOptions,
  ContractReport,
  ApiEndpoint,
  ApiCall,
  OpenAPISpec,
  SliceGroup,
} from './types';

/**
 * Main function to generate API contracts
 */
export async function generateContracts(
  options: ContractOptions
): Promise<ContractReport> {
  const startTime = Date.now();

  console.log(pc.bold(pc.cyan('\n🔍 Analyzing API contracts...\n')));

  // Find Graph DB
  const graphDbPath = findGraphDb(options.repoPaths);
  if (!graphDbPath) {
    throw new Error('Graph database not found. Run "arela ingest" first.');
  }

  console.log(pc.gray(`Using database: ${graphDbPath}\n`));

  try {
    // 1. Extract endpoints and calls
    console.log(pc.cyan('📊 Extracting API endpoints and calls...'));
    const endpoints = extractEndpoints(graphDbPath);
    const calls = extractCalls(graphDbPath);
    console.log(
      pc.green(`✅ Found ${endpoints.length} endpoints, ${calls.length} calls\n`)
    );

    // 2. Match calls to endpoints
    console.log(pc.cyan('🔗 Matching calls to endpoints...'));
    const matches = matchCallsToEndpoints(calls, endpoints, 0.75);
    const unmatchedCalls = findUnmatchedCalls(calls, matches);
    const unmatchedEndpoints = findUnmatchedEndpoints(endpoints, matches);
    console.log(
      pc.green(`✅ Matched ${matches.length} endpoint-call pairs\n`)
    );

    // 3. Detect drift
    console.log(pc.cyan('🔍 Detecting schema drift...'));
    const driftIssues = detectDrift(matches, unmatchedCalls, unmatchedEndpoints);
    console.log(pc.green(`✅ Found ${driftIssues.length} drift issues\n`));

    // 4. Group by slice if requested
    let specs: OpenAPISpec[] = [];
    let sliceGroups: SliceGroup[] = [];

    if (options.perSlice !== false) {
      console.log(pc.cyan('📦 Grouping contracts by slice...'));
      const sliceNames = detectSlices(graphDbPath);
      console.log(pc.green(`✅ Detected ${sliceNames.length} slices\n`));

      // Group endpoints and calls by slice
      const endpointsBySlice = groupEndpointsBySlice(endpoints);
      const callsBySlice = groupCallsBySlice(calls);
      const matchesBySlice = groupMatchesBySlice(matches);
      const driftBySlice = groupDriftBySlice(driftIssues);

      // Create slice groups
      sliceGroups = createSliceGroups(
        endpointsBySlice,
        callsBySlice,
        matchesBySlice,
        driftBySlice
      );

      // Generate specs per slice
      console.log(pc.cyan('🎨 Generating OpenAPI specs per slice...'));
      for (const slice of sliceGroups) {
        const spec = generateOpenAPISpec(slice.name, slice.endpoints);
        slice.spec = spec;
        specs.push(spec);
      }
      console.log(pc.green(`✅ Generated ${specs.length} OpenAPI specs\n`));
    } else {
      // Generate single spec for all endpoints
      console.log(pc.cyan('🎨 Generating OpenAPI spec...'));
      const spec = generateOpenAPISpec('api', endpoints);
      specs.push(spec);
      console.log(pc.green('✅ Generated OpenAPI spec\n'));
    }

    // 5. Save specs
    console.log(pc.cyan('💾 Saving OpenAPI specs...'));
    await saveSpecs(specs, options);
    console.log(pc.green(`✅ Saved to ${options.outputDir || 'openapi/'}\n`));

    // 6. Create report
    const duration = Date.now() - startTime;
    const report: ContractReport = {
      totalEndpoints: endpoints.length,
      totalCalls: calls.length,
      matchedCount: matches.length,
      unmatchedCalls,
      unmatchedEndpoints,
      driftIssues,
      slices: sliceGroups,
      specs,
      generatedAt: new Date().toISOString(),
      duration,
    };

    // 7. Display results
    if (!options.driftOnly) {
      displayContractReport(report);
    } else {
      // Only show drift
      if (driftIssues.length > 0) {
        console.log(pc.bold(pc.red(`❌ Schema Drift Detected (${driftIssues.length}):\n`)));
        for (const issue of driftIssues.slice(0, 5)) {
          console.log(`  ${issue.message}`);
        }
        if (driftIssues.length > 5) {
          console.log(pc.gray(`  ... and ${driftIssues.length - 5} more\n`));
        }
      } else {
        console.log(pc.green('✅ No drift issues detected!\n'));
      }
    }

    return report;
  } catch (error) {
    console.error(pc.red(`\n❌ Contract generation failed: ${(error as Error).message}`));
    throw error;
  }
}

/**
 * Find Graph DB path
 */
function findGraphDb(repoPaths: string[]): string | null {
  // Try .arela/memory/graph.db in provided repo paths first
  const searchPaths: string[] = [];
  
  // Check each provided repo path
  for (const repoPath of repoPaths) {
    searchPaths.push(path.join(repoPath, '.arela/memory/graph.db'));
  }
  
  // Fallback to current directory
  searchPaths.push(path.join(process.cwd(), '.arela/memory/graph.db'));

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Save OpenAPI specs to files
 */
async function saveSpecs(specs: OpenAPISpec[], options: ContractOptions): Promise<void> {
  const outputDir = options.outputDir || path.join(process.cwd(), 'openapi');
  await fs.ensureDir(outputDir);

  const format = options.format || 'yaml';

  for (const spec of specs) {
    const filename = `${spec.info.title.toLowerCase().replace(/\s+/g, '-')}.${format === 'json' ? 'json' : 'yaml'}`;
    const filepath = path.join(outputDir, filename);

    const content = format === 'json' ? specToJson(spec) : specToYaml(spec);
    await fs.writeFile(filepath, content);

    console.log(pc.gray(`  📝 ${filename}`));
  }
}

/**
 * Export types for CLI
 */
export type {
  ContractOptions,
  ContractReport,
  ApiEndpoint,
  ApiCall,
  DriftIssue,
  SliceGroup,
  OpenAPISpec,
} from './types';

// Export individual modules for advanced usage
export * from './endpoint-extractor.js';
export * from './call-extractor.js';
export * from './matcher.js';
export * from './drift-detector.js';
export * from './openapi-generator.js';
export * from './slice-grouper.js';
export * from './reporter.js';
