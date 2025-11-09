import fs from "fs-extra";
import path from "path";
import { execa } from "execa";
import pc from "picocolors";
import {
  loadTicketStatus,
  markInProgress,
  markCompleted,
  markFailed,
  canRunTicket,
} from "./ticket-status.js";

export interface OrchestrationOptions {
  cwd: string;
  agent?: string;
  parallel?: boolean;
  force?: boolean;
  dryRun?: boolean;
  maxParallel?: number;
}

interface AgentConfig {
  name: string;
  command: string;
  enabled: boolean;
  cost_per_1k_tokens: number;
}

interface Ticket {
  id: string;
  path: string;
  agent: string;
}

/**
 * Load agent configuration
 */
async function loadAgentConfig(cwd: string): Promise<Record<string, AgentConfig>> {
  const configPath = path.join(cwd, ".arela/agents/config.json");
  
  if (!(await fs.pathExists(configPath))) {
    return {};
  }
  
  const config = await fs.readJSON(configPath);
  return config.agents || {};
}

/**
 * Discover all tickets
 */
async function discoverTickets(cwd: string, agentFilter?: string): Promise<Ticket[]> {
  const ticketsDir = path.join(cwd, ".arela/tickets");
  
  if (!(await fs.pathExists(ticketsDir))) {
    return [];
  }
  
  const tickets: Ticket[] = [];
  const agents = await fs.readdir(ticketsDir);
  
  for (const agent of agents) {
    if (agentFilter && agent !== agentFilter) continue;
    
    const agentDir = path.join(ticketsDir, agent);
    const stat = await fs.stat(agentDir);
    
    if (!stat.isDirectory()) continue;
    
    const files = await fs.readdir(agentDir);
    
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      if (file.startsWith("EXAMPLE-")) continue;
      
      const ticketId = file.replace(".md", "");
      tickets.push({
        id: ticketId,
        path: path.join(agentDir, file),
        agent,
      });
    }
  }
  
  return tickets;
}

/**
 * Run a single ticket
 */
async function runTicket(
  ticket: Ticket,
  agentConfig: AgentConfig,
  cwd: string,
  dryRun: boolean
): Promise<{ success: boolean; duration: number; cost: number }> {
  const startTime = Date.now();
  
  if (dryRun) {
    console.log(pc.gray(`  [DRY RUN] Would run ${ticket.id}`));
    return { success: true, duration: 0, cost: 0 };
  }
  
  // Create log directory
  const logDir = path.join(cwd, "logs", ticket.agent);
  await fs.ensureDir(logDir);
  const logPath = path.join(logDir, `${ticket.id}.log`);
  
  // Mark as in progress
  await markInProgress(cwd, ticket.id, ticket.agent);
  
  console.log(pc.blue(`  ▶ Running ${ticket.id}...`));
  
  try {
    // Read ticket content
    const ticketContent = await fs.readFile(ticket.path, "utf-8");
    
    // Parse agent command
    const command = agentConfig.command;
    const [cmd, ...args] = command.split(" ");
    
    // Run agent
    const result = await execa(cmd, args, {
      cwd,
      input: ticketContent,
      timeout: 30 * 60 * 1000, // 30 minutes
    });
    
    // Save log
    await fs.writeFile(logPath, result.stdout + "\n" + result.stderr);
    
    // Calculate duration and cost (rough estimate)
    const duration = Date.now() - startTime;
    const estimatedTokens = ticketContent.length / 4; // Rough estimate
    const cost = (estimatedTokens / 1000) * agentConfig.cost_per_1k_tokens;
    
    // Mark as completed
    await markCompleted(cwd, ticket.id, cost, duration);
    
    console.log(pc.green(`  ✓ Completed ${ticket.id} in ${(duration / 1000).toFixed(1)}s`));
    
    return { success: true, duration, cost };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Save error log
    await fs.writeFile(logPath, errorMessage);
    
    // Mark as failed
    await markFailed(cwd, ticket.id, errorMessage, logPath);
    
    console.log(pc.red(`  ✗ Failed ${ticket.id}: ${errorMessage}`));
    
    return { success: false, duration, cost: 0 };
  }
}

/**
 * Run tickets in parallel with concurrency limit
 */
async function runTicketsParallel(
  tickets: Ticket[],
  agentConfigs: Record<string, AgentConfig>,
  cwd: string,
  dryRun: boolean,
  maxParallel: number
): Promise<void> {
  const results: Array<{ success: boolean; duration: number; cost: number }> = [];
  const queue = [...tickets];
  const running: Promise<void>[] = [];
  
  while (queue.length > 0 || running.length > 0) {
    // Start new tasks up to maxParallel
    while (running.length < maxParallel && queue.length > 0) {
      const ticket = queue.shift()!;
      const agentConfig = agentConfigs[ticket.agent];
      
      if (!agentConfig || !agentConfig.enabled) {
        console.log(pc.yellow(`  ⊘ Skipping ${ticket.id} (agent not configured)`));
        continue;
      }
      
      const task = runTicket(ticket, agentConfig, cwd, dryRun).then((result) => {
        results.push(result);
      });
      
      running.push(task);
    }
    
    // Wait for at least one to complete
    if (running.length > 0) {
      await Promise.race(running);
      // Remove completed tasks
      for (let i = running.length - 1; i >= 0; i--) {
        const settled = await Promise.race([
          running[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) {
          running.splice(i, 1);
        }
      }
    }
  }
}

/**
 * Run tickets sequentially
 */
async function runTicketsSequential(
  tickets: Ticket[],
  agentConfigs: Record<string, AgentConfig>,
  cwd: string,
  dryRun: boolean
): Promise<void> {
  for (const ticket of tickets) {
    const agentConfig = agentConfigs[ticket.agent];
    
    if (!agentConfig || !agentConfig.enabled) {
      console.log(pc.yellow(`  ⊘ Skipping ${ticket.id} (agent not configured)`));
      continue;
    }
    
    await runTicket(ticket, agentConfig, cwd, dryRun);
  }
}

/**
 * Main orchestration function
 */
export async function orchestrate(options: OrchestrationOptions): Promise<void> {
  const { cwd, agent, parallel = false, force = false, dryRun = false, maxParallel = 5 } = options;
  
  console.log(pc.bold(pc.cyan("\n🚀 Arela Multi-Agent Orchestration\n")));
  
  // Load agent configurations
  const agentConfigs = await loadAgentConfig(cwd);
  
  if (Object.keys(agentConfigs).length === 0) {
    console.log(pc.yellow("No agent configurations found"));
    console.log(pc.gray("Run: npx arela init"));
    return;
  }
  
  // Discover tickets
  const allTickets = await discoverTickets(cwd, agent);
  
  if (allTickets.length === 0) {
    console.log(pc.yellow("No tickets found"));
    console.log(pc.gray("Create tickets in .arela/tickets/{agent}/"));
    return;
  }
  
  // Filter tickets that can run
  const runnableTickets: Ticket[] = [];
  
  for (const ticket of allTickets) {
    if (await canRunTicket(cwd, ticket.id, force)) {
      runnableTickets.push(ticket);
    } else {
      console.log(pc.gray(`  ⊘ Skipping ${ticket.id} (already completed)`));
    }
  }
  
  if (runnableTickets.length === 0) {
    console.log(pc.yellow("No tickets to run (all completed)"));
    console.log(pc.gray("Use --force to re-run completed tickets"));
    return;
  }
  
  console.log(pc.bold(`Found ${runnableTickets.length} ticket(s) to run\n`));
  
  // Group by agent
  const ticketsByAgent: Record<string, Ticket[]> = {};
  for (const ticket of runnableTickets) {
    if (!ticketsByAgent[ticket.agent]) {
      ticketsByAgent[ticket.agent] = [];
    }
    ticketsByAgent[ticket.agent].push(ticket);
  }
  
  // Show summary
  for (const [agentName, tickets] of Object.entries(ticketsByAgent)) {
    console.log(pc.bold(`  ${agentName}: ${tickets.length} ticket(s)`));
  }
  console.log("");
  
  if (dryRun) {
    console.log(pc.yellow("DRY RUN MODE - No tickets will actually run\n"));
  }
  
  // Run tickets
  const startTime = Date.now();
  
  if (parallel) {
    console.log(pc.gray(`Running in parallel (max ${maxParallel} concurrent)...\n`));
    await runTicketsParallel(runnableTickets, agentConfigs, cwd, dryRun, maxParallel);
  } else {
    console.log(pc.gray("Running sequentially...\n"));
    await runTicketsSequential(runnableTickets, agentConfigs, cwd, dryRun);
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Show final status
  console.log(pc.bold(pc.cyan("\n✨ Orchestration Complete!\n")));
  console.log(pc.gray(`Total time: ${(totalDuration / 1000).toFixed(1)}s`));
  console.log(pc.gray("\nView status: npx arela status --verbose"));
  console.log(pc.gray("View logs: ls -la logs/\n"));
}
