import fs from "fs-extra";
import path from "path";

export interface TicketStatus {
  status: "open" | "in_progress" | "completed" | "failed";
  updated_at: string;
  agent?: string;
  cost?: number;
  duration_ms?: number;
  started_at?: string;
  error?: string;
  log_path?: string;
}

export interface StatusSummary {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  failed: number;
  total_cost: number;
  estimated_remaining_cost: number;
}

export interface TicketStatusFile {
  tickets: Record<string, TicketStatus>;
  summary: StatusSummary;
  last_updated: string | null;
}

const STATUS_FILE = ".arela/tickets/.ticket-status.json";

/**
 * Load ticket status from file
 */
export async function loadTicketStatus(cwd: string): Promise<TicketStatusFile> {
  const statusPath = path.join(cwd, STATUS_FILE);
  
  if (!(await fs.pathExists(statusPath))) {
    return {
      tickets: {},
      summary: {
        total: 0,
        open: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        total_cost: 0,
        estimated_remaining_cost: 0,
      },
      last_updated: null,
    };
  }

  return await fs.readJSON(statusPath);
}

/**
 * Save ticket status to file
 */
export async function saveTicketStatus(
  cwd: string,
  status: TicketStatusFile
): Promise<void> {
  const statusPath = path.join(cwd, STATUS_FILE);
  await fs.ensureDir(path.dirname(statusPath));
  
  // Update summary
  status.summary = calculateSummary(status.tickets);
  status.last_updated = new Date().toISOString();
  
  await fs.writeJSON(statusPath, status, { spaces: 2 });
}

/**
 * Get status for a specific ticket
 */
export async function getTicketStatus(
  cwd: string,
  ticketId: string
): Promise<TicketStatus | null> {
  const status = await loadTicketStatus(cwd);
  return status.tickets[ticketId] || null;
}

/**
 * Update status for a specific ticket
 */
export async function updateTicketStatus(
  cwd: string,
  ticketId: string,
  update: Partial<TicketStatus>
): Promise<void> {
  const status = await loadTicketStatus(cwd);
  
  const existing = status.tickets[ticketId] || {
    status: "open",
    updated_at: new Date().toISOString(),
  };
  
  status.tickets[ticketId] = {
    ...existing,
    ...update,
    updated_at: new Date().toISOString(),
  };
  
  await saveTicketStatus(cwd, status);
}

/**
 * Mark ticket as in progress
 */
export async function markInProgress(
  cwd: string,
  ticketId: string,
  agent: string
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "in_progress",
    agent,
    started_at: new Date().toISOString(),
  });
}

/**
 * Mark ticket as completed
 */
export async function markCompleted(
  cwd: string,
  ticketId: string,
  cost?: number,
  durationMs?: number
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "completed",
    cost,
    duration_ms: durationMs,
  });
}

/**
 * Mark ticket as failed
 */
export async function markFailed(
  cwd: string,
  ticketId: string,
  error: string,
  logPath?: string
): Promise<void> {
  await updateTicketStatus(cwd, ticketId, {
    status: "failed",
    error,
    log_path: logPath,
  });
}

/**
 * Check if ticket can be run (not completed or in progress)
 */
export async function canRunTicket(
  cwd: string,
  ticketId: string,
  force = false
): Promise<boolean> {
  if (force) return true;
  
  const ticketStatus = await getTicketStatus(cwd, ticketId);
  if (!ticketStatus) return true;
  
  return ticketStatus.status !== "completed" && ticketStatus.status !== "in_progress";
}

/**
 * Reset ticket status
 */
export async function resetTicket(cwd: string, ticketId: string): Promise<void> {
  const status = await loadTicketStatus(cwd);
  delete status.tickets[ticketId];
  await saveTicketStatus(cwd, status);
}

/**
 * Reset all tickets
 */
export async function resetAllTickets(cwd: string): Promise<void> {
  const status = await loadTicketStatus(cwd);
  status.tickets = {};
  await saveTicketStatus(cwd, status);
}

/**
 * Get tickets by status
 */
export async function getTicketsByStatus(
  cwd: string,
  statusFilter: TicketStatus["status"]
): Promise<string[]> {
  const status = await loadTicketStatus(cwd);
  return Object.entries(status.tickets)
    .filter(([, ticket]) => ticket.status === statusFilter)
    .map(([id]) => id);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(tickets: Record<string, TicketStatus>): StatusSummary {
  const summary: StatusSummary = {
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    total_cost: 0,
    estimated_remaining_cost: 0,
  };
  
  for (const ticket of Object.values(tickets)) {
    summary.total++;
    summary[ticket.status]++;
    
    if (ticket.cost) {
      summary.total_cost += ticket.cost;
    }
  }
  
  return summary;
}

/**
 * Get status report as formatted string
 */
export async function getStatusReport(cwd: string): Promise<string> {
  const status = await loadTicketStatus(cwd);
  const { summary } = status;
  
  let report = "# Ticket Status Report\n\n";
  report += `**Total:** ${summary.total}\n`;
  report += `**Open:** ${summary.open}\n`;
  report += `**In Progress:** ${summary.in_progress}\n`;
  report += `**Completed:** ${summary.completed}\n`;
  report += `**Failed:** ${summary.failed}\n\n`;
  report += `**Total Cost:** $${summary.total_cost.toFixed(3)}\n`;
  
  if (summary.failed > 0) {
    report += "\n## Failed Tickets\n\n";
    for (const [id, ticket] of Object.entries(status.tickets)) {
      if (ticket.status === "failed") {
        report += `- **${id}**\n`;
        report += `  - Error: ${ticket.error}\n`;
        if (ticket.log_path) {
          report += `  - Log: ${ticket.log_path}\n`;
        }
      }
    }
  }
  
  return report;
}
