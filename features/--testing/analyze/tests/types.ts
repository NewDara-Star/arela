/**
 * Types for the Test Strategy Optimizer
 */

export type TestClassification = "unit" | "integration";

export interface TestAnalysisOptions {
  cwd: string;
  dir?: string;
  verbose?: boolean;
}

export interface TestFileAnalysis {
  path: string;
  absolutePath: string;
  framework: string;
  namingConvention: string;
  testCount: number;
  classification: TestClassification;
  mockCount: number;
  mockPatterns: Record<string, number>;
  usesTestcontainers: boolean;
  testcontainersHints: string[];
  endpointsReferenced: string[];
  sliceMatches: string[];
  pathSliceHints: string[];
  errorAssertionCount: number;
  contractIndicatorCount: number;
  slowIndicators: SlowIndicator[];
  hasMocks: boolean;
  hasIntegrationIndicators: boolean;
  hasErrorAssertions: boolean;
  directories: string[];
}

export interface SlowIndicator {
  line: number;
  reason: string;
  durationMs?: number;
}

export interface SlowTest {
  file: string;
  reason: string;
  estimatedDurationSeconds: number;
  line?: number;
}

export interface MockUsageSummary {
  totalMocks: number;
  filesWithMocks: number;
  testsTouchedByMocks: number;
  percentageOfSuite: number;
  dominantPatterns: { name: string; count: number }[];
}

export interface EndpointCoverageGap {
  method: string;
  path: string;
}

export interface SliceCoverage {
  slice: string;
  endpointsTotal: number;
  endpointsTested: number;
  tests: number;
}

export interface CoverageSummary {
  endpoints: {
    total: number;
    tested: number;
    percentage: number;
    untested: EndpointCoverageGap[];
  };
  slices: SliceCoverage[];
  missingSlices: string[];
  graphDbAvailable: boolean;
  graphDbPath?: string;
  notes: string[];
}

export interface TestStats {
  totalTests: number;
  unitTests: number;
  integrationTests: number;
  testFiles: number;
  frameworks: Record<string, number>;
  namingConventions: Record<string, number>;
  averageTestTimeSeconds: number;
  estimatedSuiteDurationSeconds: number;
}

export interface OrganizationSummary {
  rootFolders: Record<string, number>;
  hasDedicatedTestsFolder: boolean;
  scattered: boolean;
  suggestedStructure: string[];
}

export interface TestIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact?: string;
  actionItems: string[];
}

export interface TestStrategyReport {
  generatedAt: string;
  baseDir: string;
  filesAnalyzed: number;
  stats: TestStats;
  files: TestFileAnalysis[];
  mockUsage: MockUsageSummary;
  coverage: CoverageSummary;
  slowTests: SlowTest[];
  organization: OrganizationSummary;
  issues: TestIssue[];
  recommendations: Recommendation[];
  errorTests: number;
  contractTests: number;
  graph: {
    available: boolean;
    path?: string;
  };
}
