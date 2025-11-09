import { z } from "zod";

// Repo fingerprint types
export const TechStackSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  packageManagers: z.array(z.string()),
  databases: z.array(z.string()),
  infrastructure: z.array(z.string()),
});
export type TechStack = z.infer<typeof TechStackSchema>;

export const RepoFingerprintSchema = z.object({
  path: z.string(),
  name: z.string(),
  isMonorepo: z.boolean(),
  workspaces: z.array(z.string()).optional(),
  techStack: TechStackSchema,
  entrypoints: z.array(z.string()),
  hasCI: z.boolean(),
  hasDocker: z.boolean(),
});
export type RepoFingerprint = z.infer<typeof RepoFingerprintSchema>;

// Product understanding types
export const ProductProfileSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  users: z.array(z.string()).optional(),
  coreFlows: z.array(z.string()).optional(),
  externalServices: z.array(z.string()).optional(),
  complianceConstraints: z.array(z.string()).optional(),
});
export type ProductProfile = z.infer<typeof ProductProfileSchema>;

// Graph types
export const NodeTypeSchema = z.enum(["service", "repo", "db", "queue", "cache", "api"]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const EdgeKindSchema = z.enum(["runtime", "build", "dev", "docs"]);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  name: z.string(),
  path: z.string().optional(),
  url: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: EdgeKindSchema,
  label: z.string().optional(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const RepoGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  root: z.string(),
  ts: z.string(),
});
export type RepoGraph = z.infer<typeof RepoGraphSchema>;

// Audit types
export const SeveritySchema = z.enum(["critical", "high", "med", "low", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingSchema = z.object({
  id: z.string(),
  severity: SeveritySchema,
  category: z.string(),
  why: z.string(),
  evidence: z.array(z.string()),
  fix: z.string(),
  autoFixable: z.boolean().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const AuditReportSchema = z.object({
  summary: z.object({
    score: z.number(),
    sev0: z.number(),
    sev1: z.number(),
    sev2: z.number(),
    sev3: z.number(),
  }),
  findings: z.array(FindingSchema),
  ts: z.string(),
});
export type AuditReport = z.infer<typeof AuditReportSchema>;

// RAG index types
export interface DocumentChunk {
  id: string;
  content: string;
  file: string;
  startLine: number;
  endLine: number;
  type: "code" | "doc" | "config";
  language?: string;
  embedding?: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  distance: number;
}

export interface IndexStats {
  totalChunks: number;
  totalFiles: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
}

// Advisor types
export interface FixPatch {
  findingId: string;
  file: string;
  diff: string;
  description: string;
}

export interface AdvisoryReport {
  findings: Finding[];
  patches: FixPatch[];
  summary: string;
}
