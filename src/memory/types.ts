/**
 * Types shared by the Tri-Memory system.
 */

export interface SemanticResult {
  file: string;
  snippet: string;
  score: number;
}

export interface VectorStats {
  ready: boolean;
  filesIndexed: number;
  embeddings: number;
  model?: string;
  lastIndexedAt?: string;
  indexPath: string;
}

export interface DependencyEdge {
  file: string;
  reason: string;
  weight: number;
}

export interface ImpactAnalysis {
  file: string;
  exists: boolean;
  upstream: DependencyEdge[];
  downstream: DependencyEdge[];
  fanIn: number;
  fanOut: number;
}

export interface GraphStats {
  ready: boolean;
  files: number;
  imports: number;
  functions: number;
  functionCalls: number;
  apiEndpoints: number;
  apiCalls: number;
  dbPath: string;
}

export type AuditResult = "success" | "failure" | "pending";

export interface AuditEntry {
  timestamp?: string;
  agent: string;
  action: string;
  inputHash?: string;
  outputHash?: string;
  result: AuditResult;
  metadata?: Record<string, unknown>;
  commitHash?: string;
  ticketId?: string;
  policyViolations?: unknown[];
}

export interface AuditLogEntry extends AuditEntry {
  id: number;
  timestamp: string;
}

export interface AuditStats {
  ready: boolean;
  entries: number;
  success: number;
  failure: number;
  pending: number;
  agents: Record<string, number>;
  dbPath: string;
}

export interface AuditTrail {
  scope: "commit" | "ticket" | "all";
  filter?: string;
  entries: AuditLogEntry[];
}

export interface TriMemoryStats {
  vector: VectorStats;
  graph: GraphStats;
  audit: AuditStats;
}

export interface MemoryQueryResult {
  question: string;
  semantic: SemanticResult[];
  relatedFiles: string[];
  timestamp: string;
}

export interface TriMemoryInitOptions {
  refreshGraph?: boolean;
  refreshVector?: boolean;
  verbose?: boolean;
}
