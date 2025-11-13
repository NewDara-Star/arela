# CLAUDE-001: Contract-Driven Client Generator

## Priority
🔴 CRITICAL

## Complexity
Medium-High (4-5 hours)

## Phase
Phase 3 - Autonomous Refactoring (v3.9.0)

## Description
Build a contract-driven client generator that creates type-safe API clients from OpenAPI 3.0 specifications. This enables frontend developers to consume backend APIs with full type safety and prevents API drift at compile time.

## Context
This is the first autonomous refactoring feature for Arela v4.0.0. We have 27 OpenAPI specs generated from the Stride API (103 endpoints). Now we'll generate TypeScript clients that the mobile app can use to call these APIs with full type safety.

## Acceptance Criteria
- [ ] Generates TypeScript API clients from OpenAPI 3.0 specs
- [ ] Creates type-safe request/response interfaces
- [ ] Includes runtime validation (Zod schemas)
- [ ] Generates axios-based HTTP clients
- [ ] Supports authentication (Bearer tokens)
- [ ] Handles error responses properly
- [ ] Outputs clean, readable TypeScript code
- [ ] Works with all 27 Stride API contracts

## CLI Interface
```bash
# Generate TypeScript client from single contract
arela generate client typescript --contract openapi/workout-api.yaml

# Generate clients for all contracts
arela generate client typescript --contract-dir openapi/

# Specify output directory
arela generate client typescript --contract openapi/auth-api.yaml --output src/api/

# With custom base URL
arela generate client typescript --contract openapi/workout-api.yaml --base-url https://api.stride.app

# Dry run (show what would be generated)
arela generate client typescript --contract openapi/workout-api.yaml --dry-run
```

## Expected Output
```
🎨 Generating TypeScript API Client...

📄 Reading contract: openapi/workout-api.yaml
✅ Parsed 12 endpoints

🔨 Generating types...
  ✅ Created WorkoutResponse interface
  ✅ Created CreateWorkoutRequest interface
  ✅ Created UpdateWorkoutRequest interface
  ✅ Created Zod schemas for validation

🔨 Generating client...
  ✅ Created WorkoutApiClient class
  ✅ Added 12 methods (getWorkouts, createWorkout, etc.)
  ✅ Added error handling
  ✅ Added authentication support

💾 Saving files...
  📝 src/api/workout/types.ts (234 lines)
  📝 src/api/workout/client.ts (456 lines)
  📝 src/api/workout/schemas.ts (189 lines)

✨ Done! Generated 3 files with 879 lines of code

💡 Usage:
  import { WorkoutApiClient } from './api/workout/client';
  
  const client = new WorkoutApiClient({
    baseURL: 'https://api.stride.app',
    token: 'your-auth-token'
  });
  
  const workouts = await client.getWorkouts();
```

## Technical Implementation

### Architecture

```
src/generate/
├── client/
│   ├── index.ts              # Main orchestrator
│   ├── typescript-generator.ts  # TypeScript client generator
│   ├── type-generator.ts     # Interface/type generation
│   ├── schema-generator.ts   # Zod schema generation
│   ├── client-generator.ts   # HTTP client generation
│   ├── templates/            # Code templates
│   │   ├── client.ts.template
│   │   ├── types.ts.template
│   │   └── schemas.ts.template
│   └── types.ts              # TypeScript types
```

### Key Functions

```typescript
// src/generate/client/index.ts
export async function generateClient(options: GenerateClientOptions): Promise<void> {
  const { language, contract, outputDir, baseURL } = options;
  
  // 1. Parse OpenAPI spec
  const spec = await parseOpenAPISpec(contract);
  
  // 2. Generate based on language
  switch (language) {
    case 'typescript':
      await generateTypeScriptClient(spec, outputDir, baseURL);
      break;
    case 'python':
      await generatePythonClient(spec, outputDir, baseURL);
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}
```

```typescript
// src/generate/client/typescript-generator.ts
export async function generateTypeScriptClient(
  spec: OpenAPISpec,
  outputDir: string,
  baseURL?: string
): Promise<void> {
  const serviceName = spec.info.title.replace(/\s+/g, '');
  const serviceDir = path.join(outputDir, serviceName.toLowerCase());
  
  await fs.ensureDir(serviceDir);
  
  // 1. Generate types from schemas
  const types = generateTypes(spec);
  await fs.writeFile(path.join(serviceDir, 'types.ts'), types);
  
  // 2. Generate Zod schemas for validation
  const schemas = generateSchemas(spec);
  await fs.writeFile(path.join(serviceDir, 'schemas.ts'), schemas);
  
  // 3. Generate HTTP client
  const client = generateClient(spec, serviceName, baseURL);
  await fs.writeFile(path.join(serviceDir, 'client.ts'), client);
  
  // 4. Generate index.ts for exports
  const index = generateIndex(serviceName);
  await fs.writeFile(path.join(serviceDir, 'index.ts'), index);
}
```

```typescript
// src/generate/client/type-generator.ts
export function generateTypes(spec: OpenAPISpec): string {
  let output = `/**
 * Auto-generated TypeScript types from OpenAPI spec
 * DO NOT EDIT - This file is generated by Arela
 */

`;

  // Extract all schemas from components
  const schemas = spec.components?.schemas || {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    output += generateInterface(name, schema);
    output += '\n\n';
  }
  
  // Generate request/response types for each endpoint
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.requestBody) {
        output += generateRequestType(path, method, operation);
        output += '\n\n';
      }
      if (operation.responses) {
        output += generateResponseType(path, method, operation);
        output += '\n\n';
      }
    }
  }
  
  return output;
}

function generateInterface(name: string, schema: any): string {
  const properties = schema.properties || {};
  const required = schema.required || [];
  
  let output = `export interface ${name} {\n`;
  
  for (const [propName, propSchema] of Object.entries(properties)) {
    const isRequired = required.includes(propName);
    const tsType = schemaToTypeScript(propSchema);
    output += `  ${propName}${isRequired ? '' : '?'}: ${tsType};\n`;
  }
  
  output += '}';
  return output;
}

function schemaToTypeScript(schema: any): string {
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${schemaToTypeScript(schema.items)}[]`;
    case 'object':
      if (schema.additionalProperties) {
        return 'Record<string, any>';
      }
      return '{ [key: string]: any }';
    default:
      return 'any';
  }
}
```

```typescript
// src/generate/client/schema-generator.ts
import { z } from 'zod';

export function generateSchemas(spec: OpenAPISpec): string {
  let output = `/**
 * Auto-generated Zod schemas from OpenAPI spec
 * DO NOT EDIT - This file is generated by Arela
 */

import { z } from 'zod';

`;

  const schemas = spec.components?.schemas || {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    output += generateZodSchema(name, schema);
    output += '\n\n';
  }
  
  return output;
}

function generateZodSchema(name: string, schema: any): string {
  const zodType = schemaToZod(schema);
  return `export const ${name}Schema = ${zodType};`;
}

function schemaToZod(schema: any): string {
  switch (schema.type) {
    case 'string':
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'integer':
      return 'z.number().int()';
    case 'boolean':
      return 'z.boolean()';
    case 'array':
      return `z.array(${schemaToZod(schema.items)})`;
    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, val]) => `  ${key}: ${schemaToZod(val)}`)
          .join(',\n');
        return `z.object({\n${props}\n})`;
      }
      return 'z.record(z.any())';
    default:
      return 'z.any()';
  }
}
```

```typescript
// src/generate/client/client-generator.ts
export function generateClient(
  spec: OpenAPISpec,
  serviceName: string,
  baseURL?: string
): string {
  let output = `/**
 * Auto-generated API client from OpenAPI spec
 * DO NOT EDIT - This file is generated by Arela
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as types from './types';
import * as schemas from './schemas';

export interface ${serviceName}ClientConfig {
  baseURL: string;
  token?: string;
  timeout?: number;
}

export class ${serviceName}Client {
  private client: AxiosInstance;

  constructor(config: ${serviceName}ClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token && { Authorization: \`Bearer \${config.token}\` }),
      },
    });
  }

`;

  // Generate methods for each endpoint
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      output += generateMethod(path, method, operation);
      output += '\n\n';
    }
  }

  output += '}\n';
  return output;
}

function generateMethod(path: string, method: string, operation: any): string {
  const methodName = operation.operationId || generateMethodName(path, method);
  const pathParams = extractPathParams(path);
  const hasBody = method === 'post' || method === 'put' || method === 'patch';
  
  let params = pathParams.map(p => `${p}: string`).join(', ');
  if (hasBody) {
    params += params ? ', data: any' : 'data: any';
  }
  
  const axiosMethod = method.toLowerCase();
  const urlTemplate = path.replace(/{([^}]+)}/g, '${$1}');
  
  return `  async ${methodName}(${params}): Promise<any> {
    const response = await this.client.${axiosMethod}(\`${urlTemplate}\`${hasBody ? ', data' : ''});
    return response.data;
  }`;
}

function generateMethodName(path: string, method: string): string {
  // Convert /api/workouts/{id} + GET → getWorkout
  const parts = path.split('/').filter(p => p && !p.startsWith('{'));
  const resource = parts[parts.length - 1];
  const action = method === 'get' ? 'get' : method === 'post' ? 'create' : method === 'put' ? 'update' : 'delete';
  return `${action}${capitalize(resource)}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/{([^}]+)}/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
}
```

### Example Generated Code

**types.ts:**
```typescript
export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
}

export interface CreateWorkoutRequest {
  name: string;
  exercises: Exercise[];
}
```

**schemas.ts:**
```typescript
import { z } from 'zod';

export const WorkoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(ExerciseSchema),
  createdAt: z.string(),
});

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number().int(),
  reps: z.number().int(),
});
```

**client.ts:**
```typescript
import axios, { AxiosInstance } from 'axios';
import * as types from './types';

export class WorkoutApiClient {
  private client: AxiosInstance;

  constructor(config: { baseURL: string; token?: string }) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token && { Authorization: `Bearer ${config.token}` }),
      },
    });
  }

  async getWorkouts(): Promise<types.Workout[]> {
    const response = await this.client.get('/api/workouts');
    return response.data;
  }

  async createWorkout(data: types.CreateWorkoutRequest): Promise<types.Workout> {
    const response = await this.client.post('/api/workouts', data);
    return response.data;
  }

  async getWorkout(id: string): Promise<types.Workout> {
    const response = await this.client.get(`/api/workouts/${id}`);
    return response.data;
  }
}
```

## Dependencies
- OpenAPI specs from Phase 2 (27 contracts)
- axios (HTTP client)
- zod (runtime validation)
- js-yaml (parse YAML specs)

## Integration Points
- **Input:** OpenAPI specs at `openapi/*.yaml`
- **Output:** TypeScript clients at `src/api/<service>/`
- **Used by:** Frontend developers consuming backend APIs

## Testing Strategy
- Test with all 27 Stride API contracts
- Verify generated TypeScript compiles
- Test runtime validation with Zod
- Verify HTTP requests work correctly

## Performance Considerations
- Cache parsed OpenAPI specs
- Generate files in parallel
- Target: <5 seconds for all 27 contracts

## Example Usage
```bash
# Generate client for Stride workout API
arela generate client typescript --contract openapi/workout-api.yaml --output stride-mobile/src/api/

# Use in mobile app
import { WorkoutApiClient } from './api/workout';

const client = new WorkoutApiClient({
  baseURL: 'https://api.stride.app',
  token: user.authToken
});

const workouts = await client.getWorkouts();
```

## Notes
- Start with TypeScript, add Python later
- Use templates for code generation
- Ensure generated code is readable and maintainable
- Add comments explaining auto-generation

## Related Features
- Depends on: Feature 5 (API Contract Generator from Phase 2)
- Enables: Type-safe API consumption
- Prevents: API drift at compile time

## Estimated Time
4-5 hours

## Agent Assignment
Claude (Complex code generation and template system)
