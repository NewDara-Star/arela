/**
 * Type definitions for contract-driven client generator
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, Schema>;
  };
  servers?: Array<{ url: string; description?: string }>;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags?: string[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: Schema;
  description?: string;
}

export interface RequestBody {
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

export interface Response {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  description?: string;
  enum?: string[] | number[];
  default?: any;
  format?: string;
  additionalProperties?: Schema | boolean;
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
  $ref?: string;
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // Number constraints
  minimum?: number;
  maximum?: number;
  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface GenerateClientOptions {
  language: 'typescript' | 'python';
  contract?: string;
  contractDir?: string;
  outputDir?: string;
  baseURL?: string;
  dryRun?: boolean;
}

export interface ClientGenerationResult {
  success: boolean;
  filesGenerated: string[];
  linesOfCode: number;
  errors?: string[];
}

export interface TypeGenerationContext {
  spec: OpenAPISpec;
  serviceName: string;
  indent: string;
}

export interface GeneratedFiles {
  types: string;
  schemas: string;
  client: string;
  index: string;
}
