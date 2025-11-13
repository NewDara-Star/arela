/**
 * API Contract Generation Types
 */

/**
 * API Endpoint from backend
 */
export interface ApiEndpoint {
  id: number;
  method: string; // GET, POST, PUT, DELETE, etc.
  path: string; // /api/users/:id
  fileId: number;
  functionId: number | null;
  lineNumber: number | null;
  createdAt: string;
}

/**
 * API Call from frontend
 */
export interface ApiCall {
  id: number;
  method: string;
  url: string; // /api/users/123 or /api/users/${id}
  fileId: number;
  lineNumber: number | null;
  createdAt: string;
}

/**
 * File information from Graph DB
 */
export interface FileInfo {
  id: number;
  path: string;
  language: string;
  isBackend: boolean;
  isFrontend: boolean;
  createdAt: string;
}

/**
 * Matched endpoint with its frontend calls
 */
export interface EndpointMatch {
  endpoint: ApiEndpoint;
  calls: ApiCall[];
  similarity: number;
}

/**
 * Schema drift issue
 */
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DriftType =
  | 'path-mismatch'
  | 'method-mismatch'
  | 'endpoint-not-found'
  | 'schema-mismatch'
  | 'parameter-mismatch';

export interface DriftIssue {
  type: DriftType;
  severity: DriftSeverity;
  call?: ApiCall;
  endpoint?: ApiEndpoint;
  message: string;
  suggestion?: string;
}

/**
 * OpenAPI 3.0 Parameter
 */
export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: {
    type: string;
  };
  description?: string;
}

/**
 * OpenAPI 3.0 Response
 */
export interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json'?: {
      schema: any;
    };
  };
}

/**
 * OpenAPI 3.0 Operation
 */
export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content: {
      'application/json': {
        schema: any;
      };
    };
  };
  responses: {
    [statusCode: string]: OpenAPIResponse;
  };
}

/**
 * OpenAPI 3.0 Path
 */
export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

/**
 * OpenAPI 3.0 Specification
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: OpenAPIPath;
  };
  components?: {
    schemas?: {
      [schemaName: string]: any;
    };
  };
}

/**
 * Grouped endpoints by slice
 */
export interface SliceGroup {
  name: string;
  endpoints: ApiEndpoint[];
  calls: ApiCall[];
  matches: EndpointMatch[];
  drift: DriftIssue[];
  spec?: OpenAPISpec;
}

/**
 * Contract generation options
 */
export interface ContractOptions {
  repoPaths: string[];
  perSlice?: boolean;
  format?: 'yaml' | 'json';
  driftOnly?: boolean;
  outputDir?: string;
}

/**
 * Contract generation report
 */
export interface ContractReport {
  totalEndpoints: number;
  totalCalls: number;
  matchedCount: number;
  unmatchedCalls: ApiCall[];
  unmatchedEndpoints: ApiEndpoint[];
  driftIssues: DriftIssue[];
  slices: SliceGroup[];
  specs: OpenAPISpec[];
  generatedAt: string;
  duration: number; // milliseconds
}
