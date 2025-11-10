import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import pc from "picocolors";
import { parseMarkdownTicket, getAllTicketFiles } from "./ticket-parser.js";
import { validateTicket } from "./ticket-schema.js";

export interface MigrationResult {
  converted: number;
  skipped: number;
  errors: Array<{
    ticket: string;
    error: string;
  }>;
}

/**
 * Convert markdown ticket to YAML format
 */
async function convertMarkdownToYaml(
  mdPath: string,
): Promise<{
  id: string;
  yaml: string;
}> {
  const ticket = await parseMarkdownTicket(mdPath);

  // Read original content to extract additional sections
  const content = await fs.readFile(mdPath, "utf-8");

  // Extract context section
  const contextMatch = content.match(
    /##\s+Context\s+([\s\S]*?)(?=##\s+|\Z)/i,
  );
  const context = contextMatch?.[1]?.trim();

  // Extract requirements section
  const requirementsMatch = content.match(
    /##\s+Requirements\s+([\s\S]*?)(?=##\s+|\Z)/i,
  );
  let requirements: string[] = [];
  if (requirementsMatch) {
    const reqText = requirementsMatch[1];
    requirements = reqText
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.trim().replace(/^-\s*/, ""));
  }

  // Extract acceptance criteria section
  const acceptanceMatch = content.match(
    /##\s+Acceptance Criter[ia]+\s+([\s\S]*?)(?=##\s+|\Z)/i,
  );
  let acceptance: Array<{
    id?: string;
    description: string;
    status?: string;
    test?: string;
  }> = [];
  if (acceptanceMatch) {
    const acText = acceptanceMatch[1];
    const items = acText.split(/\n-\s*\[/);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.trim()) continue;

      // Try to parse checkbox format: - [ ] description
      const checkboxMatch = item.match(/\s*\]\s*(.+?)(?:\n|$)/);
      const description = checkboxMatch?.[1] || item.trim();

      if (description) {
        acceptance.push({
          id: `ac-${i + 1}`,
          description,
          status: "pending",
        });
      }
    }
  }

  // Extract files section
  const filesMatch = content.match(
    /##\s+Files?\s+([\s\S]*?)(?=##\s+|\Z)/i,
  );
  let files: Array<{ path: string; action: string }> = [];
  if (filesMatch) {
    const filesText = filesMatch[1];
    const fileLines = filesText
      .split("\n")
      .filter((line) => line.trim().startsWith("-"));

    for (const line of fileLines) {
      const match = line.match(/-\s*`([^`]+)`\s*:\s*(\w+)/);
      if (match) {
        files.push({
          path: match[1],
          action: match[2].toLowerCase(),
        });
      }
    }
  }

  // Extract tags section
  const tagsMatch = content.match(/##\s+Tags?\s+([\s\S]*?)(?=##\s+|\Z)/i);
  let tags: string[] = [];
  if (tagsMatch) {
    const tagsText = tagsMatch[1];
    tags = tagsText
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith("-"));
  }

  // Build YAML object
  const yamlObj: Record<string, unknown> = {
    id: ticket.id,
    title: ticket.title,
  };

  if (ticket.agent) {
    yamlObj.agent = ticket.agent;
  }

  if (ticket.priority) {
    yamlObj.priority = ticket.priority;
  }

  if (ticket.complexity) {
    yamlObj.complexity = ticket.complexity;
  }

  if (ticket.estimatedTokens) {
    yamlObj.estimated_tokens = ticket.estimatedTokens;
  }

  if (context) {
    yamlObj.context = context;
  }

  if (requirements.length > 0) {
    yamlObj.requirements = requirements;
  }

  if (acceptance.length > 0) {
    yamlObj.acceptance = acceptance;
  }

  if (files.length > 0) {
    yamlObj.files = files;
  }

  if (ticket.dependencies && ticket.dependencies.length > 0) {
    yamlObj.dependencies = ticket.dependencies;
  }

  if (tags.length > 0) {
    yamlObj.tags = tags;
  }

  // Validate the resulting ticket
  const validation = validateTicket(yamlObj);
  if (!validation.valid) {
    throw new Error(
      `Validation failed: ${validation.errors.join("; ")}`,
    );
  }

  // Convert to YAML
  const yaml = YAML.stringify(yamlObj, { lineWidth: 0 });

  return {
    id: ticket.id,
    yaml,
  };
}

/**
 * Migrate tickets from markdown to YAML format
 */
export async function migrateTicketsToYaml(
  cwd: string,
  options: {
    dryRun?: boolean;
    verbose?: boolean;
  } = {},
): Promise<MigrationResult> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  const result: MigrationResult = {
    converted: 0,
    skipped: 0,
    errors: [],
  };

  if (!(await fs.pathExists(ticketsDir))) {
    if (options.verbose) {
      console.log(pc.yellow("No tickets directory found."));
    }
    return result;
  }

  // Get all ticket files
  const ticketIds = await getAllTicketFiles(ticketsDir);

  if (options.verbose) {
    console.log(pc.cyan(`\n📦 Migrating ${ticketIds.length} tickets...\n`));
  }

  for (const ticketId of ticketIds) {
    try {
      const mdPath = path.join(ticketsDir, `${ticketId}.md`);
      const yamlPath = path.join(ticketsDir, `${ticketId}.yaml`);

      // Skip if already converted
      if (await fs.pathExists(yamlPath)) {
        if (options.verbose) {
          console.log(pc.gray(`⊘ ${ticketId}: Already in YAML format`));
        }
        result.skipped++;
        continue;
      }

      // Skip if no markdown file
      if (!(await fs.pathExists(mdPath))) {
        if (options.verbose) {
          console.log(pc.yellow(`⚠️  ${ticketId}: No markdown file found`));
        }
        result.skipped++;
        continue;
      }

      // Convert markdown to YAML
      const { yaml } = await convertMarkdownToYaml(mdPath);

      if (!options.dryRun) {
        await fs.writeFile(yamlPath, yaml, "utf-8");
      }

      if (options.verbose) {
        const action = options.dryRun ? "would convert" : "✓ Converted";
        console.log(pc.green(`${action} ${ticketId}`));
      }

      result.converted++;
    } catch (error) {
      const msg = (error as Error).message;
      if (options.verbose) {
        console.log(pc.red(`✗ ${ticketId}: ${msg}`));
      }
      result.errors.push({
        ticket: ticketId,
        error: msg,
      });
    }
  }

  return result;
}

/**
 * Migrate tickets from YAML back to markdown format (reverse migration)
 */
export async function migrateTicketsToMarkdown(
  cwd: string,
  options: {
    dryRun?: boolean;
    verbose?: boolean;
  } = {},
): Promise<MigrationResult> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  const result: MigrationResult = {
    converted: 0,
    skipped: 0,
    errors: [],
  };

  if (!(await fs.pathExists(ticketsDir))) {
    if (options.verbose) {
      console.log(pc.yellow("No tickets directory found."));
    }
    return result;
  }

  // Get all ticket files
  const ticketIds = await getAllTicketFiles(ticketsDir);

  if (options.verbose) {
    console.log(pc.cyan(`\n📦 Migrating ${ticketIds.length} tickets to Markdown...\n`));
  }

  for (const ticketId of ticketIds) {
    try {
      const yamlPath = path.join(ticketsDir, `${ticketId}.yaml`);
      const mdPath = path.join(ticketsDir, `${ticketId}.md`);

      // Skip if already converted to markdown
      if (await fs.pathExists(mdPath)) {
        if (options.verbose) {
          console.log(pc.gray(`⊘ ${ticketId}: Already in Markdown format`));
        }
        result.skipped++;
        continue;
      }

      // Skip if no YAML file
      if (!(await fs.pathExists(yamlPath))) {
        if (options.verbose) {
          console.log(pc.yellow(`⚠️  ${ticketId}: No YAML file found`));
        }
        result.skipped++;
        continue;
      }

      // Convert YAML to Markdown
      const yamlContent = await fs.readFile(yamlPath, "utf-8");
      const ticket = YAML.parse(yamlContent);

      let mdContent = `# ${ticket.id}: ${ticket.title}\n\n`;

      if (ticket.complexity) {
        mdContent += `**Complexity:** ${ticket.complexity}\n`;
      }

      if (ticket.priority) {
        mdContent += `**Priority:** ${ticket.priority}\n`;
      }

      if (ticket.agent) {
        mdContent += `**Agent:** ${ticket.agent}\n`;
      }

      if (ticket.context) {
        mdContent += `\n## Context\n\n${ticket.context}\n`;
      }

      if (ticket.requirements && ticket.requirements.length > 0) {
        mdContent += `\n## Requirements\n\n`;
        for (const req of ticket.requirements) {
          mdContent += `- ${req}\n`;
        }
      }

      if (ticket.acceptance && ticket.acceptance.length > 0) {
        mdContent += `\n## Acceptance Criteria\n\n`;
        for (const ac of ticket.acceptance) {
          mdContent += `- [ ] ${ac.description}\n`;
        }
      }

      if (ticket.files && ticket.files.length > 0) {
        mdContent += `\n## Files\n\n`;
        for (const file of ticket.files) {
          mdContent += `- \`${file.path}\`: ${file.action}\n`;
        }
      }

      if (ticket.dependencies && ticket.dependencies.length > 0) {
        mdContent += `\n**Depends on:** ${ticket.dependencies.join(", ")}\n`;
      }

      if (ticket.tags && ticket.tags.length > 0) {
        mdContent += `\n## Tags\n\n${ticket.tags.join(", ")}\n`;
      }

      if (!options.dryRun) {
        await fs.writeFile(mdPath, mdContent, "utf-8");
      }

      if (options.verbose) {
        const action = options.dryRun ? "would convert" : "✓ Converted";
        console.log(pc.green(`${action} ${ticketId}`));
      }

      result.converted++;
    } catch (error) {
      const msg = (error as Error).message;
      if (options.verbose) {
        console.log(pc.red(`✗ ${ticketId}: ${msg}`));
      }
      result.errors.push({
        ticket: ticketId,
        error: msg,
      });
    }
  }

  return result;
}
