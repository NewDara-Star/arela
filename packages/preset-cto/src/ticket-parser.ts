import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

export interface ParsedTicket {
  id: string;
  title?: string;
  complexity?: "simple" | "medium" | "complex";
  priority?: "low" | "medium" | "high" | "highest";
  agent?: string;
  dependencies?: string[];
  estimatedTokens?: number;
  estimatedTime?: string;
  estimatedCost?: string;
  context?: string;
  requirements?: string[];
  acceptance?: Array<{
    id?: string;
    description: string;
    status?: string;
    test?: string;
  }>;
  files?: Array<{
    path: string;
    action: string;
  }>;
  tags?: string[];
}

/**
 * Parse a markdown ticket file
 */
export async function parseMarkdownTicket(
  filePath: string,
): Promise<ParsedTicket> {
  const content = await fs.readFile(filePath, "utf-8");
  const fileName = path.basename(filePath, ".md");

  // Extract metadata from markdown
  const complexityMatch = content.match(/complexity:\s*(simple|medium|complex)/i);
  const priorityMatch = content.match(/priority:\s*(low|medium|high|highest)/i);
  const agentMatch = content.match(/agent:\s*(\w+)/i);
  const depsMatch = content.match(/depends on:\s*(.+)/i);
  const titleMatch = content.match(/^#\s+([^\n]+)/);

  const dependencies: string[] = [];
  if (depsMatch) {
    const depsStr = depsMatch[1];
    dependencies.push(...depsStr.split(/[,\s]+/).filter(Boolean));
  }

  // Estimate tokens based on content length
  const estimatedTokens = Math.ceil(content.length / 4);

  return {
    id: fileName,
    title: titleMatch?.[1]?.replace(/:\s*\w+.*$/i, "").trim(),
    complexity: complexityMatch?.[1] as any,
    priority: priorityMatch?.[1] as any,
    agent: agentMatch?.[1],
    dependencies,
    estimatedTokens,
  };
}

/**
 * Parse a YAML ticket file
 */
export async function parseYamlTicket(filePath: string): Promise<ParsedTicket> {
  const content = await fs.readFile(filePath, "utf-8");
  const parsed = YAML.parse(content);

  // Validate required fields
  if (!parsed.id) {
    throw new Error(`YAML ticket missing required 'id' field in ${filePath}`);
  }

  // Normalize dependencies
  let dependencies: string[] = [];
  if (parsed.dependencies) {
    if (Array.isArray(parsed.dependencies)) {
      dependencies = parsed.dependencies;
    } else if (typeof parsed.dependencies === "string") {
      dependencies = parsed.dependencies.split(/[,\s]+/).filter(Boolean);
    }
  }

  // Estimate tokens if not provided
  const estimatedTokens =
    parsed.estimated_cost || Math.ceil(content.length / 4);

  return {
    id: parsed.id,
    title: parsed.title,
    complexity: parsed.complexity,
    priority: parsed.priority,
    agent: parsed.agent,
    dependencies,
    estimatedTokens,
    estimatedTime: parsed.estimated_time,
    estimatedCost: parsed.estimated_cost,
    context: parsed.context,
    requirements: parsed.requirements,
    acceptance: parsed.acceptance,
    files: parsed.files,
    tags: parsed.tags,
  };
}

/**
 * Parse a ticket from either MD or YAML format
 */
export async function parseTicket(
  cwd: string,
  ticketId: string,
): Promise<ParsedTicket> {
  // Try YAML first
  const yamlPath = path.join(cwd, ".arela", "tickets", `${ticketId}.yaml`);
  if (await fs.pathExists(yamlPath)) {
    return parseYamlTicket(yamlPath);
  }

  // Fall back to markdown
  const mdPath = path.join(cwd, ".arela", "tickets", `${ticketId}.md`);
  if (await fs.pathExists(mdPath)) {
    return parseMarkdownTicket(mdPath);
  }

  throw new Error(`Ticket not found: ${ticketId}`);
}

/**
 * Get all ticket files (both MD and YAML)
 */
export async function getAllTicketFiles(ticketsDir: string): Promise<string[]> {
  if (!(await fs.pathExists(ticketsDir))) {
    return [];
  }

  const files = await fs.readdir(ticketsDir);
  return files
    .filter((f) => f.endsWith(".md") || f.endsWith(".yaml"))
    .map((f) =>
      f.endsWith(".yaml")
        ? path.basename(f, ".yaml")
        : path.basename(f, ".md"),
    );
}

/**
 * Get ticket file extension (md or yaml)
 */
export async function getTicketFileFormat(
  cwd: string,
  ticketId: string,
): Promise<"md" | "yaml"> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  const yamlPath = path.join(ticketsDir, `${ticketId}.yaml`);

  if (await fs.pathExists(yamlPath)) {
    return "yaml";
  }

  return "md";
}