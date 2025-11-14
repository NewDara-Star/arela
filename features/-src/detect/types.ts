/**
 * Types for slice detection
 */

export interface FileNode {
  id: number;
  path: string;
  type: string;
  degree: number;
}

export interface ImportEdge {
  from: number;
  to: number;
  weight: number;
}

export interface Graph {
  nodes: FileNode[];
  edges: ImportEdge[];
}

export interface Community {
  nodes: number[]; // File IDs
  id: string;
}

export interface Slice {
  name: string;
  files: string[];
  fileCount: number;
  cohesion: number;
  internalImports: number;
  externalImports: number;
}

export interface SliceReport {
  totalFiles: number;
  totalImports: number;
  sliceCount: number;
  slices: Slice[];
  recommendations: string[];
}

export interface DetectOptions {
  verbose?: boolean;
  json?: string;
  minCohesion?: number;
  maxSlices?: number;
}
