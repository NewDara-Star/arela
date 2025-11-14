/**
 * Types for architecture analysis
 */

export type ArchitectureType = 'horizontal' | 'vertical' | 'hybrid';

export interface ArchitectureScore {
  horizontal: number; // 0-100, higher = more horizontal
  vertical: number; // 0-100, higher = more vertical
}

export interface CouplingCohesionScores {
  coupling: number; // 0-100, lower = better (less coupled)
  cohesion: number; // 0-100, higher = better (more cohesive)
}

export interface RepoAnalysis {
  name: string;
  path: string;
  architecture: ArchitectureType;
  scores: ArchitectureScore;
  metrics: CouplingCohesionScores;
  directories: DirectoryAnalysis[];
  issues: ArchitectureIssue[];
}

export interface DirectoryAnalysis {
  path: string;
  type: DirectoryType;
  fileCount: number;
  internalImports: number; // imports within this directory
  externalImports: number; // imports from outside this directory
  importedBy: number; // how many other directories import from this
}

export type DirectoryType = 'layer' | 'feature' | 'module' | 'other';

export interface ArchitectureIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedFiles?: number;
  affectedDirs?: string[];
  recommendation?: string;
}

export interface ApiDrift {
  frontendCall: string; // e.g., GET /api/users
  backendEndpoint?: string; // e.g., GET /users
  match: 'exact' | 'partial' | 'missing';
  file?: string;
  line?: number;
}

export interface ArchitectureReport {
  timestamp: string;
  repositories: RepoAnalysis[];
  overallArchitecture: ArchitectureType;
  overallScores: ArchitectureScore;
  globalMetrics: CouplingCohesionScores;
  issues: ArchitectureIssue[];
  apiDrift: ApiDrift[];
  recommendations: string[];
  effort?: {
    estimated: string; // e.g., "8-12 weeks"
    breakeven: string; // e.g., "14 months"
    roi3Year: number; // e.g., 380 for 380%
  };
}

export interface AnalyzeOptions {
  verbose?: boolean;
  output?: 'text' | 'json';
  json?: boolean;
}
