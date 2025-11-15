import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import type { Ticket, TicketComplexity, TicketPriority } from "../types.js";
import { getDefaultCompressor } from "../compression/index.js";

const defaultCompressor = getDefaultCompressor();

/**
 * Parse a markdown ticket file
 */
export async function parseMarkdownTicket(filePath: string): Promise<Partial<Ticket>> {
  const content = await fs.readFile(filePath, "utf-8");
  const fileName = path.basename(filePath, ".md");

  // Extract metadata from markdown
  const complexityMatch = content.match(/complexity:\s*(simple|medium|complex)/i);
  const priorityMatch = content.match(/priority:\s*(low|medium|high|critical)/i);
  const agentMatch = content.match(/agent:\s*(\w+)/i);
  const depsMatch = content.match(/depends on:\s*(.+)/i);
  const titleMatch = content.match(/^#\s+([^\n]+)/);

  const dependencies: string[] = [];
  if (depsMatch) {
    const depsStr = depsMatch[1];
    dependencies.push(...depsStr.split(/[,\s]+/).filter(Boolean));
  }

  // Estimate tokens using compression abstraction (rough estimate)
  const estimatedTokens = defaultCompressor.getTokenCount(content);

  return {
    id: fileName,
    title: titleMatch?.[1]?.replace(/:\s*\w+.*$/i, "").trim(),
    complexity: complexityMatch?.[1] as TicketComplexity | undefined,
    priority: priorityMatch?.[1] as TicketPriority | undefined,
    agent: agentMatch?.[1] as any,
    dependencies,
    estimatedCost: (estimatedTokens / 1000) * 0.015, // Rough estimate
  };
}

/**
 * Parse a YAML ticket file
 */
export async function parseYamlTicket(filePath: string): Promise<Partial<Ticket>> {
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
    parsed.estimatedCost ?? defaultCompressor.getTokenCount(content);

  return {
    id: parsed.id,
    title: parsed.title,
    description: parsed.description,
    complexity: parsed.complexity,
    priority: parsed.priority,
    agent: parsed.agent,
    status: parsed.status,
    dependencies,
    estimatedTime: parsed.estimatedTime,
    estimatedCost: (estimatedTokens / 1000) * 0.015,
    tags: parsed.tags,
    files: parsed.files,
    acceptance: parsed.acceptance,
  };
}

/**
 * Parse a ticket from either MD or YAML format
 */
export async function parseTicket(cwd: string, ticketId: string): Promise<Partial<Ticket>> {
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

  const tickets: string[] = [];
  const agents = await fs.readdir(ticketsDir);

  for (const agent of agents) {
    const agentDir = path.join(ticketsDir, agent);
    const stat = await fs.stat(agentDir);

    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(agentDir);
    for (const file of files) {
      if (file.endsWith(".md") || file.endsWith(".yaml")) {
        const ticketId = file.replace(/\.(md|yaml)$/, "");
        tickets.push(ticketId);
      }
    }
  }

  return tickets;
}

/**
 * Get ticket file extension (md or yaml)
 */
export async function getTicketFileFormat(cwd: string, ticketId: string): Promise<"md" | "yaml"> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  const yamlPath = path.join(ticketsDir, `${ticketId}.yaml`);

  if (await fs.pathExists(yamlPath)) {
    return "yaml";
  }

  return "md";
}
