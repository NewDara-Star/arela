import path from "path";
import fs from "fs-extra";
import type {
  Agent,
  AgentRegistry,
  Grant,
  GrantsFile,
  Ticket,
  Assignment,
} from "./types.js";

const AGENTS_DIR = ".arela/agents";
const TICKETS_DIR = ".arela/tickets";
const ASSIGNMENTS_DIR = ".arela/assignments";
const RUNS_DIR = ".arela/runs";

export async function ensureAgentDirs(cwd: string): Promise<void> {
  const dirs = [
    path.join(cwd, AGENTS_DIR),
    path.join(cwd, AGENTS_DIR, "adapters"),
    path.join(cwd, TICKETS_DIR),
    path.join(cwd, ASSIGNMENTS_DIR),
    path.join(cwd, RUNS_DIR),
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

// Registry
export async function saveRegistry(cwd: string, agents: Agent[]): Promise<void> {
  const registry: AgentRegistry = {
    agents,
    ts: new Date().toISOString(),
  };

  const registryPath = path.join(cwd, AGENTS_DIR, "registry.json");
  await fs.writeJson(registryPath, registry, { spaces: 2 });
}

export async function loadRegistry(cwd: string): Promise<Agent[]> {
  const registryPath = path.join(cwd, AGENTS_DIR, "registry.json");
  
  if (!(await fs.pathExists(registryPath))) {
    return [];
  }

  const registry = await fs.readJson(registryPath);
  return registry.agents || [];
}

// Grants
export async function saveGrants(cwd: string, grants: Grant[]): Promise<void> {
  const grantsPath = path.join(cwd, AGENTS_DIR, "grants.json");
  await fs.writeJson(grantsPath, grants, { spaces: 2 });
}

export async function loadGrants(cwd: string): Promise<Grant[]> {
  const grantsPath = path.join(cwd, AGENTS_DIR, "grants.json");
  
  if (!(await fs.pathExists(grantsPath))) {
    return [];
  }

  return await fs.readJson(grantsPath);
}

// Tickets
export async function saveTicket(cwd: string, ticket: Ticket): Promise<string> {
  const ticketPath = path.join(cwd, TICKETS_DIR, `${ticket.id}.json`);
  await fs.writeJson(ticketPath, ticket, { spaces: 2 });
  return ticketPath;
}

export async function loadTicket(cwd: string, ticketId: string): Promise<Ticket | null> {
  const ticketPath = path.join(cwd, TICKETS_DIR, `${ticketId}.json`);
  
  if (!(await fs.pathExists(ticketPath))) {
    return null;
  }

  return await fs.readJson(ticketPath);
}

export async function listTickets(cwd: string): Promise<Ticket[]> {
  const ticketsDir = path.join(cwd, TICKETS_DIR);
  
  if (!(await fs.pathExists(ticketsDir))) {
    return [];
  }

  const files = await fs.readdir(ticketsDir);
  const tickets: Ticket[] = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      const ticketPath = path.join(ticketsDir, file);
      const ticket = await fs.readJson(ticketPath);
      tickets.push(ticket);
    }
  }

  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Assignments
export async function saveAssignment(cwd: string, assignment: Assignment): Promise<string> {
  const assignmentPath = path.join(cwd, ASSIGNMENTS_DIR, `${assignment.ticketId}.json`);
  await fs.writeJson(assignmentPath, assignment, { spaces: 2 });
  return assignmentPath;
}

export async function loadAssignment(cwd: string, ticketId: string): Promise<Assignment | null> {
  const assignmentPath = path.join(cwd, ASSIGNMENTS_DIR, `${ticketId}.json`);
  
  if (!(await fs.pathExists(assignmentPath))) {
    return null;
  }

  return await fs.readJson(assignmentPath);
}

// Runs
export async function createRunDir(cwd: string, ticketId: string): Promise<string> {
  const runDir = path.join(cwd, RUNS_DIR, ticketId);
  await fs.ensureDir(runDir);
  await fs.ensureDir(path.join(runDir, "patches"));
  return runDir;
}

export async function saveRunLog(cwd: string, ticketId: string, log: string): Promise<string> {
  const logPath = path.join(cwd, RUNS_DIR, ticketId, "run.log");
  await fs.writeFile(logPath, log);
  return logPath;
}

export async function appendRunLog(cwd: string, ticketId: string, line: string): Promise<void> {
  const logPath = path.join(cwd, RUNS_DIR, ticketId, "run.log");
  await fs.appendFile(logPath, line + "\n");
}

export async function listRuns(cwd: string): Promise<string[]> {
  const runsDir = path.join(cwd, RUNS_DIR);
  
  if (!(await fs.pathExists(runsDir))) {
    return [];
  }

  const dirs = await fs.readdir(runsDir);
  const runs: string[] = [];

  for (const dir of dirs) {
    const dirPath = path.join(runsDir, dir);
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      runs.push(dir);
    }
  }

  return runs.sort().reverse();
}
