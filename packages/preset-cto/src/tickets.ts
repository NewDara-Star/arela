import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { glob } from "glob";
import { loadTicketStatus, parseTicket, checkDependencies, type TicketStatus } from "./dispatch.js";
import { getAllTicketFiles } from "./ticket-parser.js";

export interface TicketNode {
  id: string;
  status: string;
  agent?: string;
  dependencies: string[];
  children: TicketNode[];
}

/**
 * Build dependency tree
 */
export async function buildDependencyTree(cwd: string): Promise<TicketNode[]> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");

  if (!(await fs.pathExists(ticketsDir))) {
    return [];
  }

  const ticketIds = await getAllTicketFiles(ticketsDir);
  
  const status = await loadTicketStatus(cwd);
  
  // Parse all tickets
  const tickets = await Promise.all(
    ticketIds.map(async (id) => {
      const ticket = await parseTicket(cwd, id);
      const ticketStatus = status[id];
      
      return {
        id,
        status: ticketStatus?.status || "pending",
        agent: ticketStatus?.agent || ticket.agent,
        dependencies: ticket.dependencies || [],
        children: [] as TicketNode[],
      };
    }),
  );
  
  // Build tree
  const ticketMap = new Map(tickets.map((t) => [t.id, t]));
  const roots: TicketNode[] = [];
  
  for (const ticket of tickets) {
    if (ticket.dependencies.length === 0) {
      roots.push(ticket);
    } else {
      // Add as child to dependencies
      for (const depId of ticket.dependencies) {
        const parent = ticketMap.get(depId);
        if (parent) {
          parent.children.push(ticket);
        }
      }
    }
  }
  
  return roots;
}

/**
 * Print dependency tree
 */
function printTree(node: TicketNode, prefix = "", isLast = true): void {
  const connector = isLast ? "└─" : "├─";
  const statusIcon = {
    completed: pc.green("✅"),
    in_progress: pc.cyan("⏳"),
    pending: pc.gray("📋"),
    failed: pc.red("❌"),
    blocked: pc.yellow("⏸ "),
  }[node.status] || pc.gray("📋");
  
  const statusText = {
    completed: pc.green("Complete"),
    in_progress: pc.cyan("In Progress"),
    pending: pc.gray("Pending"),
    failed: pc.red("Failed"),
    blocked: pc.yellow("Blocked"),
  }[node.status] || pc.gray("Pending");
  
  console.log(`${prefix}${connector} ${statusIcon} ${pc.bold(node.id)} (${statusText})`);
  
  if (node.agent) {
    const agentPrefix = prefix + (isLast ? "   " : "│  ");
    console.log(`${agentPrefix}${pc.gray(`Agent: ${node.agent}`)}`);
  }
  
  const childPrefix = prefix + (isLast ? "   " : "│  ");
  
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const childIsLast = i === node.children.length - 1;
    printTree(child, childPrefix, childIsLast);
  }
}

/**
 * Show dependency graph
 */
export async function showDependencyGraph(cwd: string): Promise<void> {
  console.log(pc.bold(pc.cyan("\n📊 Ticket Dependency Graph\n")));
  
  const tree = await buildDependencyTree(cwd);
  
  if (tree.length === 0) {
    console.log(pc.yellow("No tickets found."));
    console.log(pc.gray("\nCreate tickets in .arela/tickets/\n"));
    return;
  }
  
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const isLast = i === tree.length - 1;
    printTree(node, "", isLast);
    
    if (!isLast) {
      console.log("");
    }
  }
  
  console.log("");
}

/**
 * Show next available tickets
 */
export async function showNextTickets(cwd: string): Promise<void> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");

  if (!(await fs.pathExists(ticketsDir))) {
    console.log(pc.yellow("\nNo tickets found.\n"));
    return;
  }

  const ticketIds = await getAllTicketFiles(ticketsDir);
  
  const status = await loadTicketStatus(cwd);
  
  const available: string[] = [];
  const blocked: Array<{ id: string; blocking: string[] }> = [];
  
  for (const ticketId of ticketIds) {
    const ticketStatus = status[ticketId];
    
    // Skip if already completed or in progress
    if (ticketStatus?.status === "completed" || ticketStatus?.status === "in_progress") {
      continue;
    }
    
    // Check dependencies
    const deps = await checkDependencies(cwd, ticketId, status);
    
    if (deps.met) {
      available.push(ticketId);
    } else {
      blocked.push({ id: ticketId, blocking: deps.blocking });
    }
  }
  
  console.log(pc.bold(pc.cyan("\n📋 Next Available Tickets\n")));
  
  if (available.length === 0) {
    console.log(pc.yellow("No tickets available to start."));
    
    if (blocked.length > 0) {
      console.log(pc.gray("\nAll tickets are blocked by dependencies."));
    }
  } else {
    console.log(pc.bold("Available to start:\n"));
    
    for (let i = 0; i < available.length; i++) {
      const ticketId = available[i];
      const ticket = await parseTicket(cwd, ticketId);
      
      console.log(pc.green(`${i + 1}. ${ticketId}`));
      
      if (ticket.complexity) {
        console.log(pc.gray(`   Complexity: ${ticket.complexity}`));
      }
      
      if (ticket.priority) {
        console.log(pc.gray(`   Priority: ${ticket.priority}`));
      }
      
      if (ticket.agent) {
        console.log(pc.gray(`   Suggested agent: ${ticket.agent}`));
      }
      
      console.log("");
    }
  }
  
  if (blocked.length > 0) {
    console.log(pc.bold("Blocked:\n"));
    
    for (const { id, blocking } of blocked) {
      console.log(pc.yellow(`⏸  ${id}`));
      console.log(pc.gray(`   Waiting for: ${blocking.join(", ")}`));
      console.log("");
    }
  }
  
  if (available.length > 0) {
    console.log(pc.gray("Dispatch with: npx arela dispatch --auto"));
  }
  
  console.log("");
}

/**
 * Show ticket statistics
 */
export async function showTicketStats(cwd: string): Promise<void> {
  const ticketsDir = path.join(cwd, ".arela", "tickets");

  if (!(await fs.pathExists(ticketsDir))) {
    console.log(pc.yellow("\nNo tickets found.\n"));
    return;
  }

  const ticketIds = await getAllTicketFiles(ticketsDir);
  
  const status = await loadTicketStatus(cwd);
  
  const stats = {
    total: ticketIds.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    failed: 0,
    blocked: 0,
    byAgent: {} as Record<string, number>,
    totalCost: 0,
    totalTokens: 0,
  };
  
  for (const ticketId of ticketIds) {
    const ticketStatus = status[ticketId];
    
    if (!ticketStatus) {
      stats.pending++;
      continue;
    }
    
    switch (ticketStatus.status) {
      case "completed":
        stats.completed++;
        break;
      case "in_progress":
        stats.inProgress++;
        break;
      case "pending":
        stats.pending++;
        break;
      case "failed":
        stats.failed++;
        break;
      case "blocked":
        stats.blocked++;
        break;
    }
    
    if (ticketStatus.agent) {
      stats.byAgent[ticketStatus.agent] = (stats.byAgent[ticketStatus.agent] || 0) + 1;
    }
    
    if (ticketStatus.cost) {
      stats.totalCost += ticketStatus.cost;
    }
    
    if (ticketStatus.tokens) {
      stats.totalTokens += ticketStatus.tokens;
    }
  }
  
  console.log(pc.bold(pc.cyan("\n📊 Ticket Statistics\n")));
  
  console.log(pc.bold("Status:"));
  console.log(pc.green(`  ✅ Completed: ${stats.completed}`));
  console.log(pc.cyan(`  ⏳ In Progress: ${stats.inProgress}`));
  console.log(pc.gray(`  📋 Pending: ${stats.pending}`));
  
  if (stats.blocked > 0) {
    console.log(pc.yellow(`  ⏸  Blocked: ${stats.blocked}`));
  }
  
  if (stats.failed > 0) {
    console.log(pc.red(`  ❌ Failed: ${stats.failed}`));
  }
  
  console.log(pc.bold(`\nTotal: ${stats.total} tickets`));
  
  if (Object.keys(stats.byAgent).length > 0) {
    console.log(pc.bold("\nBy Agent:"));
    
    for (const [agent, count] of Object.entries(stats.byAgent)) {
      console.log(pc.gray(`  ${agent}: ${count}`));
    }
  }
  
  if (stats.totalCost > 0) {
    console.log(pc.bold("\nCost:"));
    console.log(pc.gray(`  Total: $${stats.totalCost.toFixed(4)}`));
    console.log(pc.gray(`  Tokens: ${stats.totalTokens.toLocaleString()}`));
  }
  
  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  console.log(pc.bold(`\nCompletion: ${completionRate.toFixed(1)}%`));
  
  console.log("");
}
