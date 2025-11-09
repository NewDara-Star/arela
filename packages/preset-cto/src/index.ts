 export {
  init,
  sync,
  upgrade,
  doctor,
  harden,
  importResearchSummaries,
  loadLocalRules,
  loadLocalWorkflows,
  getBootstrapBundle,
  installAgentAssets,
  ensureRulesPresent,
  autoMaterializeOnPostinstall,
} from "./loaders.js";
export { RuleSchema, WorkflowSchema, type ArelaRule, type ArelaWorkflow, type LoadResult } from "./schema.js";
export { readTemplateDir, readTemplateFiles } from "./adapters/arela.js";
export type {
  EvalCheckResult,
  ResearchImportResult,
  AgentInstallResult,
  AgentType,
  BootstrapBundle,
} from "./loaders.js";
