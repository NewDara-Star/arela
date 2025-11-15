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
  /**
   * Optional: size of the on-disk index in bytes.
   * Used by Hexi-004 Vector Memory wrapper statistics.
   */
  indexSizeBytes?: number;
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
  /**
   * Optional: last modification time of the graph database (epoch ms).
   * Used by Hexi-005 Graph Memory wrapper statistics.
   */
  lastUpdatedAt?: number;
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

/**
 * Session Memory types (Layer 4 - Hexi-Memory)
 */

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface SessionMemoryData {
  sessionId: string;
  startTime: number;
  currentTask?: string;
  filesOpen: string[];
  conversationHistory: Message[];
  activeTicket?: string;
  context: Record<string, any>;
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  messagesCount: number;
  filesOpenCount: number;
  contextKeysCount: number;
  dbPath: string;
}

/**
 * Project Memory types (Layer 5 - Hexi-Memory)
 */

export interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  date: number;
  tags: string[];
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  examples: string[];
  frequency: number;
}

export interface Todo {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface ProjectMemoryData {
  projectId: string;
  projectPath: string;
  architecture?: string;
  techStack: string[];
  decisions: Decision[];
  patterns: Pattern[];
  todos: Todo[];
  conventions: Record<string, string>;
  metadata: Record<string, any>;
}

export interface ProjectStats {
  projectId: string;
  projectPath: string;
  architecture?: string;
  techStackCount: number;
  decisionsCount: number;
  patternsCount: number;
  todosCount: number;
  todosCompletedCount: number;
  conventionsCount: number;
  metadataCount: number;
  dbPath: string;
}

/**
 * User Memory types (Layer 6 - Hexi-Memory)
 */

export interface UserPreferences {
  language?: string; // "TypeScript"
  framework?: string; // "Next.js"
  testing?: string; // "Vitest"
  style?: string; // "Functional programming"
  editor?: string; // "VS Code"
  packageManager?: string; // "npm"
  [key: string]: string | undefined;
}

export interface Expertise {
  frontend?: 'beginner' | 'intermediate' | 'expert';
  backend?: 'beginner' | 'intermediate' | 'expert';
  devops?: 'beginner' | 'intermediate' | 'expert';
  mobile?: 'beginner' | 'intermediate' | 'expert';
  [key: string]: string | undefined;
}

export interface UserPattern {
  id: string;
  name: string;
  description: string;
  frequency: number; // Across all projects
  examples: string[];
  learnedFrom: string[]; // Project IDs
}

export interface ProjectRef {
  projectId: string;
  projectPath: string;
  lastAccessed: number;
  totalSessions: number;
}

export interface UserMemoryData {
  userId: string;
  preferences: UserPreferences;
  expertise: Expertise;
  patterns: UserPattern[];
  globalConventions: Record<string, string>;
  projectHistory: ProjectRef[];
  metadata: Record<string, any>;
}

export interface UserStats {
  userId: string;
  preferencesCount: number;
  expertiseCount: number;
  patternsCount: number;
  globalConventionsCount: number;
  projectHistoryCount: number;
  metadataCount: number;
  dbPath: string;
}
