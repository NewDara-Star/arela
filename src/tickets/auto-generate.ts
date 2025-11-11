import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import type { AgentName, TicketPriority, TicketComplexity, Ticket } from "../types.js";

export interface Violation {
  message: string;
  source?: string;
  ruleId?: string;
  file?: string;
  line?: number;
}

export interface GeneratedTicket {
  id: string;
  title: string;
  summary: string;
  agent: AgentName;
  priority: TicketPriority;
  complexity: TicketComplexity;
  estimate: string;
  occurrences: number;
  files: string[];
  path: string;
  dryRun: boolean;
}

export interface AutoTicketOptions {
  cwd: string;
  violations: Violation[];
  dryRun?: boolean;
}

type TicketGroup = {
  key: string;
  title: string;
  summary: string;
  agent: AgentName;
  priority: TicketPriority;
  complexity: TicketComplexity;
  estimate: string;
  violations: Violation[];
};

const COMPLEX_KEYWORDS = [
  /security/i,
  /workflow/i,
  /architecture/i,
  /observability/i,
  /compliance/i,
  /evaluation/i,
];

const SIMPLE_KEYWORDS = [
  /missing test/i,
  /console\.log/i,
  /lint/i,
  /format/i,
  /typo/i,
  /spelling/i,
];

export async function generateTicketsFromViolations(
  opts: AutoTicketOptions,
): Promise<GeneratedTicket[]> {
  if (!opts.violations.length) {
    return [];
  }

  const groups = buildTicketGroups(opts.violations);
  // Prioritize larger groups first for deterministic IDs
  groups.sort((a, b) => b.violations.length - a.violations.length);

  const tickets: GeneratedTicket[] = [];
  for (const group of groups) {
    const id = await getNextTicketId(opts.cwd, group.agent, { ensureDir: !opts.dryRun });
    const ticketPath = path.join(opts.cwd, ".arela", "tickets", `${id}.md`);
    const content = renderTicket(id, group, opts.cwd);

    if (!opts.dryRun) {
      await fs.ensureDir(path.dirname(ticketPath));
      await fs.writeFile(ticketPath, content, "utf8");
    }

    const files = buildFileList(group.violations);
    tickets.push({
      id,
      title: group.title,
      summary: group.summary,
      agent: group.agent,
      priority: group.priority,
      complexity: group.complexity,
      estimate: group.estimate,
      occurrences: group.violations.length,
      files,
      path: ticketPath,
      dryRun: Boolean(opts.dryRun),
    });
  }

  return tickets;
}

function buildTicketGroups(violations: Violation[]): TicketGroup[] {
  const groups = new Map<string, TicketGroup>();

  for (const violation of violations) {
    const key = getGroupKey(violation);
    const existing = groups.get(key);

    if (existing) {
      existing.violations.push(violation);
      continue;
    }

    const { agent, complexity, priority, estimate } = classifyViolation(violation);
    const { title, summary } = describeViolation(violation);

    groups.set(key, {
      key,
      title,
      summary,
      agent,
      priority,
      complexity,
      estimate,
      violations: [violation],
    });
  }

  return Array.from(groups.values());
}

function getGroupKey(violation: Violation): string {
  const basis = violation.ruleId?.toLowerCase() ?? normalizeText(violation.message);
  return `${violation.source || "general"}:${basis}`;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\d+/g, "{n}")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyViolation(violation: Violation): {
  agent: AgentName;
  complexity: TicketComplexity;
  priority: TicketPriority;
  estimate: string;
} {
  const text = `${violation.message} ${violation.ruleId ?? ""}`;

  if (COMPLEX_KEYWORDS.some((pattern) => pattern.test(text))) {
    return { agent: "claude", complexity: "complex", priority: "high", estimate: "1h" };
  }

  if (SIMPLE_KEYWORDS.some((pattern) => pattern.test(text))) {
    return { agent: "codex", complexity: "simple", priority: "medium", estimate: "30m" };
  }

  return { agent: "codex", complexity: "medium", priority: "medium", estimate: "45m" };
}

function describeViolation(violation: Violation): { title: string; summary: string } {
  const base = violation.message.split(/\r?\n/)[0]?.trim() || "Resolve violation";
  const clean = base.replace(/^Error\s*:/i, "").trim();
  const summary = clean.charAt(0).toUpperCase() + clean.slice(1);
  const title = violation.ruleId ? `Resolve ${violation.ruleId}` : summary;
  return { title, summary };
}

async function getNextTicketId(
  cwd: string,
  agent: AgentName,
  opts?: { ensureDir?: boolean },
): Promise<string> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  const shouldEnsure = opts?.ensureDir ?? true;
  const dirExists = await fs.pathExists(ticketsDir);
  const files = dirExists ? await glob("**/*.md", { cwd: ticketsDir, nodir: true }) : [];
  const prefix = agent.toUpperCase();
  const pattern = new RegExp(`^${prefix}-(\\d+)\\.md$`);
  let max = 0;

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (!Number.isNaN(value)) {
        max = Math.max(max, value);
      }
    }
  }

  if (!dirExists && shouldEnsure) {
    await fs.ensureDir(ticketsDir);
  }

  const next = String(max + 1).padStart(3, "0");
  return `${prefix}-${next}`;
}

function renderTicket(id: string, group: TicketGroup, cwd: string): string {
  const violationList = group.violations
    .map((violation, index) => formatViolationLine(index + 1, violation, cwd))
    .join("\n");

  const files = buildFileList(group.violations);
  const fileLine = files.length ? files.join(", ") : "(file not reported)";

  return [
    `# ${id}: ${group.title}`,
    "",
    `**Complexity:** ${group.complexity}`,
    `**Priority:** ${group.priority}`,
    `**Agent:** ${group.agent}`,
    `**Estimated time:** ${group.estimate}`,
    "",
    "## Summary",
    "",
    `${group.summary} (${group.violations.length} occurrence${group.violations.length === 1 ? "" : "s"}).`,
    "",
    "## Impact",
    "",
    `- Files: ${fileLine}`,
    `- Source: ${group.violations[0]?.source ?? "violation"}`,
    "",
    "## Violations",
    "",
    violationList || "- No detailed information provided",
    "",
    "## Acceptance Criteria",
    "",
    "- [ ] All listed violations are resolved",
    "- [ ] Relevant tests cover the regression",
    "",
  ].join("\n");
}

function formatViolationLine(index: number, violation: Violation, cwd: string): string {
  const relPath = violation.file ? normalizePath(violation.file, cwd) : "(unknown file)";
  const location = violation.line ? `${relPath}:${violation.line}` : relPath;
  const detail = violation.message;
  return `${index}. \`${location}\` - ${detail}`;
}

function normalizePath(target: string, cwd: string): string {
  const normalized = path.isAbsolute(target) ? path.relative(cwd, target) : target;
  return normalized.replace(/\\/g, "/");
}

function buildFileList(violations: Violation[]): string[] {
  const files = new Set<string>();
  for (const violation of violations) {
    if (!violation.file) {
      continue;
    }
    const withLine = violation.line ? `${violation.file}:${violation.line}` : violation.file;
    files.add(withLine.replace(/\\/g, "/"));
  }
  return Array.from(files);
}
