/**
 * Multi-repo coordination - handles analysis across multiple repositories
 * Particularly focuses on API contract matching between frontend and backend
 */

import path from "path";
import { ApiDrift } from "./types.js";

export interface ApiCallPattern {
  method: string;
  url: string;
  file: string;
  line: number;
}

export interface ApiEndpointPattern {
  method: string;
  path: string;
  file: string;
  line: number;
}

/**
 * Detect API calls in frontend code (fetch, axios, etc.)
 */
export function detectApiCalls(
  imports: Array<{ from: string; to: string | null }>,
  files: Array<{ path: string; content?: string }>
): ApiCallPattern[] {
  const apiCalls: ApiCallPattern[] = [];

  // Patterns for API calls
  const apiPatterns = [
    /fetch\s*\(\s*['"`]([^'"`]+)['")`]/g,
    /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['")`]/g,
    /\.get\s*\(\s*['"`]([^'"`]+)['")`]/g,
    /\.post\s*\(\s*['"`]([^'"`]+)['")`]/g,
    /\.request\s*\(\s*['"`]([^'"`]+)['")`]/g,
  ];

  // This is a simplified detection - in production would use AST parsing
  // For now, we'll return empty as actual implementation requires content scanning
  return apiCalls;
}

/**
 * Detect API endpoints in backend code (Express, Fastify, etc.)
 */
export function detectApiEndpoints(
  files: Array<{ path: string; content?: string }>
): ApiEndpointPattern[] {
  const endpoints: ApiEndpointPattern[] = [];

  // Patterns for common backend frameworks
  const endpointPatterns = [
    /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['")`]/g,
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['")`]/g,
  ];

  // This is a simplified detection - would use AST parsing in production
  return endpoints;
}

/**
 * Match API calls to endpoints and detect drift
 */
export function matchApiCalls(
  frontendCalls: ApiCallPattern[],
  backendEndpoints: ApiEndpointPattern[]
): ApiDrift[] {
  const driftResults: ApiDrift[] = [];
  const matchedEndpoints = new Set<string>();

  for (const call of frontendCalls) {
    const callSignature = `${call.method.toUpperCase()} ${call.url}`;

    // Look for exact match
    const exactMatch = backendEndpoints.find(
      ep => `${ep.method.toUpperCase()} ${ep.path}` === callSignature
    );

    if (exactMatch) {
      matchedEndpoints.add(`${exactMatch.method} ${exactMatch.path}`);
      driftResults.push({
        frontendCall: callSignature,
        backendEndpoint: `${exactMatch.method} ${exactMatch.path}`,
        match: "exact",
        file: call.file,
        line: call.line,
      });
      continue;
    }

    // Look for partial match (same path, different method or similar)
    const partialMatch = backendEndpoints.find(
      ep =>
        ep.path === call.url ||
        ep.path === `/${call.url}` ||
        ep.path === call.url.replace(/^\//, "") ||
        normalizeUrl(ep.path) === normalizeUrl(call.url)
    );

    if (partialMatch) {
      matchedEndpoints.add(`${partialMatch.method} ${partialMatch.path}`);
      driftResults.push({
        frontendCall: callSignature,
        backendEndpoint: `${partialMatch.method} ${partialMatch.path}`,
        match: "partial",
        file: call.file,
        line: call.line,
      });
      continue;
    }

    // No match found
    driftResults.push({
      frontendCall: callSignature,
      backendEndpoint: undefined,
      match: "missing",
      file: call.file,
      line: call.line,
    });
  }

  return driftResults;
}

/**
 * Normalize API URLs for comparison
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+$/, "") // Remove trailing slashes
    .replace(/\/:(\w+)/g, "/:id") // Normalize IDs
    .replace(/\?.*$/, ""); // Remove query params
}

/**
 * Calculate API drift percentage
 */
export function calculateApiDriftPercentage(driftResults: ApiDrift[]): number {
  if (driftResults.length === 0) {
    return 0;
  }

  const missingCount = driftResults.filter(d => d.match === "missing").length;
  return Math.round((missingCount / driftResults.length) * 100);
}

/**
 * Get unimplemented endpoints (backend endpoints not called by frontend)
 */
export function getUnimplementedEndpoints(
  frontendCalls: ApiCallPattern[],
  backendEndpoints: ApiEndpointPattern[]
): ApiEndpointPattern[] {
  const calledEndpoints = new Set<string>();

  for (const call of frontendCalls) {
    for (const endpoint of backendEndpoints) {
      if (
        normalizeUrl(`${endpoint.method} ${endpoint.path}`) ===
        normalizeUrl(call.url)
      ) {
        calledEndpoints.add(`${endpoint.method} ${endpoint.path}`);
      }
    }
  }

  return backendEndpoints.filter(
    ep => !calledEndpoints.has(`${ep.method} ${ep.path}`)
  );
}

/**
 * Analyze repository relationships for multi-repo analysis
 */
export interface RepositoryRelationship {
  frontendRepo: string;
  backendRepo: string;
  apiCallCount: number;
  matchedEndpoints: number;
  driftPercentage: number;
  criticalMismatches: number;
}

export function analyzeRepoRelationships(
  repoAnalyses: Array<{ path: string; name: string }>
): RepositoryRelationship[] {
  const relationships: RepositoryRelationship[] = [];

  // Find frontend and backend repos
  const frontendRepos = repoAnalyses.filter(
    r =>
      r.name.includes("mobile") ||
      r.name.includes("web") ||
      r.name.includes("client") ||
      r.name.includes("frontend")
  );

  const backendRepos = repoAnalyses.filter(
    r =>
      r.name.includes("backend") ||
      r.name.includes("server") ||
      r.name.includes("api") ||
      r.name.includes("service")
  );

  // Create relationships
  for (const frontend of frontendRepos) {
    for (const backend of backendRepos) {
      relationships.push({
        frontendRepo: frontend.name,
        backendRepo: backend.name,
        apiCallCount: 0, // Will be populated during analysis
        matchedEndpoints: 0,
        driftPercentage: 0,
        criticalMismatches: 0,
      });
    }
  }

  return relationships;
}
