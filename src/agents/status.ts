import fs from "fs-extra";
import path from "path";
import type { TicketStatus } from "../types.js";

export interface AgentStatus {
  ticketId: string;
  status: TicketStatus;
  agent?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  duration?: number;
  cost?: number;
  error?: string;
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
export async function loadTicketStatus(cwd: string): Promise<Record<string, AgentStatus>> {
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
  status: Record<string, AgentStatus>,
): Promise<void> {
  const statusFile = getStatusFilePath(cwd);
  await fs.ensureDir(path.dirname(statusFile));
  await fs.writeJson(statusFile, status, { spaces: 2 });
}

/**
 * Update status for a specific ticket
 */
export async function updateTicketStatus(
  cwd: string,
  ticketId: string,
  update: Partial<AgentStatus>,
): Promise<void> {
  const status = await loadTicketStatus(cwd);

  const existing = status[ticketId] || {
    ticketId,
    status: "pending",
  };

  status[ticketId] = {
    ...existing,
    ...update,
    ticketId,
  };

  await saveTicketStatus(cwd, status);
}

/**
 * Mark ticket as in progress
 */
export async function markInProgress(
  cwd: string,
  ticketId: string,
  agent: string,
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "in_progress",
    agent,
    startedAt: new Date().toISOString(),
  });
}

/**
 * Mark ticket as completed
 */
export async function markCompleted(
  cwd: string,
  ticketId: string,
  cost?: number,
  duration?: number,
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "completed",
    cost,
    duration,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Mark ticket as failed
 */
export async function markFailed(
  cwd: string,
  ticketId: string,
  error: string,
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "failed",
    error,
    failedAt: new Date().toISOString(),
  });
}

/**
 * Check if ticket can be run (not completed or in progress)
 */
export async function canRunTicket(
  cwd: string,
  ticketId: string,
  force = false,
): Promise<boolean> {
  if (force) return true;

  const status = await loadTicketStatus(cwd);
  const ticketStatus = status[ticketId];

  if (!ticketStatus) return true;

  return ticketStatus.status !== "completed" && ticketStatus.status !== "in_progress";
}

/**
 * Get status for a specific ticket
 */
export async function getTicketStatus(cwd: string, ticketId: string): Promise<AgentStatus | null> {
  const status = await loadTicketStatus(cwd);
  return status[ticketId] || null;
}

/**
 * Reset ticket status
 */
export async function resetTicket(cwd: string, ticketId: string): Promise<void> {
  const status = await loadTicketStatus(cwd);
  delete status[ticketId];
  await saveTicketStatus(cwd, status);
}

/**
 * Reset all tickets
 */
export async function resetAllTickets(cwd: string): Promise<void> {
  await saveTicketStatus(cwd, {});
}

/**
 * Show ticket status (for CLI)
 */
export async function showStatus(opts: { cwd: string; verbose?: boolean }): Promise<void> {
  const pc = await import("picocolors").then((m) => m.default);
  const status = await loadTicketStatus(opts.cwd);
  const tickets = Object.values(status);

  if (tickets.length === 0) {
    console.log(pc.yellow("\nNo tickets tracked yet.\n"));
    console.log(pc.gray("Run 'arela orchestrate' to execute tickets.\n"));
    return;
  }

  console.log(pc.bold(pc.cyan("\n📊 Ticket Status\n")));

  const byStatus: Record<TicketStatus, AgentStatus[]> = {
    pending: [],
    in_progress: [],
    completed: [],
    failed: [],
    blocked: [],
  };

  for (const ticket of tickets) {
    byStatus[ticket.status].push(ticket);
  }

  // Show summary
  console.log(pc.bold("Summary:"));
  console.log(pc.gray(`  Pending: ${byStatus.pending.length}`));
  console.log(pc.gray(`  In Progress: ${byStatus.in_progress.length}`));
  console.log(pc.green(`  Completed: ${byStatus.completed.length}`));
  console.log(pc.red(`  Failed: ${byStatus.failed.length}`));
  console.log(pc.yellow(`  Blocked: ${byStatus.blocked.length}`));
  console.log("");

  if (opts.verbose) {
    // Show detailed status
    for (const [statusKey, statusTickets] of Object.entries(byStatus)) {
      if (statusTickets.length === 0) continue;

      console.log(pc.bold(`${statusKey.toUpperCase()}:`));
      for (const ticket of statusTickets) {
        const icon = statusKey === "completed" ? "✅" : statusKey === "failed" ? "❌" : "⏳";
        console.log(`${icon} ${ticket.ticketId}`);
        if (ticket.agent) console.log(pc.gray(`   Agent: ${ticket.agent}`));
        if (ticket.duration) console.log(pc.gray(`   Duration: ${(ticket.duration / 1000).toFixed(1)}s`));
        if (ticket.cost) console.log(pc.gray(`   Cost: $${ticket.cost.toFixed(4)}`));
        if (ticket.error) console.log(pc.red(`   Error: ${ticket.error}`));
        console.log("");
      }
    }
  } else {
    console.log(pc.gray("Run with --verbose for detailed status\n"));
  }
}
