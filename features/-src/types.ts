/**
 * Core types for Arela v3.0
 */

export type AgentName = 'codex' | 'claude' | 'deepseek' | 'ollama' | 'cascade';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketComplexity = 'simple' | 'medium' | 'complex';
export type TicketStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

/**
 * RAG indexing failure tracking
 */
export type IndexingFailureType = 'too_large' | 'invalid_string' | 'timeout' | 'other';

export interface IndexingFailure {
  file: string;
  reason: string;
  size: number;
  type: IndexingFailureType;
}

/**
 * Discovered AI agent/model
 */
export interface DiscoveredAgent {
  name: string;
  command: string;
  available: boolean;
  type: 'cloud' | 'local' | 'ide';
  version?: string;
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  command: string;
  costPer1kTokens: number;
  bestFor: string[];
  complexity: TicketComplexity;
  speed: 'fast' | 'medium' | 'slow';
}

/**
 * Ticket definition (parsed from MD or YAML)
 */
export interface Ticket {
  id: string;
  title: string;
  description: string;
  agent: AgentName;
  priority: TicketPriority;
  complexity: TicketComplexity;
  status: TicketStatus;
  estimatedTime?: string;
  estimatedCost?: number;
  dependencies?: string[];
  tags?: string[];
  files?: Array<{
    path: string;
    action: 'create' | 'modify' | 'delete';
  }>;
  acceptance?: Array<{
    id: string;
    description: string;
    status: 'pending' | 'passed' | 'failed';
  }>;
}

/**
 * Ticket execution result
 */
export interface TicketResult {
  ticketId: string;
  status: TicketStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  output?: string;
  error?: string;
  cost?: number;
}

/**
 * Orchestration options
 */
export interface OrchestrationOptions {
  cwd: string;
  parallel?: boolean;
  maxParallel?: number;
  agent?: AgentName;
  tickets?: string[];  // Filter by specific ticket IDs (e.g., ["CODEX-001", "CODEX-002"])
  force?: boolean;
  dryRun?: boolean;
}
