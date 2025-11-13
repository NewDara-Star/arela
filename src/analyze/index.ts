/**
 * Architecture Analysis Module
 * Exports main analysis functions
 */

export { analyzeArchitecture } from "./architecture.js";
export { reportArchitecture, exportArchitectureJson, generateMarkdownReport } from "./reporter.js";
export { analyzeTestStrategy } from "./tests/analyzer.js";
export {
  reportTestStrategy,
  exportTestStrategyJson,
  writeDefaultTestReport,
} from "./tests/reporter.js";
export type {
  ArchitectureReport,
  ArchitectureType,
  RepoAnalysis,
  AnalyzeOptions,
  CouplingCohesionScores,
} from "./types.js";
export type {
  TestStrategyReport,
  TestAnalysisOptions,
  TestFileAnalysis,
  MockUsageSummary,
  CoverageSummary,
  Recommendation as TestRecommendation,
  TestIssue,
} from "./tests/types.js";
