/**
 * Types for codebase ingestion system
 * Defines data structures for AST analysis and graph building
 */

export interface IngestOptions {
  analyze?: boolean;
  refresh?: boolean;
  repo?: string;
  verbose?: boolean;
}

export interface CodebaseMap {
  summary: {
    filesScanned: number;
    importsFound: number;
    functionsDefined: number;
    apiCallsFound: number;
  };
  stats: {
    modules: number;
    components: number;
    services: number;
    apiEndpoints: number;
  };
  dbPath: string;
  duration: number; // ms
}

/**
 * File node in the dependency graph
 */
export interface FileNode {
  path: string; // Relative path
  repoPath: string; // Absolute repo path
  type: FileType;
  lines: number;
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  functions?: FunctionNode[];
  apiCalls?: ApiCall[];
}

export type FileType = 'component' | 'service' | 'controller' | 'util' | 'hook' | 'type' | 'config' | 'other';

/**
 * Import information
 */
export interface ImportInfo {
  from: string; // File path or module name
  names: string[]; // Imported names
  type: 'default' | 'named' | 'namespace';
  line: number;
}

/**
 * Export information
 */
export interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  line: number;
}

/**
 * Function node in the dependency graph
 */
export interface FunctionNode {
  id?: number;
  name: string;
  fileId?: number;
  filePath?: string;
  isExported: boolean;
  lineStart: number;
  lineEnd: number;
  calls?: number[]; // IDs of called functions
  calledBy?: number[]; // IDs of calling functions
}

/**
 * Function call relationship
 */
export interface FunctionCall {
  callerId: number;
  calleeId: number;
  line: number;
}

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  method: string; // GET, POST, PUT, DELETE, etc.
  path: string;
  fileId: number;
  functionId?: number;
  line: number;
}

/**
 * API call (frontend making a call)
 */
export interface ApiCall {
  method: string;
  url: string;
  line: number;
  filePath?: string;
}

/**
 * Analysis result for a single file
 */
export interface FileAnalysis {
  filePath: string;
  type: FileType;
  lines: number;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionNode[];
  apiEndpoints: ApiEndpoint[];
  apiCalls: ApiCall[];
}

/**
 * Graph database query result
 */
export interface QueryResult {
  [key: string]: any;
}

/**
 * Progress callback for ingestion
 */
export type ProgressCallback = (update: {
  type: 'scanning' | 'analyzing' | 'building' | 'storing';
  current: number;
  total: number;
  message: string;
}) => void;
