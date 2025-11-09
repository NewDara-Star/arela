import pc from "picocolors";
import { discoverAllAgents } from "./discovery/index.js";
import { selectAgents } from "./routing/scorer.js";
import { getAdapter } from "./adapters/index.js";
import {
  ensureAgentDirs,
  saveRegistry,
  loadRegistry,
  saveGrants,
  loadGrants,
  saveTicket,
  loadTicket,
  saveAssignment,
  loadAssignment,
  createRunDir,
  listTickets,
  listRuns,
} from "./storage.js";
import type { Agent, Grant, Ticket, Assignment } from "./types.js";

/**
 * Scan for available agents
 */
export async function scanAgents(cwd: string): Promise<{
  agents: Agent[];
  errors: string[];
}> {
  await ensureAgentDirs(cwd);

  console.log(pc.cyan("Scanning for agents..."));

  const result = await discoverAllAgents(cwd);

  if (result.errors.length > 0) {
    console.log(pc.yellow("\nWarnings:"));
    for (const error of result.errors) {
      console.log(pc.dim(`  ${error}`));
    }
  }

  await saveRegistry(cwd, result.agents);

  console.log(pc.green(`\n✓ Found ${result.agents.length} agents`));
  console.log(pc.dim(`  Saved to .arela/agents/registry.json`));

  return result;
}

/**
 * Interactive grant management (simplified - real version would use inquirer)
 */
export async function grantAgents(cwd: string): Promise<Grant[]> {
  const agents = await loadRegistry(cwd);

  if (agents.length === 0) {
    console.log(pc.yellow("No agents found. Run 'arela agents scan' first."));
    return [];
  }

  console.log(pc.cyan("\nAgent Grant Configuration"));
  console.log(pc.dim("(In production, this would be an interactive TUI)\n"));

  // For now, create default grants
  const grants: Grant[] = agents.map((agent) => {
    const isLocal = agent.kind === "local";
    const isCloud = agent.kind === "cloud";

    return {
      agentId: agent.id,
      allow: true,
      scopes: isLocal
        ? ["read", "write"]
        : isCloud
          ? ["read", "write", "network", "repo:patch"]
          : ["read"],
      tokenRef: isCloud ? `env:${agent.id.split(":")[0].toUpperCase()}_API_KEY` : undefined,
    };
  });

  await saveGrants(cwd, grants);

  console.log(pc.green(`✓ Grants saved for ${grants.length} agents`));
  console.log(pc.dim(`  Saved to .arela/agents/grants.json\n`));

  for (const grant of grants) {
    const status = grant.allow ? pc.green("✓") : pc.red("✗");
    console.log(`${status} ${grant.agentId}`);
    console.log(pc.dim(`   Scopes: ${grant.scopes.join(", ")}`));
    if (grant.tokenRef) {
      console.log(pc.dim(`   Token: ${grant.tokenRef}`));
    }
  }

  return grants;
}

/**
 * List agents with their status
 */
export async function listAgents(cwd: string): Promise<void> {
  const agents = await loadRegistry(cwd);
  const grants = await loadGrants(cwd);
  const grantsMap = new Map(grants.map((g) => [g.agentId, g]));

  if (agents.length === 0) {
    console.log(pc.yellow("No agents found. Run 'arela agents scan' first."));
    return;
  }

  console.log(pc.bold("\nAgents Registry\n"));

  for (const agent of agents) {
    const grant = grantsMap.get(agent.id);
    const status = grant?.allow ? pc.green("✓") : pc.red("✗");

    console.log(`${status} ${pc.bold(agent.id)}`);
    console.log(pc.dim(`   Kind: ${agent.kind} | Transport: ${agent.transport}`));

    if (agent.model) {
      console.log(pc.dim(`   Model: ${agent.model}`));
    }

    const caps = agent.capabilities.map((c) => c.name).join(", ");
    console.log(pc.dim(`   Capabilities: ${caps}`));

    const scores = [
      `cost: ${(agent.costScore ?? 0.5).toFixed(2)}`,
      `speed: ${(agent.speedScore ?? 0.5).toFixed(2)}`,
      `quality: ${(agent.qualityScore ?? 0.5).toFixed(2)}`,
    ].join(" | ");
    console.log(pc.dim(`   Scores: ${scores}`));

    if (grant) {
      console.log(pc.dim(`   Scopes: ${grant.scopes.join(", ")}`));
    }

    console.log();
  }
}

/**
 * Create a ticket from natural language
 */
export async function planTicket(cwd: string, request: string): Promise<Ticket> {
  await ensureAgentDirs(cwd);

  const timestamp = new Date().toISOString().split("T")[0];
  const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

  // Simple parsing (in production, use LLM to structure this)
  const ticket: Ticket = {
    id,
    title: request.slice(0, 100),
    description: request,
    category: "feature", // Would be inferred
    priority: "p1", // Would be inferred
    acceptance: ["Implementation complete", "Tests passing"],
    createdAt: new Date().toISOString(),
  };

  await saveTicket(cwd, ticket);

  console.log(pc.green(`\n✓ Ticket created: ${ticket.id}`));
  console.log(pc.dim(`  Saved to .arela/tickets/${ticket.id}.json`));
  console.log();
  console.log(pc.bold(ticket.title));
  console.log(pc.dim(ticket.description));

  return ticket;
}

/**
 * Assign a ticket to an agent
 */
export async function assignTicket(cwd: string, ticketId: string): Promise<Assignment | null> {
  const ticket = await loadTicket(cwd, ticketId);
  if (!ticket) {
    console.log(pc.red(`Ticket not found: ${ticketId}`));
    return null;
  }

  const agents = await loadRegistry(cwd);
  const grants = await loadGrants(cwd);

  if (agents.length === 0) {
    console.log(pc.yellow("No agents found. Run 'arela agents scan' first."));
    return null;
  }

  console.log(pc.cyan(`\nAssigning ticket: ${ticket.id}`));
  console.log(pc.dim(ticket.title));

  const { primary, backups, scoreBreakdown } = selectAgents(agents, ticket, grants);

  if (!primary) {
    console.log(pc.red("\n✗ No suitable agent found"));
    console.log(pc.yellow("  Check grants and agent capabilities"));
    return null;
  }

  const assignment: Assignment = {
    ticketId: ticket.id,
    primary: primary.id,
    backups: backups.map((a) => a.id),
    scoreBreakdown,
    createdAt: new Date().toISOString(),
  };

  await saveAssignment(cwd, assignment);

  console.log(pc.green(`\n✓ Assigned to: ${primary.id}`));
  console.log(pc.dim(`  Score: ${scoreBreakdown[primary.id].toFixed(3)}`));

  if (backups.length > 0) {
    console.log(pc.dim(`  Backups: ${backups.map((a) => a.id).join(", ")}`));
  }

  console.log(pc.dim(`\n  Saved to .arela/assignments/${ticketId}.json`));

  return assignment;
}

/**
 * Execute a ticket
 */
export async function runTicket(
  cwd: string,
  ticketId: string,
  options: { dryRun?: boolean } = {}
): Promise<void> {
  const ticket = await loadTicket(cwd, ticketId);
  if (!ticket) {
    console.log(pc.red(`Ticket not found: ${ticketId}`));
    return;
  }

  const assignment = await loadAssignment(cwd, ticketId);
  if (!assignment) {
    console.log(pc.red(`No assignment found for ticket: ${ticketId}`));
    console.log(pc.yellow(`Run: arela assign ${ticketId}`));
    return;
  }

  const agents = await loadRegistry(cwd);
  const agent = agents.find((a) => a.id === assignment.primary);

  if (!agent) {
    console.log(pc.red(`Agent not found: ${assignment.primary}`));
    return;
  }

  const adapter = getAdapter(agent, ticket);
  if (!adapter) {
    console.log(pc.red(`No adapter available for agent: ${agent.id}`));
    return;
  }

  console.log(pc.cyan(`\nRunning ticket: ${ticket.id}`));
  console.log(pc.dim(`Agent: ${agent.id}`));
  if (options.dryRun) {
    console.log(pc.yellow(`Mode: DRY RUN`));
  }
  console.log();

  await createRunDir(cwd, ticketId);

  const result = await adapter.run({
    agent,
    ticket,
    cwd,
    dryRun: options.dryRun,
  });

  if (result.success) {
    console.log(pc.green(`\n✓ Run completed successfully`));

    if (result.patches && result.patches.length > 0) {
      console.log(pc.dim(`  Patches: ${result.patches.length}`));
      for (const patch of result.patches) {
        console.log(pc.dim(`    - ${patch.file}`));
      }
    }

    if (result.prUrl) {
      console.log(pc.dim(`  PR: ${result.prUrl}`));
    }
  } else {
    console.log(pc.red(`\n✗ Run failed`));
    if (result.error) {
      console.log(pc.red(`  Error: ${result.error}`));
    }
  }

  console.log(pc.dim(`\n  Log: ${result.logPath}`));
}

/**
 * List all tickets
 */
export async function listAllTickets(cwd: string): Promise<void> {
  const tickets = await listTickets(cwd);

  if (tickets.length === 0) {
    console.log(pc.yellow("No tickets found."));
    return;
  }

  console.log(pc.bold("\nTickets\n"));

  for (const ticket of tickets) {
    console.log(pc.bold(ticket.id));
    console.log(pc.dim(`  ${ticket.title}`));
    console.log(pc.dim(`  Category: ${ticket.category} | Priority: ${ticket.priority}`));
    console.log();
  }
}

/**
 * List all runs
 */
export async function listAllRuns(cwd: string): Promise<void> {
  const runs = await listRuns(cwd);

  if (runs.length === 0) {
    console.log(pc.yellow("No runs found."));
    return;
  }

  console.log(pc.bold("\nRuns\n"));

  for (const runId of runs) {
    console.log(pc.dim(`  ${runId}`));
  }
}
