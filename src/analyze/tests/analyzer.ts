/**
 * Test Strategy Optimizer - Core analyzer
 */

import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";
import { extractEndpoints, detectSlices } from "../../contracts/endpoint-extractor.js";
import {
  CoverageSummary,
  MockUsageSummary,
  OrganizationSummary,
  Recommendation,
  SliceCoverage,
  SlowIndicator,
  SlowTest,
  TestAnalysisOptions,
  TestFileAnalysis,
  TestIssue,
  TestStats,
  TestStrategyReport,
} from "./types.js";

/**
 * Main entry point
 */
export async function analyzeTestStrategy(
  options: TestAnalysisOptions
): Promise<TestStrategyReport> {
  const baseDir = resolveBaseDir(options);
  const files = await findTestFiles(baseDir);

  const analyses: TestFileAnalysis[] = [];
  for (const relativePath of files) {
    const absolutePath = path.join(baseDir, relativePath);
    const analysis = await analyzeTestFile(relativePath, absolutePath);
    analyses.push(analysis);
  }

  const stats = summarizeStats(analyses);
  const mockUsage = summarizeMockUsage(analyses, stats.totalTests);

  const slowTests = buildSlowTests(analyses);
  const graphDbPath = findGraphDb(baseDir);
  const endpointData = loadEndpointCoverage(graphDbPath, analyses);

  const organization = analyzeOrganization(analyses);
  const issues = collectIssues({
    stats,
    mockUsage,
    coverage: endpointData.coverage,
    slowTests,
    organization,
    errorTests: sumField(analyses, "errorAssertionCount"),
    contractTests: sumField(analyses, "contractIndicatorCount"),
    testcontainersUsage: analyses.filter(file => file.usesTestcontainers).reduce((sum, file) => sum + file.testCount, 0),
  });

  const recommendations = generateRecommendations({
    stats,
    mockUsage,
    coverage: endpointData.coverage,
    slowTests,
    organization,
    analyses,
    errorTests: sumField(analyses, "errorAssertionCount"),
    contractTests: sumField(analyses, "contractIndicatorCount"),
    testcontainersUsage: analyses.filter(file => file.usesTestcontainers).reduce((sum, file) => sum + file.testCount, 0),
  });

  const report: TestStrategyReport = {
    generatedAt: new Date().toISOString(),
    baseDir,
    filesAnalyzed: analyses.length,
    stats,
    files: analyses,
    mockUsage,
    coverage: endpointData.coverage,
    slowTests,
    organization,
    issues,
    recommendations,
    errorTests: sumField(analyses, "errorAssertionCount"),
    contractTests: sumField(analyses, "contractIndicatorCount"),
    graph: {
      available: endpointData.coverage.graphDbAvailable,
      path: endpointData.coverage.graphDbPath,
    },
  };

  return report;
}

/**
 * Resolve directory to analyze
 */
function resolveBaseDir(options: TestAnalysisOptions): string {
  if (options.dir) {
    if (path.isAbsolute(options.dir)) {
      return options.dir;
    }
    return path.resolve(options.cwd, options.dir);
  }
  return options.cwd;
}

/**
 * Find all test files inside directory
 */
async function findTestFiles(baseDir: string): Promise<string[]> {
  const patterns = [
    "**/*.test.{ts,tsx,js,jsx,mjs,cjs}",
    "**/*.spec.{ts,tsx,js,jsx,mjs,cjs}",
    "**/*_test.py",
    "**/test_*.py",
    "**/tests/**/*.py",
  ];

  return fg(patterns, {
    cwd: baseDir,
    ignore: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".git/**",
      "logs/**",
      "tmp/**",
      ".arela/**",
    ],
    onlyFiles: true,
    dot: false,
    unique: true,
  });
}

/**
 * Analyze a single test file
 */
async function analyzeTestFile(relativePath: string, absolutePath: string): Promise<TestFileAnalysis> {
  const content = await fs.readFile(absolutePath, "utf-8");

  const testMatches = matchAll(content, /\b(?:it|test)\s*\(/g);
  const pythonTests = matchAll(content, /\bdef\s+test_[\w]+/g);
  const testCount = testMatches + pythonTests;

  const mockPatterns: Record<string, number> = {};
  for (const pattern of MOCK_DETECTORS) {
    const count = matchAll(content, pattern.regex);
    if (count > 0) {
      mockPatterns[pattern.name] = count;
    }
  }
  const mockCount = Object.values(mockPatterns).reduce((sum, count) => sum + count, 0);

  const testcontainerMatches = TESTCONTAINER_HINTS.filter(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return regex.test(content);
  });
  const usesTestcontainers = testcontainerMatches.length > 0;
  const testcontainersHints = testcontainerMatches.map(pattern => pattern.source);

  const frameworks = detectFramework(content, relativePath);
  const namingConvention = detectNaming(relativePath);

  const endpointsReferenced = extractEndpointStrings(content);
  const sliceMatches = Array.from(new Set([
    ...extractSlicesFromEndpoints(endpointsReferenced),
    ...extractSlicesFromPath(relativePath),
  ])).filter(Boolean);

  const slowIndicators = detectSlowIndicators(content);
  const integrationIndicators = INTEGRATION_INDICATORS.some(regex => regex.test(content)) || usesTestcontainers;

  const errorAssertionCount = matchAll(content, ERROR_ASSERTION_REGEX);
  const contractIndicatorCount = matchAll(content, CONTRACT_INDICATOR_REGEX);

  return {
    path: relativePath,
    absolutePath,
    framework: frameworks,
    namingConvention,
    testCount,
    classification: integrationIndicators ? "integration" : "unit",
    mockCount,
    mockPatterns,
    usesTestcontainers,
    testcontainersHints,
    endpointsReferenced,
    sliceMatches,
    pathSliceHints: extractSlicesFromPath(relativePath),
    errorAssertionCount,
    contractIndicatorCount,
    slowIndicators,
    hasMocks: mockCount > 0,
    hasIntegrationIndicators: integrationIndicators,
    hasErrorAssertions: errorAssertionCount > 0,
    directories: relativePath.split(/[\\/]/).filter(Boolean),
  };
}

/**
 * Build stats summary
 */
function summarizeStats(files: TestFileAnalysis[]): TestStats {
  const totalTests = sumField(files, "testCount");
  const integrationTests = files
    .filter(file => file.classification === "integration")
    .reduce((sum, file) => sum + file.testCount, 0);
  const unitTests = Math.max(totalTests - integrationTests, 0);

  const frameworks: Record<string, number> = {};
  const naming: Record<string, number> = {};

  for (const file of files) {
    frameworks[file.framework] = (frameworks[file.framework] || 0) + file.testCount;
    naming[file.namingConvention] = (naming[file.namingConvention] || 0) + 1;
  }

  const slowTests = buildSlowTests(files);
  const basePerTest = 0.4; // optimistic default runtime
  const baseDuration = totalTests * basePerTest;
  const slowPenalty = slowTests.reduce((sum, slow) => {
    const penalty = Math.max(slow.estimatedDurationSeconds - basePerTest, 0);
    return sum + penalty;
  }, 0);
  const estimatedSuiteDurationSeconds = baseDuration + slowPenalty;
  const averageTestTimeSeconds =
    totalTests > 0 ? estimatedSuiteDurationSeconds / totalTests : 0;

  return {
    totalTests,
    unitTests,
    integrationTests,
    testFiles: files.length,
    frameworks,
    namingConventions: naming,
    averageTestTimeSeconds,
    estimatedSuiteDurationSeconds,
  };
}

/**
 * Summarize mock usage across files
 */
function summarizeMockUsage(files: TestFileAnalysis[], totalTests: number): MockUsageSummary {
  const filesWithMocks = files.filter(file => file.hasMocks).length;
  const totalMocks = files.reduce((sum, file) => sum + file.mockCount, 0);
  const testsTouchedByMocks = files.reduce(
    (sum, file) => sum + (file.hasMocks ? file.testCount : 0),
    0
  );

  const patternCounts: Record<string, number> = {};
  for (const file of files) {
    for (const [pattern, count] of Object.entries(file.mockPatterns)) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + count;
    }
  }

  const dominantPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalMocks,
    filesWithMocks,
    testsTouchedByMocks,
    percentageOfSuite: totalTests > 0 ? testsTouchedByMocks / totalTests : 0,
    dominantPatterns,
  };
}

/**
 * Build slow tests array
 */
function buildSlowTests(files: TestFileAnalysis[]): SlowTest[] {
  const slow: SlowTest[] = [];
  for (const file of files) {
    for (const indicator of file.slowIndicators) {
      const durationSeconds = indicator.durationMs
        ? indicator.durationMs / 1000
        : 1.0;
      slow.push({
        file: file.path,
        reason: indicator.reason,
        estimatedDurationSeconds: durationSeconds,
        line: indicator.line,
      });
    }
  }
  return slow;
}

/**
 * Load API endpoint coverage using Graph DB
 */
function loadEndpointCoverage(
  graphDbPath: string | null,
  files: TestFileAnalysis[]
): { coverage: CoverageSummary } {
  const testedPaths = new Set<string>();
  for (const file of files) {
    for (const endpoint of file.endpointsReferenced) {
      testedPaths.add(normalizePath(endpoint));
    }
  }

  if (!graphDbPath || !fs.existsSync(graphDbPath)) {
    return {
      coverage: {
        endpoints: {
          total: 0,
          tested: testedPaths.size,
          percentage: 0,
          untested: [],
        },
        slices: [],
        missingSlices: [],
        graphDbAvailable: false,
        notes: ["Graph DB not found. Run `arela ingest codebase` to enable endpoint coverage."],
      },
    };
  }

  const endpoints = extractEndpoints(graphDbPath);
  const normalizedEndpoints = endpoints.map(endpoint => ({
    method: endpoint.method,
    path: normalizePath(endpoint.path),
  }));

  const tested = normalizedEndpoints.filter(endpoint =>
    testedPaths.has(endpoint.path)
  );

  const untested = normalizedEndpoints
    .filter(endpoint => !testedPaths.has(endpoint.path))
    .slice(0, 25)
    .map(endpoint => ({ method: endpoint.method, path: endpoint.path }));

  const slicesStats = buildSliceCoverage(graphDbPath, normalizedEndpoints, files);

  return {
    coverage: {
      endpoints: {
        total: normalizedEndpoints.length,
        tested: tested.length,
        percentage:
          normalizedEndpoints.length > 0
            ? (tested.length / normalizedEndpoints.length) * 100
            : 0,
        untested,
      },
      slices: slicesStats.coverage,
      missingSlices: slicesStats.missing,
      graphDbAvailable: true,
      graphDbPath,
      notes: [],
    },
  };
}

/**
 * Build slice coverage based on Graph DB slices
 */
function buildSliceCoverage(
  graphDbPath: string,
  endpoints: { method: string; path: string }[],
  files: TestFileAnalysis[]
): { coverage: SliceCoverage[]; missing: string[] } {
  let sliceNames: string[] = [];
  try {
    sliceNames = detectSlices(graphDbPath);
  } catch {
    sliceNames = [];
  }

  if (sliceNames.length === 0) {
    sliceNames = Array.from(
      new Set(
        endpoints
          .map(endpoint => extractSliceFromPath(endpoint.path))
          .filter((slice): slice is string => Boolean(slice))
      )
    );
  }

  const endpointsBySlice = new Map<string, { method: string; path: string }[]>();
  for (const endpoint of endpoints) {
    const slice = extractSliceFromPath(endpoint.path);
    if (!slice) continue;
    if (!endpointsBySlice.has(slice)) {
      endpointsBySlice.set(slice, []);
    }
    endpointsBySlice.get(slice)!.push(endpoint);
  }

  const testsBySlice = new Map<string, number>();
  for (const file of files) {
    const slices = file.sliceMatches.length > 0 ? file.sliceMatches : file.pathSliceHints;
    if (slices.length === 0) {
      continue;
    }
    const uniqueSlices = Array.from(new Set(slices));
    const share = file.testCount / uniqueSlices.length;
    for (const slice of uniqueSlices) {
      testsBySlice.set(slice, (testsBySlice.get(slice) || 0) + share);
    }
  }

  const coverage: SliceCoverage[] = [];
  for (const slice of sliceNames) {
    const sliceEndpoints = endpointsBySlice.get(slice) || [];
    const sliceTests = testsBySlice.get(slice) || 0;
    const testedCount = sliceEndpoints.filter(endpoint =>
      files.some(file => file.endpointsReferenced.some(ref => normalizePath(ref) === endpoint.path))
    ).length;

    coverage.push({
      slice,
      endpointsTotal: sliceEndpoints.length,
      endpointsTested: testedCount,
      tests: sliceTests,
    });
  }

  const missing = coverage.filter(slice => slice.tests === 0).map(slice => slice.slice);
  return { coverage, missing };
}

/**
 * Analyze test organization
 */
function analyzeOrganization(files: TestFileAnalysis[]): OrganizationSummary {
  const rootFolders: Record<string, number> = {};

  for (const file of files) {
    const root = file.directories[0] || ".";
    rootFolders[root] = (rootFolders[root] || 0) + 1;
  }

  const totalFiles = files.length || 1;
  const sortedRoots = Object.entries(rootFolders).sort((a, b) => b[1] - a[1]);
  const dominantShare = sortedRoots.length > 0 ? sortedRoots[0][1] / totalFiles : 0;
  const scattered = sortedRoots.length > 4 && dominantShare < 0.6;
  const hasDedicatedTestsFolder = Object.keys(rootFolders).some(
    folder => folder.toLowerCase() === "tests"
  );

  const suggestedStructure = ["tests/authentication", "tests/workout", "tests/nutrition", "tests/social"];

  return {
    rootFolders,
    hasDedicatedTestsFolder,
    scattered,
    suggestedStructure,
  };
}

/**
 * Collect issues based on heuristics
 */
function collectIssues(context: {
  stats: TestStats;
  mockUsage: MockUsageSummary;
  coverage: CoverageSummary;
  slowTests: SlowTest[];
  organization: OrganizationSummary;
  errorTests: number;
  contractTests: number;
  testcontainersUsage: number;
}): TestIssue[] {
  const issues: TestIssue[] = [];

  if (context.stats.totalTests === 0) {
    issues.push({
      severity: "critical",
      title: "No automated tests detected",
      description: "No test files were found matching *.test or *.spec patterns.",
      recommendation: "Add unit tests and integration tests to cover critical paths.",
    });
    return issues;
  }

  if (context.mockUsage.percentageOfSuite >= 0.5) {
    issues.push({
      severity: "critical",
      title: "Mock overuse detected",
      description: `${Math.round(context.mockUsage.percentageOfSuite * 100)}% of tests rely on mocks, increasing false-positive risk.`,
      recommendation: "Introduce Testcontainers-based slice tests to validate real dependencies.",
    });
  } else if (context.mockUsage.percentageOfSuite >= 0.3) {
    issues.push({
      severity: "warning",
      title: "High mock usage",
      description: `${Math.round(context.mockUsage.percentageOfSuite * 100)}% of tests use mocks.`,
      recommendation: "Gradually replace mocks with real containers for critical paths.",
    });
  }

  if (context.coverage.graphDbAvailable && context.coverage.endpoints.total > 0) {
    const coveragePercent = context.coverage.endpoints.percentage;
    if (coveragePercent < 50) {
      issues.push({
        severity: "critical",
        title: "Missing API coverage",
        description: `Only ${context.coverage.endpoints.tested}/${context.coverage.endpoints.total} endpoints touched (${coveragePercent.toFixed(0)}%).`,
        recommendation: "Add slice-level integration tests for untested endpoints.",
      });
    } else if (coveragePercent < 70) {
      issues.push({
        severity: "warning",
        title: "Low API coverage",
        description: `Coverage at ${coveragePercent.toFixed(0)}% leaves critical gaps.`,
        recommendation: "Prioritize untested endpoints highlighted in the report.",
      });
    }

    if (context.coverage.missingSlices.length > 0) {
      issues.push({
        severity: "warning",
        title: "No slice-level tests",
        description: `Slices without dedicated tests: ${context.coverage.missingSlices.join(", ")}`,
        recommendation: "Mirror slice directories under tests/ and add integration suites per slice.",
      });
    }
  } else {
    issues.push({
      severity: "info",
      title: "Graph DB unavailable",
      description: "Endpoint coverage could not be calculated without the graph database.",
      recommendation: "Run `arela ingest codebase` to build the index.",
    });
  }

  if (context.slowTests.length > 0) {
    const slowPercentage = context.stats.totalTests > 0
      ? (context.slowTests.length / context.stats.totalTests) * 100
      : 0;
    issues.push({
      severity: slowPercentage > 10 ? "critical" : "warning",
      title: "Slow tests detected",
      description: `${context.slowTests.length} tests exceed 1s (${slowPercentage.toFixed(1)}% of suite).`,
      recommendation: "Use Testcontainers with parallel execution and remove manual waits.",
    });
  }

  if (context.organization.scattered) {
    issues.push({
      severity: "warning",
      title: "Tests scattered across directories",
      description: "Test files span many top-level folders without a dedicated tests/ slice structure.",
      recommendation: "Create slice folders under tests/ (e.g., tests/authentication) and colocate suites.",
    });
  }

  const errorCoveragePercent = context.stats.totalTests > 0
    ? (context.errorTests / context.stats.totalTests) * 100
    : 0;
  if (errorCoveragePercent < 15) {
    issues.push({
      severity: "warning",
      title: "Missing error coverage",
      description: "Less than 15% of tests assert failure paths or error handling.",
      recommendation: "Add negative tests per slice (invalid payloads, auth failures, etc.).",
    });
  }

  if (context.contractTests === 0) {
    issues.push({
      severity: "warning",
      title: "No contract tests",
      description: "API drift risk is high without Pact/Dredd/Schemathesis coverage.",
      recommendation: "Introduce contract tests linked to OpenAPI specs.",
    });
  }

  if (context.testcontainersUsage === 0 && context.stats.integrationTests > 0) {
    issues.push({
      severity: "warning",
      title: "Integration tests rely on mocks",
      description: "Integration tests detected without Testcontainers support.",
      recommendation: "Adopt Testcontainers to run slice-level integration suites.",
    });
  }

  return issues;
}

/**
 * Recommendations builder
 */
function generateRecommendations(context: {
  stats: TestStats;
  mockUsage: MockUsageSummary;
  coverage: CoverageSummary;
  slowTests: SlowTest[];
  organization: OrganizationSummary;
  analyses: TestFileAnalysis[];
  errorTests: number;
  contractTests: number;
  testcontainersUsage: number;
}): Recommendation[] {
  const recs: Recommendation[] = [];

  if (context.mockUsage.percentageOfSuite >= 0.3 || context.testcontainersUsage === 0) {
    recs.push({
      priority: "critical",
      title: "Adopt Testcontainers",
      description: `Replace ${context.mockUsage.testsTouchedByMocks} mock-heavy tests with containerized slices.`,
      impact: "40% fewer false positives and realistic integration coverage.",
      actionItems: [
        "Install @testcontainers modules for PostgreSQL, Redis, and any external deps.",
        "Refactor auth/workout suites to use real containers instead of jest mocks.",
        "Run containers in parallel (one per slice) to keep suite fast.",
      ],
    });
  }

  if (context.coverage.graphDbAvailable && context.coverage.missingSlices.length > 0) {
    recs.push({
      priority: "high",
      title: "Organize tests by slice",
      description: `No tests were found for slices: ${context.coverage.missingSlices.join(", ")}`,
      impact: "Clear ownership and easier parallelization.",
      actionItems: context.coverage.missingSlices.map(
        slice => `Create tests/${slice}/ and add integration suites targeting /api/${slice}.`
      ),
    });
  }

  if (context.coverage.graphDbAvailable && context.coverage.endpoints.percentage < 80) {
    recs.push({
      priority: "high",
      title: "Close API coverage gaps",
      description: `${context.coverage.endpoints.tested}/${context.coverage.endpoints.total} endpoints covered.`,
      impact: "Catch regressions before they hit production APIs.",
      actionItems: [
        "Use Arela contracts to export OpenAPI specs for each slice.",
        "Generate tests hitting the missing endpoints listed above.",
      ],
    });
  }

  if (context.slowTests.length > 0) {
    recs.push({
      priority: "medium",
      title: "Parallelize and trim slow tests",
      description: `${context.slowTests.length} tests exceed 1s. Estimated suite time ${context.stats.estimatedSuiteDurationSeconds.toFixed(1)}s.`,
      impact: "3x faster CI by running slice suites concurrently.",
      actionItems: [
        "Remove manual waits (>1000ms) and rely on container readiness checks.",
        "Run vitest/jest with --runInBand only for flaky suites; otherwise use sharding.",
        "Adopt Testcontainers' reusable mode to avoid cold-start penalties.",
      ],
    });
  }

  if (context.contractTests === 0) {
    recs.push({
      priority: "medium",
      title: "Add contract tests",
      description: "Introduce Dredd or Pact flows to prevent API drift.",
      impact: "Guarantees backend + frontend stay aligned on schema changes.",
      actionItems: [
        "Export OpenAPI via `arela contracts generate`.",
        "Run Dredd against staging containers during CI.",
      ],
    });
  }

  return recs;
}

/**
 * Detect framework heuristically
 */
function detectFramework(content: string, filePath: string): string {
  if (/from\s+['"]vitest['"]/.test(content) || /\bvi\./.test(content)) {
    return "vitest";
  }
  if (/from\s+['"]jest['"]/.test(content) || /\bjest\./.test(content)) {
    return "jest";
  }
  if (/from\s+['"]mocha['"]/.test(content) || /\bdescribe\(/.test(content) && /\.spec\./.test(filePath)) {
    return "mocha";
  }
  if (/pytest/.test(content) || /\.py$/.test(filePath)) {
    return "pytest";
  }
  return "unknown";
}

/**
 * Detect naming convention from file path
 */
function detectNaming(relativePath: string): string {
  if (relativePath.includes(".spec.")) return "spec";
  if (relativePath.includes(".test.")) return "test";
  if (relativePath.endsWith("_test.py") || relativePath.includes("test_")) return "pytest";
  return "mixed";
}

/**
 * Extract endpoint references from test content
 */
function extractEndpointStrings(content: string): string[] {
  const matches = content.match(/['"`](\/api\/[^'"`]+)['"`]/g) || [];
  return matches
    .map(match => match.slice(1, -1))
    .map(str => str.replace(/\?.*$/, ""))
    .map(str => str.replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Extract slices from endpoint paths
 */
function extractSlicesFromEndpoints(paths: string[]): string[] {
  return paths
    .map(pathValue => extractSliceFromPath(pathValue))
    .filter((slice): slice is string => Boolean(slice));
}

/**
 * Extract slice from path
 */
function extractSliceFromPath(route: string): string | null {
  const parts = route.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "api") {
    return parts[1];
  }
  return null;
}

/**
 * Extract slice hints from file path
 */
function extractSlicesFromPath(relativePath: string): string[] {
  const normalized = relativePath.split(/[\\/]/).map(part => part.toLowerCase());
  const result: string[] = [];
  const anchorFolders = ["tests", "__tests__", "integration", "e2e"];

  for (const anchor of anchorFolders) {
    const index = normalized.indexOf(anchor);
    if (index >= 0 && index + 1 < normalized.length) {
      const candidate = normalized[index + 1];
      if (candidate && candidate !== "__snapshots__") {
        result.push(candidate);
      }
    }
  }

  return result;
}

/**
 * Detect slow indicators (>1s)
 */
function detectSlowIndicators(content: string): SlowIndicator[] {
  const indicators: SlowIndicator[] = [];
  for (const pattern of SLOW_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const duration = pattern.getDuration(match);
      if (duration < 1000) continue;
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      indicators.push({
        line,
        reason: pattern.reason,
        durationMs: duration,
      });
    }
  }
  return indicators;
}

/**
 * Utility to count regex matches
 */
function matchAll(content: string, regex: RegExp): number {
  const cloned = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  return (content.match(cloned) || []).length;
}

/**
 * Normalize API path for comparisons
 */
function normalizePath(route: string): string {
  return route
    .trim()
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "")
    .replace(/\{([^}]+)\}/g, ":$1")
    .replace(/:(\w+)\??/g, ":$1");
}

/**
 * Find Graph DB path
 */
function findGraphDb(baseDir: string): string | null {
  const candidates = [
    path.join(baseDir, ".arela", "memory", "graph.db"),
    path.join(baseDir, ".arela", "graph.db"),
    path.join(process.cwd(), ".arela", "memory", "graph.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Sum helper
 */
function sumField<T extends Record<string, any>>(items: T[], field: keyof T): number {
  return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
}

/**
 * Mock detection patterns
 */
const MOCK_DETECTORS = [
  { name: "jest.mock", regex: /jest\.mock\(/g },
  { name: "vi.mock", regex: /vi\.mock\(/g },
  { name: "jest.spyOn", regex: /jest\.spyOn\(/g },
  { name: "vi.spyOn", regex: /vi\.spyOn\(/g },
  { name: "sinon.stub", regex: /sinon\.stub\(/g },
  { name: "sinon.spy", regex: /sinon\.spy\(/g },
  { name: "mockResolvedValue", regex: /\.mockResolvedValue/g },
  { name: "mockRejectedValue", regex: /\.mockRejectedValue/g },
  { name: "unittest.mock", regex: /unittest\.mock/g },
  { name: "pytest-mocker", regex: /\bmocker\./g },
];

/**
 * Integration indicators
 */
const INTEGRATION_INDICATORS = [
  /supertest/i,
  /request\(/i,
  /axios\./i,
  /fetch\(/i,
  /prisma/i,
  /typeorm/i,
  /mongoose/i,
  /postgresql?container/i,
  /rediscontainer/i,
  /kafka/i,
  /GenericContainer/i,
  /StartedTestContainer/i,
  /playwright/i,
  /page\./i,
  /browser/i,
  /cy\./i,
];

const TESTCONTAINER_HINTS = [
  /Testcontainers/,
  /GenericContainer/,
  /StartedTestContainer/,
  /new\s+[A-Za-z]+Container\(/,
];

const ERROR_ASSERTION_REGEX = /toThrow|rejects\.to|should\s+(?:fail|error)|invalid input|unauthorized|forbidden|422|500|400/gi;
const CONTRACT_INDICATOR_REGEX = /pact|contract test|dredd|schemathesis|prism/i;

/**
 * Slow pattern detectors
 */
const SLOW_PATTERNS: {
  regex: RegExp;
  reason: string;
  getDuration: (match: RegExpExecArray) => number;
}[] = [
  {
    regex: /waitForTimeout\((\d+)\)/g,
    reason: "page.waitForTimeout",
    getDuration: match => parseInt(match[1], 10),
  },
  {
    regex: /setTimeout\(\s*(\d+)\s*\)/g,
    reason: "setTimeout in test",
    getDuration: match => parseInt(match[1], 10),
  },
  {
    regex: /sleep\(\s*(\d+)\s*\)/g,
    reason: "sleep call",
    getDuration: match => parseInt(match[1], 10),
  },
  {
    regex: /jest\.setTimeout\(\s*(\d+)\s*\)/g,
    reason: "jest.setTimeout",
    getDuration: match => parseInt(match[1], 10),
  },
  {
    regex: /vi\.setConfig\((?:.|\n)*?testTimeout\s*:\s*(\d+)/g,
    reason: "vi.setConfig(testTimeout)",
    getDuration: match => parseInt(match[1], 10),
  },
  {
    regex: /test\.slow\(/g,
    reason: "test.slow marker",
    getDuration: () => 1500,
  },
];
