import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import YAML from "yaml";
import { ArelaRule, ArelaWorkflow } from "../schema.js";

function slugFromId(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function stripUndefined(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null),
  );
}

function renderFrontMatter(data: Record<string, unknown>): string {
  const yaml = YAML.stringify(stripUndefined(data)).trimEnd();
  return `---\n${yaml}\n---\n`;
}

export function readTemplateDir(): string {
  const dir = fileURLToPath(new URL("../../templates/.arela", import.meta.url));
  return dir;
}

export async function writeRule(
  cwd: string,
  rule: ArelaRule,
  opts?: { overwrite?: boolean; dryRun?: boolean },
): Promise<string> {
  const filename = `${slugFromId(rule.id || "rule") || "rule"}.md`;
  const filePath = path.join(cwd, ".arela", "rules", filename);
  if (!opts?.overwrite && (await fs.pathExists(filePath))) {
    return filePath;
  }
  const frontMatter = renderFrontMatter({
    id: rule.id,
    title: rule.title,
    version: rule.version ?? "1.0.0",
    priority: rule.priority,
    appliesTo: rule.appliesTo,
    tags: rule.tags,
  });
  const body = `${rule.body.trim()}\n`;
  if (!opts?.dryRun) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, `${frontMatter}\n${body}`);
  }
  return filePath;
}

export async function writeWorkflow(
  cwd: string,
  workflow: ArelaWorkflow,
  opts?: { overwrite?: boolean; dryRun?: boolean },
): Promise<string> {
  const filename = `${slugFromId(workflow.id || "workflow") || "workflow"}.prompt.md`;
  const filePath = path.join(cwd, ".arela", "workflows", filename);
  if (!opts?.overwrite && (await fs.pathExists(filePath))) {
    return filePath;
  }
  const frontMatter = renderFrontMatter({
    id: workflow.id,
    title: workflow.title,
    placeholders: workflow.placeholders,
  });
  const body = `${workflow.body.trim()}\n`;
  if (!opts?.dryRun) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, `${frontMatter}\n${body}`);
  }
  return filePath;
}
