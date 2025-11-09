import path from "node:path";
import crypto from "node:crypto";
import fs from "fs-extra";
import YAML from "yaml";
import { glob } from "glob";
import {
  ArelaRule,
  ArelaWorkflow,
  LoadResult,
  RuleSchema,
  WorkflowSchema,
  parseFrontMatter,
} from "./schema.js";
import { emitRulesFromOs } from "./generators/fromOs.js";
import { readTemplateDir, writeRule } from "./adapters/arela.js";
import pkg from "../package.json" with { type: "json" };

const PRESET_VERSION: string = (pkg as { version?: string }).version ?? "0.0.0";

export async function hashFile(filePath: string): Promise<string> {
  if (!(await fs.pathExists(filePath))) {
    return "";
  }
  const buffer = await fs.readFile(filePath);
  const hash = crypto.createHash("sha1").update(buffer).digest("hex");
  return hash;
}

const ARELA_DIR = ".arela";
const RULES_DIR = path.join(ARELA_DIR, "rules");
const WORKFLOW_DIR = path.join(ARELA_DIR, "workflows");
const MEMORIES_DIR = path.join(ARELA_DIR, "memories");
const EVALS_DIR = path.join(ARELA_DIR, "evals");
const LAST_REPORT_FILE = path.join(ARELA_DIR, ".last-report.json");

const LOCAL_DOCTOR_COMMAND = "node node_modules/@arela/preset-cto/dist/cli.js doctor";

const WORKFLOW_CONTENT = `name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - run: ${LOCAL_DOCTOR_COMMAND}
`;

const VSCODE_SETTINGS_CONTENT = JSON.stringify(
  {
    "files.exclude": {
      "**/.pnpm-store": true,
    },
    "files.watcherExclude": {
      "**/.pnpm-store/**": true,
    },
    "search.exclude": {
      "**/.arela": false,
    },
    "search.useIgnoreFiles": true,
  },
  null,
  2,
) + "\n";

const HUSKY_DOCTOR_COMMAND = LOCAL_DOCTOR_COMMAND;

function slugify(value: string, fallback = "summary"): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return base || fallback;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }
  try {
    const data = await fs.readJson(filePath);
    return data as T;
  } catch {
    return null;
  }
}

export async function ensureDirs(
  cwd: string,
  opts?: { dryRun?: boolean },
): Promise<string[]> {
  const targets = [ARELA_DIR, RULES_DIR, WORKFLOW_DIR, MEMORIES_DIR, EVALS_DIR].map((dir) =>
    path.join(cwd, dir),
  );
  const created: string[] = [];
  for (const dir of targets) {
    const exists = await fs.pathExists(dir);
    if (!exists) {
      if (!opts?.dryRun) {
        await fs.ensureDir(dir);
      }
      created.push(dir);
    }
  }
  return created;
}

async function readMarkdownFiles(dir: string, extension = "*.md"): Promise<string[]> {
  if (!(await fs.pathExists(dir))) {
    return [];
  }
  const files = await glob(extension, {
    cwd: dir,
    dot: false,
  });
  return files.map((file) => path.join(dir, file));
}

export async function loadLocalRules(cwd: string): Promise<LoadResult<ArelaRule>> {
  const rulesDir = path.join(cwd, RULES_DIR);
  const files = await readMarkdownFiles(rulesDir);
  const result: LoadResult<ArelaRule> = { items: [], errors: [] };

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const { data, content } = parseFrontMatter(raw);
      const parsed = RuleSchema.safeParse({ ...data, body: content });
      if (parsed.success) {
        result.items.push(parsed.data);
      } else {
        result.errors.push(`${file}: ${parsed.error.message}`);
      }
    } catch (error) {
      result.errors.push(`${file}: ${(error as Error).message}`);
    }
  }
  return result;
}

export async function loadLocalWorkflows(cwd: string): Promise<LoadResult<ArelaWorkflow>> {
  const wfDir = path.join(cwd, WORKFLOW_DIR);
  const files = await readMarkdownFiles(wfDir, "*.md");
  const result: LoadResult<ArelaWorkflow> = { items: [], errors: [] };

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const { data, content } = parseFrontMatter(raw);
      const parsed = WorkflowSchema.safeParse({
        ...data,
        body: content,
      });
      if (parsed.success) {
        result.items.push(parsed.data);
      } else {
        result.errors.push(`${file}: ${parsed.error.message}`);
      }
    } catch (error) {
      result.errors.push(`${file}: ${(error as Error).message}`);
    }
  }

  return result;
}

function resolveCwd(customCwd?: string): string {
  return customCwd ? path.resolve(customCwd) : process.cwd();
}

type CopyStrategy = "init" | "sync";

type CopySummary = {
  written: string[];
  staged: string[];
  skipped: string[];
  identical: string[];
  conflicts: string[];
  updatedHashes: Record<string, LastSyncEntry>;
};

export async function copyTemplates(opts: {
  cwd: string;
  force?: boolean;
  dryRun?: boolean;
  strategy?: CopyStrategy;
  state?: LastSyncState;
}): Promise<CopySummary> {
  const strategy = opts.strategy ?? "sync";
  const templateRoot = readTemplateDir();
  const files = await glob("**/*", { cwd: templateRoot, nodir: true, dot: true });
  const summary: CopySummary = {
    written: [],
    staged: [],
    skipped: [],
    identical: [],
    conflicts: [],
    updatedHashes: {},
  };

  const recordUpdate = (rel: string, entry: LastSyncEntry): void => {
    summary.updatedHashes[rel] = entry;
  };

  for (const rel of files) {
    const templateFile = path.join(templateRoot, rel);
    const destFile = path.join(opts.cwd, ARELA_DIR, rel);
    const destDir = path.dirname(destFile);
    const exists = await fs.pathExists(destFile);
    const templateHash = await hashFile(templateFile);
    const currentHash = exists ? await hashFile(destFile) : "";
    const recordedEntry = opts.state?.files?.[rel];
    const recordedHash = recordedEntry?.localHash ?? "";
    const hasRecorded = Boolean(recordedHash);

    const copyIntoPlace = async (): Promise<void> => {
      if (!opts.dryRun) {
        await fs.ensureDir(destDir);
        await fs.copy(templateFile, destFile, { overwrite: true });
        recordUpdate(rel, { templateHash, localHash: templateHash });
      }
      summary.written.push(rel);
    };

    if (!exists) {
      await copyIntoPlace();
      continue;
    }

    if (templateHash === currentHash) {
      summary.identical.push(rel);
      continue;
    }

    if (strategy === "init" && !opts.force) {
      summary.skipped.push(rel);
      continue;
    }

    const localMatchesRecorded = hasRecorded && recordedHash === currentHash;
    const localMatchesTemplate = currentHash === templateHash;

    if (!opts.force && strategy === "sync") {
      if (hasRecorded) {
        if (!localMatchesRecorded && !localMatchesTemplate) {
          if (!opts.dryRun) {
            await fs.ensureDir(destDir);
            await fs.copy(templateFile, `${destFile}.new`, { overwrite: true });
          }
          summary.conflicts.push(`${rel}.new`);
          continue;
        }
      } else {
        if (!opts.dryRun) {
          await fs.ensureDir(destDir);
          await fs.copy(templateFile, `${destFile}.new`, { overwrite: true });
        }
        summary.staged.push(`${rel}.new`);
        continue;
      }
    }

    await copyIntoPlace();
  }

  return summary;
}

type LastSyncEntry = {
  templateHash: string;
  localHash: string;
};

type LastSyncState = {
  presetVersion: string;
  files: Record<string, LastSyncEntry>;
};

async function readLastSyncState(cwd: string): Promise<LastSyncState> {
  const file = path.join(cwd, ARELA_DIR, ".last-sync.json");
  if (!(await fs.pathExists(file))) {
    return { presetVersion: PRESET_VERSION, files: {} };
  }
  try {
    const state = await fs.readJson(file);
    return state as LastSyncState;
  } catch {
    return { presetVersion: PRESET_VERSION, files: {} };
  }
}

async function writeLastSyncState(cwd: string, state: LastSyncState): Promise<void> {
  const file = path.join(cwd, ARELA_DIR, ".last-sync.json");
  await fs.outputJson(file, state, { spaces: 2 });
}

async function mergeLastSyncEntries(
  cwd: string,
  updates: Record<string, LastSyncEntry>,
  opts?: { dryRun?: boolean },
): Promise<void> {
  if (opts?.dryRun) return;
  const entries = Object.entries(updates);
  if (!entries.length) return;
  const state = await readLastSyncState(cwd);
  state.presetVersion = PRESET_VERSION;
  for (const [rel, entry] of entries) {
    state.files[rel] = entry;
  }
  await writeLastSyncState(cwd, state);
}

export async function threeWayMerge(opts: {
  cwd: string;
  dryRun?: boolean;
}): Promise<{ conflicts: string[]; updated: string[]; updatedHashes: Record<string, LastSyncEntry> }> {
  const templateRoot = readTemplateDir();
  const files = await glob("**/*", { cwd: templateRoot, nodir: true, dot: true });
  const state = await readLastSyncState(opts.cwd);
  const conflicts: string[] = [];
  const updated: string[] = [];
  const updatedHashes: Record<string, LastSyncEntry> = {};

  const stageConflict = async (templateFile: string, localFile: string, rel: string): Promise<void> => {
    const stagedFile = `${localFile}.new`;
    if (!opts.dryRun) {
      await fs.ensureDir(path.dirname(stagedFile));
      await fs.copy(templateFile, stagedFile, { overwrite: true });
    }
    conflicts.push(`${rel}.new`);
  };

  for (const rel of files) {
    const templateFile = path.join(templateRoot, rel);
    const localFile = path.join(opts.cwd, ARELA_DIR, rel);
    const templateHash = await hashFile(templateFile);
    const localExists = await fs.pathExists(localFile);
    const localHash = localExists ? await hashFile(localFile) : "";
    const recorded = state.files[rel];
    const recordedHash = recorded?.localHash ?? "";
    const hasRecorded = Boolean(recordedHash);

    if (!localExists) {
      if (!opts.dryRun) {
        await fs.ensureDir(path.dirname(localFile));
        await fs.copy(templateFile, localFile, { overwrite: true });
        updatedHashes[rel] = { templateHash, localHash: templateHash };
      }
      updated.push(rel);
      continue;
    }

    if (templateHash === localHash) {
      continue;
    }

    const localMatchesRecorded = hasRecorded && recordedHash === localHash;
    const localMatchesTemplate = localHash === templateHash;

    if (hasRecorded) {
      if (!localMatchesRecorded && !localMatchesTemplate) {
        await stageConflict(templateFile, localFile, rel);
        continue;
      }
    } else {
      await stageConflict(templateFile, localFile, rel);
      continue;
    }

    if (!opts.dryRun) {
      await fs.ensureDir(path.dirname(localFile));
      await fs.copy(templateFile, localFile, { overwrite: true });
      updatedHashes[rel] = { templateHash, localHash: templateHash };
    }
    updated.push(rel);
  }

  return { conflicts, updated, updatedHashes };
}

export async function init(opts: { cwd: string; from?: string; dryRun?: boolean }): Promise<{
  createdDirs: string[];
  templateSummary: CopySummary;
  generatedRules: string[];
}> {
  const cwd = resolveCwd(opts.cwd);
  const createdDirs = await ensureDirs(cwd, { dryRun: opts.dryRun });
  const state = await readLastSyncState(cwd);
  const templateSummary = await copyTemplates({
    cwd,
    force: false,
    dryRun: opts.dryRun,
    strategy: "init",
    state,
  });

  const generatedRules: string[] = [];
  if (opts.from) {
    const fromPath = path.isAbsolute(opts.from) ? opts.from : path.join(cwd, opts.from);
    const osJson = await fs.readJson(fromPath);
    const rules = emitRulesFromOs(osJson);
    for (const rule of rules) {
      const dest = path.join(cwd, ARELA_DIR, "rules", `${rule.id}.md`);
      if (await fs.pathExists(dest)) {
        continue;
      }
      await writeRule(cwd, rule, { overwrite: false, dryRun: opts.dryRun });
      generatedRules.push(rule.id);
    }
  }

  await mergeLastSyncEntries(cwd, templateSummary.updatedHashes, { dryRun: opts.dryRun });

  return { createdDirs, templateSummary, generatedRules };
}

export async function sync(opts: { cwd: string; force?: boolean; dryRun?: boolean }): Promise<CopySummary> {
  const cwd = resolveCwd(opts.cwd);
  await ensureDirs(cwd, { dryRun: opts.dryRun });
  const state = await readLastSyncState(cwd);
  const summary = await copyTemplates({
    cwd,
    force: opts.force,
    dryRun: opts.dryRun,
    strategy: "sync",
    state,
  });
  await mergeLastSyncEntries(cwd, summary.updatedHashes, { dryRun: opts.dryRun });
  return summary;
}

export async function upgrade(opts: { cwd: string; dryRun?: boolean }): Promise<{
  conflicts: string[];
  updated: string[];
  updatedHashes: Record<string, LastSyncEntry>;
}> {
  const cwd = resolveCwd(opts.cwd);
  await ensureDirs(cwd, { dryRun: opts.dryRun });
  const result = await threeWayMerge({ cwd, dryRun: opts.dryRun });
  await mergeLastSyncEntries(cwd, result.updatedHashes, { dryRun: opts.dryRun });
  return result;
}

export type EvalCheckResult = {
  status: "passed" | "failed" | "skipped";
  message?: string;
  failingCategories?: Array<{ name: string; score: number }>;
  average?: number;
  thresholds?: { minPass: number; avgPass: number };
};

export async function doctor(opts: {
  cwd: string;
  evalMode?: boolean;
}): Promise<{
  rules: LoadResult<ArelaRule>;
  workflows: LoadResult<ArelaWorkflow>;
  evalResult?: EvalCheckResult;
}> {
  const cwd = resolveCwd(opts.cwd);
  const [rules, workflows] = await Promise.all([loadLocalRules(cwd), loadLocalWorkflows(cwd)]);
  const evalResult = opts.evalMode ? await runEvalCheck(cwd) : undefined;
  return { rules, workflows, evalResult };
}

async function runEvalCheck(cwd: string): Promise<EvalCheckResult> {
  const rubricPath = path.join(cwd, EVALS_DIR, "rubric.json");
  const reportPath = path.join(cwd, LAST_REPORT_FILE);

  if (!(await fs.pathExists(rubricPath))) {
    return {
      status: "skipped",
      message: `Rubric missing at ${path.relative(cwd, rubricPath)}`,
    };
  }

  const rubricData = await readJsonIfExists<{
    categories?: Record<string, unknown>;
    scoring?: { minPass?: number; avgPass?: number };
  }>(rubricPath);
  if (!rubricData) {
    return {
      status: "skipped",
      message: `Unable to parse rubric at ${path.relative(cwd, rubricPath)}`,
    };
  }

  if (!(await fs.pathExists(reportPath))) {
    return {
      status: "skipped",
      message: `Report missing at ${path.relative(cwd, reportPath)}`,
    };
  }

  const reportData = await readJsonIfExists<{ scores?: Record<string, number>; average?: number }>(reportPath);
  if (!reportData) {
    return {
      status: "skipped",
      message: `Unable to parse report at ${path.relative(cwd, reportPath)}`,
    };
  }

  const scores = reportData.scores && typeof reportData.scores === "object" ? reportData.scores : null;
  if (!scores) {
    return { status: "skipped", message: "Report missing numeric scores." };
  }

  const scoreEntries = Object.entries(scores).filter(([, value]) => typeof value === "number") as Array<
    [string, number]
  >;
  if (scoreEntries.length === 0) {
    return { status: "skipped", message: "Report has no numeric score entries." };
  }

  const minPass = rubricData.scoring?.minPass ?? 0;
  const avgPass = rubricData.scoring?.avgPass ?? 0;
  const failingCategories = scoreEntries
    .filter(([, score]) => score < minPass)
    .map(([name, score]) => ({ name, score }));
  const average =
    typeof reportData.average === "number"
      ? reportData.average
      : scoreEntries.reduce((sum, [, score]) => sum + score, 0) / scoreEntries.length;
  const avgFails = average < avgPass;

  if (failingCategories.length > 0 || avgFails) {
    return {
      status: "failed",
      failingCategories,
      average,
      thresholds: { minPass, avgPass },
    };
  }

  return { status: "passed", average, thresholds: { minPass, avgPass } };
}

type SafeWriteAction = "written" | "identical" | "staged";

type SafeWriteResult = {
  target: string;
  outputPath: string;
  action: SafeWriteAction;
};

async function safeWriteFile(target: string, contents: string): Promise<SafeWriteResult> {
  const normalized = contents.endsWith("\n") ? contents : `${contents}\n`;
  const exists = await fs.pathExists(target);
  if (!exists) {
    await fs.ensureDir(path.dirname(target));
    await fs.outputFile(target, normalized);
    return { target, outputPath: target, action: "written" };
  }

  const current = await fs.readFile(target, "utf8");
  if (current === normalized) {
    return { target, outputPath: target, action: "identical" };
  }

  const staged = `${target}.new`;
  await fs.ensureDir(path.dirname(staged));
  await fs.outputFile(staged, normalized);
  return { target, outputPath: staged, action: "staged" };
}

async function listRuleFiles(cwd: string): Promise<string[]> {
  const dir = path.join(cwd, RULES_DIR);
  if (!(await fs.pathExists(dir))) {
    return [];
  }
  const files = await glob("**/*.md", { cwd: dir, nodir: true, dot: false });
  return files.map((rel) => path.join(dir, rel));
}

async function listWorkflowFiles(cwd: string): Promise<string[]> {
  const dir = path.join(cwd, WORKFLOW_DIR);
  if (!(await fs.pathExists(dir))) {
    return [];
  }
  const files = await glob("**/*.md", { cwd: dir, nodir: true, dot: false });
  return files.map((rel) => path.join(dir, rel));
}

async function ensureRuleFilesPresent(cwd: string): Promise<string[]> {
  const rules = await listRuleFiles(cwd);
  if (!rules.length) {
    throw new Error(`No Arela rule files found in ${path.join(cwd, RULES_DIR)}`);
  }
  return rules;
}

export type BootstrapBundle = {
  repoName: string;
  prompt: string;
  files: string[];
  rulePaths: string[];
  workflowPaths: string[];
};

function buildPromptText(opts: {
  repoName: string;
  rulePaths: string[];
  workflowPaths: string[];
  cwd: string;
}): string {
  const relRules = opts.rulePaths.map((file) => path.relative(opts.cwd, file));
  const relWorkflows = opts.workflowPaths.map((file) => path.relative(opts.cwd, file));
  const testingDirective = opts.rulePaths.some((file) => file.includes("testing-trophy"))
    ? "arela.testing_trophy"
    : "arela.testing_pyramid";
  const header = `SYSTEM: Arela Bootstrap (${opts.repoName})`;
  const ruleLines = relRules.map((rule) => `- ${rule}`).join("\n") || "- (add rules via npx arela init)";
  const workflowLines = relWorkflows.map((wf) => `- ${wf}`).join("\n") || "- (no workflows found)";
  const policyBlock =
    "Enforce: arela.context_integrity, arela.ticket_format, arela.code_review_gates, " +
    `${testingDirective}, arela.observability_minimums.`;
  return [
    header,
    "Load `.arela/rules/*` and `.arela/workflows/*`. If any file is missing, ask for it before proceeding.",
    "Rules:",
    ruleLines,
    "Workflows:",
    workflowLines,
    policyBlock,
    "Maintain arela.context_integrity; halt and run a Context Integrity Check on drift.",
    "For every task, return a Report (summary, acceptance checklist status, test outputs, UI proof if applicable).",
  ].join("\n\n");
}

async function generateBootstrapBundle(cwd: string): Promise<BootstrapBundle> {
  const absoluteCwd = path.resolve(cwd);
  const rulePaths = await ensureRuleFilesPresent(absoluteCwd);
  const workflowPaths = await listWorkflowFiles(absoluteCwd);
  const repoName = path.basename(absoluteCwd);
  const prompt = buildPromptText({ repoName, rulePaths, workflowPaths, cwd: absoluteCwd });
  const files = [...rulePaths, ...workflowPaths];
  return { repoName, prompt, files, rulePaths, workflowPaths };
}

function formatBootstrapReadme(bundle: BootstrapBundle, cwd: string): string {
  const relRules = bundle.rulePaths.map((file) => `- ${path.relative(cwd, file)}`);
  const relWorkflows = bundle.workflowPaths.map((file) => `- ${path.relative(cwd, file)}`);
  return [
    "# Arela Bootstrap",
    "Agents must load and enforce every rule + workflow in `.arela/*` before acting.",
    "## Rules",
    relRules.join("\n") || "- (add rules via npx arela init)",
    "## Workflows",
    relWorkflows.join("\n") || "- (no workflows yet)",
    "## Directives",
    "- Enforce arela.context_integrity before acting",
    "- Validate tasks against arela.ticket_format",
    "- Review work via arela.code_review_gates, arela.testing_trophy/arela.testing_pyramid, arela.observability_minimums",
    "- Return a Report per task (summary, checklist, tests, evidence)",
  ].join("\n\n") + "\n";
}

async function appendHuskyDoctorHook(cwd: string): Promise<"appended" | "already" | "skipped"> {
  const hookPath = path.join(cwd, ".husky", "pre-commit");
  if (!(await fs.pathExists(hookPath))) {
    return "skipped";
  }

  const content = await fs.readFile(hookPath, "utf8");
  if (content.includes(HUSKY_DOCTOR_COMMAND)) {
    return "already";
  }

  const needsNewline = content.endsWith("\n") ? "" : "\n";
  await fs.appendFile(hookPath, `${needsNewline}${HUSKY_DOCTOR_COMMAND}\n`);
  await fs.chmod(hookPath, 0o755);
  return "appended";
}

export type HardenResult = {
  written: string[];
  staged: string[];
  identical: string[];
  husky: "appended" | "already" | "skipped";
};

export async function harden(opts: { cwd: string }): Promise<HardenResult> {
  const cwd = resolveCwd(opts.cwd);
  await ensureDirs(cwd, { dryRun: false });
  let bootstrapContent = "# Arela Bootstrap\nRun `npx arela init` to generate rules.\n";
  try {
    const bundle = await generateBootstrapBundle(cwd);
    bootstrapContent = formatBootstrapReadme(bundle, cwd);
  } catch (error) {
    bootstrapContent = `# Arela Bootstrap\n${(error as Error).message}\n`;
  }

  const targets: Array<{ rel: string; contents: string }> = [
    { rel: path.join(ARELA_DIR, "BOOTSTRAP.readme.md"), contents: bootstrapContent },
    { rel: path.join(".github", "workflows", "arela-doctor.yml"), contents: WORKFLOW_CONTENT },
    { rel: path.join(".vscode", "settings.json"), contents: VSCODE_SETTINGS_CONTENT },
  ];

  const result: HardenResult = { written: [], staged: [], identical: [], husky: "skipped" };
  const buckets: Record<SafeWriteAction, string[]> = {
    written: result.written,
    staged: result.staged,
    identical: result.identical,
  };

  for (const target of targets) {
    const absolute = path.join(cwd, target.rel);
    const writeResult = await safeWriteFile(absolute, target.contents);
    buckets[writeResult.action].push(path.relative(cwd, writeResult.outputPath));
  }

  result.husky = await appendHuskyDoctorHook(cwd);
  return result;
}

type ResearchEntry = {
  id: string;
  title: string;
  source: string;
  output: string;
};

export type ResearchImportResult = {
  imported: ResearchEntry[];
  skipped: string[];
  indexPath: string;
};

function extractHeading(content: string): string | null {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(/^#+\s*(.+)$/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

async function collectExistingRuleIds(cwd: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const rulesDir = path.join(cwd, RULES_DIR);
  if (!(await fs.pathExists(rulesDir))) {
    return ids;
  }
  const files = await glob("**/*.md", { cwd: rulesDir, nodir: true, dot: true });
  for (const rel of files) {
    const filePath = path.join(rulesDir, rel);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { data } = parseFrontMatter(raw);
      const id = data.id;
      if (typeof id === "string" && id.length) {
        ids.add(id);
      }
    } catch {
      // ignore parse failures when scanning existing ids
    }
  }
  return ids;
}

export async function importResearchSummaries(opts: {
  cwd: string;
  sourceDir: string;
}): Promise<ResearchImportResult> {
  const cwd = resolveCwd(opts.cwd);
  const sourceDir = path.isAbsolute(opts.sourceDir)
    ? opts.sourceDir
    : path.join(cwd, opts.sourceDir);
  const stats = await fs.stat(sourceDir).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Research directory not found: ${sourceDir}`);
  }

  const files = await glob("**/*.md", { cwd: sourceDir, nodir: true, dot: false });
  const existingIds = await collectExistingRuleIds(cwd);
  await ensureDirs(cwd, { dryRun: false });

  const imported: ResearchEntry[] = [];
  const skipped: string[] = [];

  for (const rel of files) {
    const absFile = path.join(sourceDir, rel);
    try {
      const content = await fs.readFile(absFile, "utf8");
      const heading = extractHeading(content) ?? path.parse(absFile).name;
      const slugBase = slugify(heading || path.parse(absFile).name);
      let slug = slugBase || slugify(path.parse(absFile).name);
      if (!slug) slug = "summary";
      let id = `arela.research.${slug}`;
      let counter = 2;
      while (existingIds.has(id)) {
        slug = `${slugBase || "summary"}-v${counter}`;
        id = `arela.research.${slug}`;
        counter += 1;
      }
      existingIds.add(id);

      const frontMatter = YAML.stringify({
        id,
        title: heading,
        version: "1.0.0",
        tags: ["research"],
        research_origin: path.basename(absFile),
      }).trimEnd();
      const destFile = path.join(cwd, RULES_DIR, `${slug}.md`);
      const sanitizedBody = content.trimEnd();
      const normalizedBody = sanitizedBody ? `${sanitizedBody}\n` : "";
      await fs.ensureDir(path.dirname(destFile));
      await fs.writeFile(destFile, `---\n${frontMatter}\n---\n\n${normalizedBody}`);

      imported.push({
        id,
        title: heading,
        source: path.relative(cwd, absFile),
        output: path.relative(cwd, destFile),
      });
    } catch (error) {
      skipped.push(`${path.relative(cwd, absFile)} :: ${(error as Error).message}`);
    }
  }

  const indexPath = path.join(cwd, ARELA_DIR, "research_index.json");
  const existingIndex = (await readJsonIfExists<{ entries?: ResearchEntry[] }>(indexPath)) ?? { entries: [] };
  const combinedEntries = [...(existingIndex.entries ?? []), ...imported];
  await fs.outputJson(indexPath, { entries: combinedEntries }, { spaces: 2 });

  return { imported, skipped, indexPath: path.relative(cwd, indexPath) };
}

export async function ensureRulesPresent(opts: { cwd: string }): Promise<string[]> {
  const cwd = resolveCwd(opts.cwd);
  return ensureRuleFilesPresent(cwd);
}

export async function getBootstrapBundle(opts: { cwd: string }): Promise<BootstrapBundle> {
  const cwd = resolveCwd(opts.cwd);
  return generateBootstrapBundle(cwd);
}

export type AgentType = "cursor" | "windsurf" | "claude" | "generic";

export type AgentInstallResult = {
  written: string[];
  staged: string[];
  identical: string[];
};

function formatPromptWithFiles(prompt: string, files: string[], cwd: string): string {
  if (!files.length) {
    return `${prompt}\n`;
  }
  const rel = files.map((file) => `- ${path.relative(cwd, file)}`).join("\n");
  return `${prompt}\n\nFiles:\n${rel}\n`;
}

export async function installAgentAssets(opts: {
  cwd: string;
  agent: AgentType;
  prompt: string;
  files: string[];
}): Promise<AgentInstallResult> {
  const cwd = resolveCwd(opts.cwd);
  const result: AgentInstallResult = { written: [], staged: [], identical: [] };
  const buckets: Record<SafeWriteAction, string[]> = {
    written: result.written,
    staged: result.staged,
    identical: result.identical,
  };

  const fullPrompt = formatPromptWithFiles(opts.prompt, opts.files, cwd);

  const recordResult = async (targetPath: string): Promise<void> => {
    const writeResult = await safeWriteFile(targetPath, fullPrompt);
    buckets[writeResult.action].push(path.relative(cwd, writeResult.outputPath));
  };

  if (opts.agent === "cursor") {
    await recordResult(path.join(cwd, ".cursor", "rules.md"));
    return result;
  }

  if (opts.agent === "windsurf") {
    await recordResult(path.join(cwd, ".windsurf", "README.md"));
    await recordResult(path.join(cwd, ".windsurf", "cascade.bootstrap.md"));
    return result;
  }

  return result;
}

export async function autoMaterializeOnPostinstall(): Promise<boolean> {
  if (process.env.npm_lifecycle_event !== "postinstall") {
    return false;
  }
  if (process.env.ARELA_SKIP_POSTINSTALL === "1") {
    console.log("[Arela] Skipping auto init (ARELA_SKIP_POSTINSTALL=1).");
    return true;
  }
  const initCwdEnv = process.env.INIT_CWD;
  if (!initCwdEnv) {
    console.log("[Arela] INIT_CWD not set; skipping auto init.");
    return true;
  }
  const targetCwd = path.resolve(initCwdEnv);
  const packageCwd = path.resolve(process.cwd());
  const inNodeModules = packageCwd.split(path.sep).includes("node_modules");
  if (!inNodeModules) {
    console.log("[Arela] Development install detected; skipping auto init.");
    return true;
  }
  if (targetCwd === packageCwd) {
    console.log("[Arela] Detected local package install; skipping auto init.");
    return true;
  }
  const arelaPath = path.join(targetCwd, ARELA_DIR);
  if (await fs.pathExists(arelaPath)) {
    console.log(`[Arela] Auto init skipped – ${path.relative(targetCwd, arelaPath)} already exists.`);
    return true;
  }
  console.log(`[Arela] Auto-initializing Arela rules in ${targetCwd}`);
  try {
    await init({ cwd: targetCwd, dryRun: false });
    console.log("[Arela] Auto init complete.");
  } catch (error) {
    console.error(`[Arela] Auto init failed: ${(error as Error).message}`);
  }
  return true;
}
