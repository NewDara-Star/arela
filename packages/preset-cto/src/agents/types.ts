import { z } from "zod";

// Capability types
export const CapabilityNameSchema = z.enum([
  "plan",
  "codegen",
  "refactor",
  "tests",
  "doc",
  "search",
  "edit",
]);
export type CapabilityName = z.infer<typeof CapabilityNameSchema>;

export const CapabilitySchema = z.object({
  name: CapabilityNameSchema,
  strengths: z.array(z.string()).optional(),
});
export type Capability = z.infer<typeof CapabilitySchema>;

// Agent types
export const AgentKindSchema = z.enum(["local", "cloud", "ide"]);
export type AgentKind = z.infer<typeof AgentKindSchema>;

export const TransportSchema = z.enum(["http", "cli", "ipc"]);
export type Transport = z.infer<typeof TransportSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  kind: AgentKindSchema,
  transport: TransportSchema,
  endpoint: z.string().optional(),
  model: z.string().optional(),
  capabilities: z.array(CapabilitySchema),
  costScore: z.number().min(0).max(1).optional(),
  speedScore: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

// Grant types
export const ScopeSchema = z.enum(["read", "write", "network", "repo:patch", "open-pr"]);
export type Scope = z.infer<typeof ScopeSchema>;

export const GrantSchema = z.object({
  agentId: z.string(),
  allow: z.boolean(),
  scopes: z.array(ScopeSchema),
  tokenRef: z.string().optional(),
});
export type Grant = z.infer<typeof GrantSchema>;

// Ticket types
export const TicketCategorySchema = z.enum(["bug", "feature", "refactor", "docs"]);
export type TicketCategory = z.infer<typeof TicketCategorySchema>;

export const TicketPrioritySchema = z.enum(["p0", "p1", "p2"]);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  files: z.array(z.string()).optional(),
  stack: z.array(z.string()).optional(),
  category: TicketCategorySchema,
  acceptance: z.array(z.string()),
  priority: TicketPrioritySchema,
  createdAt: z.string(),
});
export type Ticket = z.infer<typeof TicketSchema>;

// Assignment types
export const AssignmentSchema = z.object({
  ticketId: z.string(),
  primary: z.string(),
  backups: z.array(z.string()),
  scoreBreakdown: z.record(z.number()),
  createdAt: z.string(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

// Registry types
export const AgentRegistrySchema = z.object({
  agents: z.array(AgentSchema),
  ts: z.string(),
});
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;

export const GrantsFileSchema = z.array(GrantSchema);
export type GrantsFile = z.infer<typeof GrantsFileSchema>;

// Run result types
export interface PatchResult {
  file: string;
  diff: string;
}

export interface RunResult {
  success: boolean;
  patches?: PatchResult[];
  prUrl?: string;
  logPath: string;
  error?: string;
}

// Adapter interface
export interface AgentAdapter {
  canRun(agent: Agent, ticket: Ticket): boolean;
  run(params: {
    agent: Agent;
    ticket: Ticket;
    cwd: string;
    dryRun?: boolean;
  }): Promise<RunResult>;
}

// Discovery result
export interface DiscoveryResult {
  agents: Agent[];
  errors: string[];
}
