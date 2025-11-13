/**
 * Generate OpenAPI 3.0 specifications from endpoints
 */
import {
  ApiEndpoint,
  OpenAPISpec,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIResponse,
} from './types';

/**
 * Generate OpenAPI spec for a set of endpoints
 */
export function generateOpenAPISpec(
  sliceName: string,
  endpoints: ApiEndpoint[],
  version: string = '1.0.0'
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: `${formatTitle(sliceName)} API`,
      version,
      description: `API contract for ${sliceName} slice`,
    },
    paths: {},
  };

  // Group endpoints by path
  const pathMap = new Map<string, ApiEndpoint[]>();

  for (const endpoint of endpoints) {
    const path = endpoint.path;
    if (!pathMap.has(path)) {
      pathMap.set(path, []);
    }
    pathMap.get(path)!.push(endpoint);
  }

  // Generate path items
  for (const [path, pathEndpoints] of pathMap) {
    spec.paths[path] = {};

    for (const endpoint of pathEndpoints) {
      const method = endpoint.method.toLowerCase();
      spec.paths[path][method] = generateOperation(endpoint);
    }
  }

  return spec;
}

/**
 * Generate OpenAPI operation for an endpoint
 */
function generateOperation(endpoint: ApiEndpoint): OpenAPIOperation {
  const operation: OpenAPIOperation = {
    summary: generateSummary(endpoint),
    description: `Endpoint defined at line ${endpoint.lineNumber || 'unknown'}`,
    parameters: extractParameters(endpoint.path),
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
      '400': {
        description: 'Bad Request',
      },
      '404': {
        description: 'Not Found',
      },
      '500': {
        description: 'Internal Server Error',
      },
    },
  };

  // Add request body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    operation.requestBody = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    };
  }

  return operation;
}

/**
 * Generate operation summary from endpoint
 */
function generateSummary(endpoint: ApiEndpoint): string {
  const method = endpoint.method.toLowerCase();
  const parts = endpoint.path.split('/').filter(p => p && !p.startsWith(':'));

  let action = 'Handle';
  switch (method) {
    case 'get':
      action = parts.some(p => p.match(/^\w+$/) && p.length > 1)
        ? `Get ${parts[parts.length - 1]}`
        : 'Get';
      break;
    case 'post':
      action = `Create ${parts[parts.length - 1]}`;
      break;
    case 'put':
      action = `Update ${parts[parts.length - 1]}`;
      break;
    case 'patch':
      action = `Partial update ${parts[parts.length - 1]}`;
      break;
    case 'delete':
      action = `Delete ${parts[parts.length - 1]}`;
      break;
  }

  return action;
}

/**
 * Extract path parameters from endpoint path
 */
function extractParameters(path: string): OpenAPIParameter[] {
  const parameters: OpenAPIParameter[] = [];
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

  let match;
  while ((match = paramRegex.exec(path)) !== null) {
    const paramName = match[1];

    // Determine parameter type
    let paramType = 'string';
    if (paramName === 'id' || paramName === 'userId' || paramName === 'workoutId') {
      paramType = 'string';
    }

    parameters.push({
      name: paramName,
      in: 'path',
      required: true,
      schema: {
        type: paramType,
      },
      description: `The ${paramName}`,
    });
  }

  return parameters;
}

/**
 * Format title from slice name
 */
function formatTitle(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert OpenAPI spec to YAML string
 */
export function specToYaml(spec: OpenAPISpec): string {
  return formatYamlObject(spec, 0);
}

/**
 * Format object as YAML with proper indentation
 */
function formatYamlObject(obj: any, indent: number = 0): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj !== 'object') {
    // Escape strings if needed
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('"')) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    const indentStr = ' '.repeat(indent);
    const itemIndentStr = ' '.repeat(indent + 2);
    const items = obj
      .map(
        item =>
          `${itemIndentStr}- ${formatYamlValue(item, indent + 2)}`
      )
      .join('\n');
    return `\n${items}`;
  }

  // Object
  const indentStr = ' '.repeat(indent);
  const keyIndentStr = ' '.repeat(indent + 2);
  const keys = Object.keys(obj).sort();

  if (keys.length === 0) {
    return '{}';
  }

  const lines = keys.map(key => {
    const value = obj[key];
    const formattedValue = formatYamlValue(value, indent + 2);

    if (formattedValue.startsWith('\n')) {
      return `${keyIndentStr}${key}:${formattedValue}`;
    } else {
      return `${keyIndentStr}${key}: ${formattedValue}`;
    }
  });

  return `\n${lines.join('\n')}`;
}

/**
 * Format a value for YAML
 */
function formatYamlValue(value: any, indent: number): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    if (value.includes('\n') || value.includes(':')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const itemIndentStr = ' '.repeat(indent + 2);
    const items = value
      .map(
        item =>
          `${itemIndentStr}- ${formatYamlValue(item, indent + 2)}`
      )
      .join('\n');
    return `\n${items}`;
  }

  if (typeof value === 'object') {
    return formatYamlObject(value, indent);
  }

  return String(value);
}

/**
 * Convert OpenAPI spec to JSON string
 */
export function specToJson(spec: OpenAPISpec): string {
  return JSON.stringify(spec, null, 2);
}

/**
 * Get common response definitions
 */
export function getCommonResponses(): { [statusCode: string]: OpenAPIResponse } {
  return {
    '200': {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    '201': {
      description: 'Created',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    '400': {
      description: 'Bad Request',
    },
    '401': {
      description: 'Unauthorized',
    },
    '403': {
      description: 'Forbidden',
    },
    '404': {
      description: 'Not Found',
    },
    '500': {
      description: 'Internal Server Error',
    },
  };
}
