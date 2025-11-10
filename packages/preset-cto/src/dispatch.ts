import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { glob } from "glob";
import { discoverAgents, generateAgentConfig, type DiscoveredAgent } from "./agent-discovery.js";

export interface TicketStatus {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  agent?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  duration?: number;
  cost?: number;
  tokens?: number;
  error?: string;
  dependencies?: string[];
}

export interface DispatchConfig {
  cwd: string;
  agent?: string;
  tickets?: string[];
  auto?: boolean;
  dryRun?: boolean;
}

export interface AgentCapability {
  name: string;
  command: string;
  costPer1kTokens: number;
  bestFor: string[];
  complexity: "simple" | "medium" | "complex";
  speed: "fast" | "medium" | "slow";
}

/**
 * Get ticket status file path
 */
function getStatusFilePath(cwd: string): string {
  return path.join(cwd, ".arela", ".ticket-status.json");
}

/**
 * Load ticket status
 */
export async function loadTicketStatus(cwd: string): Promise<Record<string, TicketStatus>> {
  const statusFile = getStatusFilePath(cwd);
  
  if (!(await fs.pathExists(statusFile))) {
    return {};
  }
  
  try {
    return await fs.readJson(statusFile);
  } catch {
    return {};
  }
}

/**
 * Save ticket status
 */
export async function saveTicketStatus(
  cwd: string,
  status: Record<string, TicketStatus>,
): Promise<void> {
  const statusFile = getStatusFilePath(cwd);
  await fs.ensureDir(path.dirname(statusFile));
  await fs.writeJson(statusFile, status, { spaces: 2 });
}

/**
 * Get all tickets in .arela/tickets/
 */
export async function getAllTickets(cwd: string): Promise<string[]> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");
  
  if (!(await fs.pathExists(ticketsDir))) {
    return [];
  }
  
  const files = await glob("*.md", { cwd: ticketsDir });
  return files.map((f) => path.basename(f, ".md"));
}

/**
 * Parse ticket to extract metadata
 */
export async function parseTicket(cwd: string, ticketId: string): Promise<{
  id: string;
  complexity?: "simple" | "medium" | "complex";
  priority?: "low" | "medium" | "high" | "highest";
  agent?: string;
  dependencies?: string[];
  estimatedTokens?: number;
}> {
  const ticketPath = path.join(cwd, ".arela", "tickets", `${ticketId}.md`);
  
  if (!(await fs.pathExists(ticketPath))) {
    throw new Error(`Ticket not found: ${ticketId}`);
  }
  
  const content = await fs.readFile(ticketPath, "utf-8");
  
  // Extract metadata from ticket
  const complexityMatch = content.match(/complexity:\s*(simple|medium|complex)/i);
  const priorityMatch = content.match(/priority:\s*(low|medium|high|highest)/i);
  const agentMatch = content.match(/agent:\s*(\w+)/i);
  const depsMatch = content.match(/depends on:\s*(.+)/i);
  
  const dependencies: string[] = [];
  if (depsMatch) {
    const depsStr = depsMatch[1];
    dependencies.push(...depsStr.split(/[,\s]+/).filter(Boolean));
  }
  
  // Estimate tokens based on content length
  const estimatedTokens = Math.ceil(content.length / 4);
  
  return {
    id: ticketId,
    complexity: complexityMatch?.[1] as any,
    priority: priorityMatch?.[1] as any,
    agent: agentMatch?.[1],
    dependencies,
    estimatedTokens,
  };
}

/**
 * Get agent capabilities
 */
export function getAgentCapabilities(): Record<string, AgentCapability> {
  return {
    codex: {
      name: "OpenAI Codex",
      command: "codex",
      costPer1kTokens: 0.002,
      bestFor: ["simple tasks", "CRUD operations", "boilerplate", "quick fixes"],
      complexity: "simple",
      speed: "fast",
    },
    "openai": {
      name: "OpenAI GPT-4o",
      command: "codex",
      costPer1kTokens: 0.005,
      bestFor: ["medium tasks", "feature implementation", "testing"],
      complexity: "medium",
      speed: "fast",
    },
    claude: {
      name: "Claude Sonnet",
      command: "claude",
      costPer1kTokens: 0.015,
      bestFor: ["complex tasks", "refactoring", "architecture", "deep reasoning"],
      complexity: "complex",
      speed: "medium",
    },
    deepseek: {
      name: "DeepSeek Coder",
      command: "deepseek",
      costPer1kTokens: 0.001,
      bestFor: ["coding tasks", "cost-sensitive work", "batch processing"],
      complexity: "medium",
      speed: "fast",
    },
    ollama: {
      name: "Ollama (Local)",
      command: "ollama",
      costPer1kTokens: 0,
      bestFor: ["offline work", "privacy-sensitive", "unlimited usage"],
      complexity: "simple",
      speed: "slow",
    },
    cascade: {
      name: "Windsurf Cascade",
      command: "windsurf",
      costPer1kTokens: 0,
      bestFor: ["IDE integration", "interactive work", "complex refactoring"],
      complexity: "complex",
      speed: "medium",
    },
  };
}

/**
 * Select best agent for ticket
 */
export function selectBestAgent(
  ticket: Awaited<ReturnType<typeof parseTicket>>,
  availableAgents: DiscoveredAgent[],
): string {
  const capabilities = getAgentCapabilities();
  
  // If ticket specifies an agent, use that
  if (ticket.agent) {
    return ticket.agent;
  }
  
  // Select based on complexity
  const complexity = ticket.complexity || "medium";
  
  // Priority order based on complexity
  const priorities: Record<string, string[]> = {
    simple: ["codex", "deepseek", "openai", "ollama", "claude"],
    medium: ["openai", "deepseek", "claude", "codex", "ollama"],
    complex: ["claude", "cascade", "openai", "deepseek"],
  };
  
  const priority = priorities[complexity] || priorities.medium;
  
  // Find first available agent in priority order
  for (const agentKey of priority) {
    const isAvailable = availableAgents.some((a) => {
      const name = a.name.toLowerCase();
      return (
        name.includes(agentKey) ||
        a.command === agentKey ||
        (agentKey === "cascade" && name.includes("windsurf"))
      );
    });
    
    if (isAvailable) {
      return agentKey;
    }
  }
  
  // Fallback to first available
  return availableAgents[0]?.command || "codex";
}

/**
 * Estimate cost for ticket
 */
export function estimateCost(
  ticket: Awaited<ReturnType<typeof parseTicket>>,
  agent: string,
): { tokens: number; cost: number } {
  const capabilities = getAgentCapabilities();
  const agentCap = capabilities[agent];
  
  if (!agentCap) {
    return { tokens: ticket.estimatedTokens || 1000, cost: 0 };
  }
  
  const tokens = ticket.estimatedTokens || 1000;
  const cost = (tokens / 1000) * agentCap.costPer1kTokens;
  
  return { tokens, cost };
}

/**
 * Check if ticket dependencies are met
 */
export async function checkDependencies(
  cwd: string,
  ticketId: string,
  status: Record<string, TicketStatus>,
): Promise<{ met: boolean; blocking: string[] }> {
  const ticket = await parseTicket(cwd, ticketId);
  
  if (!ticket.dependencies || ticket.dependencies.length === 0) {
    return { met: true, blocking: [] };
  }
  
  const blocking: string[] = [];
  
  for (const depId of ticket.dependencies) {
    const depStatus = status[depId];
    
    if (!depStatus || depStatus.status !== "completed") {
      blocking.push(depId);
    }
  }
  
  return { met: blocking.length === 0, blocking };
}

/**
 * Dispatch tickets to agents
 */
export async function dispatchTickets(config: DispatchConfig): Promise<{
  dispatched: string[];
  blocked: string[];
  errors: string[];
}> {
  const { cwd, agent, tickets: ticketIds, auto, dryRun } = config;
  
  const status = await loadTicketStatus(cwd);
  const availableAgents = await discoverAgents();
  
  if (availableAgents.length === 0) {
    throw new Error("No agents available. Run 'npx arela agents' to see installation instructions.");
  }
  
  // Get tickets to dispatch
  let ticketsToDispatch: string[];
  
  if (ticketIds && ticketIds.length > 0) {
    ticketsToDispatch = ticketIds;
  } else {
    // Get all pending tickets
    const allTickets = await getAllTickets(cwd);
    ticketsToDispatch = allTickets.filter((id) => {
      const s = status[id];
      return !s || s.status === "pending";
    });
  }
  
  const dispatched: string[] = [];
  const blocked: string[] = [];
  const errors: string[] = [];
  
  console.log(pc.cyan(`\n🚀 Dispatching ${ticketsToDispatch.length} ticket(s)...\n`));
  
  for (const ticketId of ticketsToDispatch) {
    try {
      // Check dependencies
      const deps = await checkDependencies(cwd, ticketId, status);
      
      if (!deps.met) {
        console.log(pc.yellow(`⏸  ${ticketId}: Blocked by ${deps.blocking.join(", ")}`));
        blocked.push(ticketId);
        
        status[ticketId] = {
          id: ticketId,
          status: "blocked",
          dependencies: deps.blocking,
        };
        
        continue;
      }
      
      // Parse ticket
      const ticket = await parseTicket(cwd, ticketId);
      
      // Select agent
      const selectedAgent = auto
        ? selectBestAgent(ticket, availableAgents)
        : agent || ticket.agent || selectBestAgent(ticket, availableAgents);
      
      // Estimate cost
      const estimate = estimateCost(ticket, selectedAgent);
      
      // Update status
      status[ticketId] = {
        id: ticketId,
        status: "pending",
        agent: selectedAgent,
        assignedAt: new Date().toISOString(),
        tokens: estimate.tokens,
        cost: estimate.cost,
      };
      
      console.log(pc.green(`✓ ${ticketId}`));
      console.log(pc.gray(`  Agent: ${selectedAgent}`));
      console.log(pc.gray(`  Complexity: ${ticket.complexity || "medium"}`));
      console.log(pc.gray(`  Estimated: ${estimate.tokens} tokens, $${estimate.cost.toFixed(4)}`));
      console.log("");
      
      dispatched.push(ticketId);
    } catch (error) {
      const msg = `${ticketId}: ${(error as Error).message}`;
      console.log(pc.red(`✗ ${msg}`));
      errors.push(msg);
    }
  }
  
  // Save status
  if (!dryRun) {
    await saveTicketStatus(cwd, status);
  }
  
  // Summary
  console.log(pc.bold(pc.cyan("\n📊 Dispatch Summary\n")));
  console.log(pc.green(`✓ Dispatched: ${dispatched.length}`));
  
  if (blocked.length > 0) {
    console.log(pc.yellow(`⏸  Blocked: ${blocked.length}`));
  }
  
  if (errors.length > 0) {
    console.log(pc.red(`✗ Errors: ${errors.length}`));
  }
  
  // Calculate total cost
  const totalCost = dispatched.reduce((sum, id) => {
    return sum + (status[id]?.cost || 0);
  }, 0);
  
  console.log(pc.gray(`\nEstimated cost: $${totalCost.toFixed(4)}`));
  
  if (dryRun) {
    console.log(pc.yellow("\n⚠️  Dry run - no changes saved"));
  }
  
  console.log("");
  
  return { dispatched, blocked, errors };
}

/**
 * Show agent status
 */
export async function showAgentStatus(cwd: string, agent?: string): Promise<void> {
  const status = await loadTicketStatus(cwd);
  const tickets = Object.values(status);
  
  if (tickets.length === 0) {
    console.log(pc.yellow("\nNo tickets dispatched yet."));
    console.log(pc.gray("Run: npx arela dispatch --auto\n"));
    return;
  }
  
  // Filter by agent if specified
  const filteredTickets = agent
    ? tickets.filter((t) => t.agent === agent)
    : tickets;
  
  if (filteredTickets.length === 0) {
    console.log(pc.yellow(`\nNo tickets for agent: ${agent}\n`));
    return;
  }
  
  // Group by agent
  const byAgent: Record<string, TicketStatus[]> = {};
  
  for (const ticket of filteredTickets) {
    const agentKey = ticket.agent || "unassigned";
    if (!byAgent[agentKey]) {
      byAgent[agentKey] = [];
    }
    byAgent[agentKey].push(ticket);
  }
  
  console.log(pc.bold(pc.cyan("\n📊 Agent Status\n")));
  
  for (const [agentKey, agentTickets] of Object.entries(byAgent)) {
    const capabilities = getAgentCapabilities();
    const agentCap = capabilities[agentKey];
    
    console.log(pc.bold(pc.green(`${agentCap?.name || agentKey}`)));
    console.log("");
    
    const completed = agentTickets.filter((t) => t.status === "completed");
    const inProgress = agentTickets.filter((t) => t.status === "in_progress");
    const pending = agentTickets.filter((t) => t.status === "pending");
    const failed = agentTickets.filter((t) => t.status === "failed");
    const blocked = agentTickets.filter((t) => t.status === "blocked");
    
    for (const ticket of completed) {
      console.log(pc.green(`✅ ${ticket.id}: Complete`));
      if (ticket.duration) {
        console.log(pc.gray(`   Duration: ${Math.round(ticket.duration / 1000)}s`));
      }
      if (ticket.cost) {
        console.log(pc.gray(`   Cost: $${ticket.cost.toFixed(4)}`));
      }
    }
    
    for (const ticket of inProgress) {
      const elapsed = ticket.startedAt
        ? Math.round((Date.now() - new Date(ticket.startedAt).getTime()) / 1000)
        : 0;
      console.log(pc.cyan(`⏳ ${ticket.id}: In Progress (${elapsed}s elapsed)`));
    }
    
    for (const ticket of pending) {
      console.log(pc.gray(`📋 ${ticket.id}: Pending`));
    }
    
    for (const ticket of failed) {
      console.log(pc.red(`❌ ${ticket.id}: Failed`));
      if (ticket.error) {
        console.log(pc.gray(`   Error: ${ticket.error}`));
      }
    }
    
    for (const ticket of blocked) {
      console.log(pc.yellow(`⏸  ${ticket.id}: Blocked`));
      if (ticket.dependencies) {
        console.log(pc.gray(`   Waiting for: ${ticket.dependencies.join(", ")}`));
      }
    }
    
    console.log("");
    
    // Summary
    const totalCost = agentTickets.reduce((sum, t) => sum + (t.cost || 0), 0);
    const totalTokens = agentTickets.reduce((sum, t) => sum + (t.tokens || 0), 0);
    
    console.log(pc.gray(`Total: ${agentTickets.length} tickets`));
    console.log(pc.gray(`Cost: $${totalCost.toFixed(4)} (${totalTokens.toLocaleString()} tokens)`));
    console.log("");
  }
}
