/**
 * Main slice detection orchestrator
 */

import path from "node:path";
import fs from "fs-extra";
import { louvainClustering } from "./louvain.js";
import { loadGraph, loadMultiRepoGraph } from "./graph-loader.js";
import { calculateCohesion, calculateAverageCohesion } from "./modularity.js";
import { suggestSliceName, getFeatureEmoji } from "./slice-namer.js";
import { generateRecommendations } from "./reporter.js";
import type { Slice, SliceReport, DetectOptions, Community } from "./types.js";

/**
 * Detect slices in one or more repositories
 */
export async function detectSlices(
  repoPaths: string[],
  cwd: string = process.cwd(),
  options?: DetectOptions
): Promise<SliceReport> {
  // Resolve graph DB path - check repo paths first, then cwd
  let dbPath: string | null = null;
  
  // Try provided repo paths first
  for (const repoPath of repoPaths) {
    const candidatePath = path.join(repoPath, ".arela", "memory", "graph.db");
    if (await fs.pathExists(candidatePath)) {
      dbPath = candidatePath;
      break;
    }
  }
  
  // Fallback to cwd
  if (!dbPath) {
    const cwdPath = path.join(cwd, ".arela", "memory", "graph.db");
    if (await fs.pathExists(cwdPath)) {
      dbPath = cwdPath;
    }
  }

  if (!dbPath) {
    const searchedPaths = repoPaths.length > 0 
      ? repoPaths.map(p => path.join(p, ".arela", "memory", "graph.db")).join(', ')
      : path.join(cwd, ".arela", "memory", "graph.db");
    throw new Error(
      `Graph DB not found. Searched: ${searchedPaths}. Run 'arela ingest codebase' first.`
    );
  }

  // Load graph
  const graph = repoPaths.length > 0
    ? loadMultiRepoGraph(dbPath, repoPaths)
    : loadGraph(dbPath);

  if (graph.nodes.length === 0) {
    throw new Error("No files found in graph. Run 'arela ingest codebase' first.");
  }

  // Run Louvain clustering
  const communities = louvainClustering(graph);

  // Convert communities to slices
  const slices = communitiesToSlices(communities, graph);

  // Sort by cohesion (best first)
  slices.sort((a, b) => b.cohesion - a.cohesion);

  // Apply minimum cohesion filter if specified
  let filteredSlices = slices;
  if (options?.minCohesion !== undefined) {
    filteredSlices = slices.filter((s) => s.cohesion >= options.minCohesion!);
  }

  // Apply max slices limit if specified
  if (options?.maxSlices !== undefined && filteredSlices.length > options.maxSlices) {
    filteredSlices = filteredSlices.slice(0, options.maxSlices);
  }

  // Generate recommendations
  const recommendations = generateRecommendations(filteredSlices);

  const report: SliceReport = {
    totalFiles: graph.nodes.length,
    totalImports: graph.edges.length,
    sliceCount: filteredSlices.length,
    slices: filteredSlices,
    recommendations,
  };

  // Save to file if requested
  if (options?.json) {
    const outputPath = path.isAbsolute(options.json)
      ? options.json
      : path.join(cwd, options.json);

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, report, { spaces: 2 });
  }

  return report;
}

/**
 * Convert communities to slices
 */
function communitiesToSlices(communities: Community[], graph: import("./types.js").Graph): Slice[] {
  const slices: Slice[] = [];

  for (const community of communities) {
    if (community.nodes.length === 0) continue;

    // Get file paths for this community
    const files = community.nodes
      .map((nodeId) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        return node?.path || "";
      })
      .filter((p) => p !== "")
      .sort();

    // Calculate cohesion
    const cohesion = calculateCohesion(community, graph);

    // Count internal and external imports
    const nodeSet = new Set(community.nodes);
    let internalImports = 0;
    let externalImports = 0;

    for (const edge of graph.edges) {
      const fromIn = nodeSet.has(edge.from);
      const toIn = nodeSet.has(edge.to);

      if (fromIn && toIn) {
        internalImports += edge.weight;
      } else if ((fromIn && !toIn) || (!fromIn && toIn)) {
        externalImports += edge.weight;
      }
    }

    // Suggest name
    const baseName = suggestSliceName(files);
    const emoji = getFeatureEmoji(baseName);
    const name = `${emoji} ${baseName}`;

    slices.push({
      name,
      files,
      fileCount: files.length,
      cohesion,
      internalImports,
      externalImports,
    });
  }

  return slices;
}

export type { Slice, SliceReport, DetectOptions };
