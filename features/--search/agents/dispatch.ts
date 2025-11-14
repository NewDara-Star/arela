import fs from "fs-extra";
import path from "path";
import type { AgentName, TicketComplexity, DiscoveredAgent, AgentCapability, Ticket } from "../types.js";
import { loadTicketStatus, updateTicketStatus } from "./status.js";

interface DispatchConfig {
  cwd: string;
  agent?: AgentName;
  tickets?: string[];
  dryRun?: boolean;
}

/**
 * Get agent capabilities
 */
export function getAgentCapabilities(): Record<AgentName, AgentCapability> {
  return {
    codex: {
      name: "OpenAI Codex",
      command: "codex",
      costPer1kTokens: 0.002,
      bestFor: ["simple tasks", "CRUD operations", "boilerplate"],
      complexity: "simple",
      speed: "fast",
    },
    claude: {
      name: "Claude Sonnet",
      command: "claude",
      costPer1kTokens: 0.015,
      bestFor: ["complex tasks", "refactoring", "architecture"],
      complexity: "complex",
      speed: "medium",
    },
    deepseek: {
      name: "DeepSeek Coder",
      command: "deepseek",
      costPer1kTokens: 0.001,
      bestFor: ["coding tasks", "cost-sensitive work"],
      complexity: "medium",
      speed: "fast",
    },
    ollama: {
      name: "Ollama (Local)",
      command: "ollama",
      costPer1kTokens: 0,
      bestFor: ["offline work", "privacy-sensitive"],
      complexity: "simple",
      speed: "slow",
    },
    cascade: {
      name: "Windsurf Cascade",
      command: "windsurf",
      costPer1kTokens: 0,
      bestFor: ["IDE integration", "interactive work"],
      complexity: "complex",
      speed: "medium",
    },
  };
}

/**
 * Select best agent for ticket
 */
export function selectBestAgent(
  complexity: TicketComplexity | undefined,
  availableAgents: DiscoveredAgent[],
): AgentName {
  const capabilities = getAgentCapabilities();

  // Select based on complexity
  const complexityLevel = complexity || "medium";

  // Priority order based on complexity
  const priorities: Record<TicketComplexity, AgentName[]> = {
    simple: ["codex", "deepseek", "ollama", "claude"],
    medium: ["deepseek", "claude", "codex", "ollama"],
    complex: ["claude", "cascade", "deepseek"],
  };

  const priority = priorities[complexityLevel];

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
  return (availableAgents[0]?.command as AgentName) || "codex";
}

/**
 * Estimate cost for ticket
 */
export function estimateCost(
  estimatedTokens: number | undefined,
  agent: AgentName,
): { tokens: number; cost: number } {
  const capabilities = getAgentCapabilities();
  const agentCap = capabilities[agent];

  if (!agentCap) {
    return { tokens: estimatedTokens || 1000, cost: 0 };
  }

  const tokens = estimatedTokens || 1000;
  const cost = (tokens / 1000) * agentCap.costPer1kTokens;

  return { tokens, cost };
}

/**
 * Check if ticket dependencies are met
 */
export async function checkDependencies(
  cwd: string,
  ticketId: string,
  status: Record<string, any>,
): Promise<{ met: boolean; blocking: string[] }> {
  // For now, simplified implementation
  // Full implementation would parse ticket files and check dependencies
  return { met: true, blocking: [] };
}

/**
 * Dispatch tickets to agents
 */
export async function dispatchTickets(config: DispatchConfig): Promise<{
  dispatched: string[];
  blocked: string[];
  errors: string[];
}> {
  const { cwd, agent, tickets: ticketIds, dryRun } = config;

  const status = await loadTicketStatus(cwd);

  // Get tickets to dispatch
  let ticketsToDispatch: string[];

  if (ticketIds && ticketIds.length > 0) {
    ticketsToDispatch = ticketIds;
  } else {
    // Get all pending tickets (simplified for now)
    ticketsToDispatch = Object.keys(status).filter((id) => {
      const s = status[id];
      return !s || s.status === "pending";
    });
  }

  const dispatched: string[] = [];
  const blocked: string[] = [];
  const errors: string[] = [];

  console.log(`\n🚀 Dispatching ${ticketsToDispatch.length} ticket(s)...\n`);

  for (const ticketId of ticketsToDispatch) {
    try {
      // Check dependencies
      const deps = await checkDependencies(cwd, ticketId, status);

      if (!deps.met) {
        console.log(`⏸  ${ticketId}: Blocked by ${deps.blocking.join(", ")}`);
        blocked.push(ticketId);

        status[ticketId] = {
          ticketId,
          status: "blocked",
        };

        continue;
      }

      // Select agent
      const selectedAgent = agent || "claude";

      // Estimate cost
      const estimate = estimateCost(1000, selectedAgent);

      // Update status
      status[ticketId] = {
        ticketId,
        status: "pending",
        agent: selectedAgent,
        assignedAt: new Date().toISOString(),
        cost: estimate.cost,
      };

      console.log(`✓ ${ticketId}`);
      console.log(`  Agent: ${selectedAgent}`);
      console.log(`  Estimated: ${estimate.tokens} tokens, $${estimate.cost.toFixed(4)}`);
      console.log("");

      dispatched.push(ticketId);
    } catch (error) {
      const msg = `${ticketId}: ${(error as Error).message}`;
      console.log(`✗ ${msg}`);
      errors.push(msg);
    }
  }

  // Save status
  if (!dryRun) {
    await updateTicketStatus(cwd, "", status);
  }

  // Summary
  console.log("\n📊 Dispatch Summary\n");
  console.log(`✓ Dispatched: ${dispatched.length}`);

  if (blocked.length > 0) {
    console.log(`⏸  Blocked: ${blocked.length}`);
  }

  if (errors.length > 0) {
    console.log(`✗ Errors: ${errors.length}`);
  }

  // Calculate total cost
  const totalCost = dispatched.reduce((sum, id) => {
    return sum + (status[id]?.cost || 0);
  }, 0);

  console.log(`\nEstimated cost: $${totalCost.toFixed(4)}`);

  if (dryRun) {
    console.log("\n⚠️  Dry run - no changes saved");
  }

  console.log("");

  return { dispatched, blocked, errors };
}
