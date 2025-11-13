# CLAUDE-002: API Contract Generator

## Priority
🔴 CRITICAL

## Complexity
Medium (3-4 hours)

## Phase
Phase 2 - Intelligence (v3.8.0)

## Description
Build an API contract generator that automatically creates OpenAPI 3.0 specifications from code by analyzing API endpoints and their usage. Detects schema drift between frontend API calls and backend endpoints, and generates contract definitions per slice.

## Context
This is the second intelligence feature for Arela v4.0.0. It uses the 103 API endpoints we detected in Phase 1 and generates proper OpenAPI contracts. This enables contract-first development and prevents API drift between mobile and backend.

## Acceptance Criteria
- [ ] Generates OpenAPI 3.0 specifications from code
- [ ] Detects API endpoints from backend code
- [ ] Detects API calls from frontend code
- [ ] Matches frontend calls to backend endpoints
- [ ] Identifies schema drift (mismatched endpoints)
- [ ] Generates contracts per slice
- [ ] Outputs valid OpenAPI YAML/JSON

## CLI Interface
```bash
# Generate contracts for current repo
arela generate contracts

# Multi-repo (frontend + backend)
arela generate contracts /path/to/mobile /path/to/backend

# Generate per slice
arela generate contracts --per-slice

# Export format
arela generate contracts --format yaml
arela generate contracts --format json

# Detect drift only
arela generate contracts --drift-only
```

## Expected Output
```
🔍 Analyzing API contracts...

📊 Found 103 backend endpoints
📊 Found 87 frontend API calls

✅ Matched Endpoints (84):
   GET /api/users/{id}
   POST /api/workouts
   GET /api/nutrition/meals
   ... and 81 more

❌ Schema Drift Detected (3):
   1. Frontend calls GET /api/user/{id}
      Backend defines GET /api/users/{id}
      → Mismatch: /user vs /users

   2. Frontend calls POST /api/workout/create
      Backend defines POST /api/workouts
      → Endpoint not found

   3. Frontend expects { userId: string }
      Backend returns { user_id: number }
      → Schema mismatch: camelCase vs snake_case

📝 Generated OpenAPI contracts:
   - openapi/authentication.yaml (12 endpoints)
   - openapi/workout.yaml (34 endpoints)
   - openapi/nutrition.yaml (28 endpoints)
   - openapi/social.yaml (29 endpoints)

💡 Recommendations:
   - Fix 3 schema drift issues before deploying
   - Add contract testing with Dredd
   - Use generated contracts for API documentation

📋 Next step: arela test contracts
```

## Technical Implementation

### Algorithm

**Step 1: Extract Backend Endpoints**
```typescript
// From Graph DB api_endpoints table
SELECT method, path, file_id FROM api_endpoints;

// Parse route parameters
GET /api/users/{id} → { method: 'GET', path: '/api/users/:id', params: ['id'] }
```

**Step 2: Extract Frontend API Calls**
```typescript
// From Graph DB api_calls table
SELECT method, url, file_id FROM api_calls;

// Parse dynamic URLs
fetch(`/api/users/${userId}`) → { method: 'GET', path: '/api/users/:id' }
```

**Step 3: Match Calls to Endpoints**
```typescript
// Fuzzy matching with Levenshtein distance
matchEndpoint('/api/user/123', '/api/users/:id') → 0.9 similarity
```

**Step 4: Detect Schema Drift**
```typescript
// Compare expected vs actual
frontend: GET /api/user/{id}
backend:  GET /api/users/{id}
→ Drift: path mismatch

frontend: { userId: string }
backend:  { user_id: number }
→ Drift: schema mismatch
```

**Step 5: Generate OpenAPI Spec**
```typescript
// Per endpoint
{
  "/api/users/{id}": {
    "get": {
      "summary": "Get user by ID",
      "parameters": [{ "name": "id", "in": "path", "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "User found", "content": { ... } }
      }
    }
  }
}
```

### Files to Create
```
src/contracts/
├── index.ts              # Main orchestrator (exports generateContracts)
├── endpoint-extractor.ts # Extract backend endpoints from Graph DB
├── call-extractor.ts     # Extract frontend calls from Graph DB
├── matcher.ts            # Match calls to endpoints
├── drift-detector.ts     # Detect schema drift
├── openapi-generator.ts  # Generate OpenAPI 3.0 specs
├── slice-grouper.ts      # Group endpoints by slice
├── reporter.ts           # Format and display results
└── types.ts              # TypeScript types
```

### Key Functions

```typescript
// src/contracts/index.ts
export async function generateContracts(
  repoPaths: string[],
  options?: ContractOptions
): Promise<ContractReport> {
  // 1. Extract backend endpoints
  const endpoints = await extractEndpoints(repoPaths);
  
  // 2. Extract frontend API calls
  const calls = await extractCalls(repoPaths);
  
  // 3. Match calls to endpoints
  const matches = matchCallsToEndpoints(calls, endpoints);
  
  // 4. Detect drift
  const drift = detectDrift(matches);
  
  // 5. Group by slice (if slices detected)
  const slices = await loadSlices();
  const grouped = groupBySlice(endpoints, slices);
  
  // 6. Generate OpenAPI specs
  const specs = grouped.map(slice => 
    generateOpenAPISpec(slice.name, slice.endpoints)
  );
  
  // 7. Save specs
  for (const spec of specs) {
    await saveSpec(spec, options.format);
  }
  
  return {
    endpoints: endpoints.length,
    calls: calls.length,
    matched: matches.length,
    drift: drift.length,
    specs: specs.length,
  };
}
```

```typescript
// src/contracts/matcher.ts
export function matchCallsToEndpoints(
  calls: ApiCall[],
  endpoints: ApiEndpoint[]
): Match[] {
  const matches: Match[] = [];
  
  for (const call of calls) {
    // Normalize paths (remove dynamic segments)
    const normalizedCall = normalizePath(call.url);
    
    // Find best matching endpoint
    const candidates = endpoints.filter(e => 
      e.method === call.method
    );
    
    const bestMatch = candidates
      .map(e => ({
        endpoint: e,
        similarity: calculateSimilarity(normalizedCall, e.path),
      }))
      .sort((a, b) => b.similarity - a.similarity)[0];
    
    if (bestMatch && bestMatch.similarity > 0.8) {
      matches.push({
        call,
        endpoint: bestMatch.endpoint,
        similarity: bestMatch.similarity,
      });
    }
  }
  
  return matches;
}

function normalizePath(path: string): string {
  // Replace dynamic segments with :param
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\$\{[^}]+\}/g, ':param');
}
```

```typescript
// src/contracts/drift-detector.ts
export function detectDrift(matches: Match[]): DriftIssue[] {
  const issues: DriftIssue[] = [];
  
  for (const match of matches) {
    // Path mismatch
    if (match.call.url !== match.endpoint.path) {
      issues.push({
        type: 'path-mismatch',
        severity: 'high',
        call: match.call,
        endpoint: match.endpoint,
        message: `Frontend calls ${match.call.url}, backend defines ${match.endpoint.path}`,
      });
    }
    
    // Method mismatch
    if (match.call.method !== match.endpoint.method) {
      issues.push({
        type: 'method-mismatch',
        severity: 'critical',
        call: match.call,
        endpoint: match.endpoint,
        message: `Method mismatch: ${match.call.method} vs ${match.endpoint.method}`,
      });
    }
  }
  
  // Unmatched calls (frontend calls non-existent endpoints)
  const unmatchedCalls = calls.filter(c => 
    !matches.find(m => m.call === c)
  );
  
  for (const call of unmatchedCalls) {
    issues.push({
      type: 'endpoint-not-found',
      severity: 'critical',
      call,
      message: `Frontend calls ${call.url} but endpoint not found in backend`,
    });
  }
  
  return issues;
}
```

```typescript
// src/contracts/openapi-generator.ts
export function generateOpenAPISpec(
  sliceName: string,
  endpoints: ApiEndpoint[]
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: `${sliceName} API`,
      version: '1.0.0',
      description: `API contract for ${sliceName} slice`,
    },
    paths: {},
  };
  
  for (const endpoint of endpoints) {
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();
    
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }
    
    spec.paths[path][method] = {
      summary: generateSummary(endpoint),
      parameters: extractParameters(endpoint),
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: inferSchema(endpoint),
            },
          },
        },
      },
    };
  }
  
  return spec;
}
```

### OpenAPI Output Example

```yaml
# openapi/workout.yaml
openapi: 3.0.0
info:
  title: Workout API
  version: 1.0.0
  description: API contract for workout slice

paths:
  /api/workouts:
    get:
      summary: List all workouts
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Workout'
    
    post:
      summary: Create a new workout
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWorkout'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Workout'

  /api/workouts/{id}:
    get:
      summary: Get workout by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Workout'

components:
  schemas:
    Workout:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        exercises:
          type: array
          items:
            $ref: '#/components/schemas/Exercise'
```

## Dependencies
- Graph DB from Phase 1 (api_endpoints, api_calls tables)
- js-yaml (for YAML output)

## Integration Points
- **Input:** Graph DB at `.arela/memory/graph.db`
- **Output:** OpenAPI specs at `openapi/*.yaml`
- **Used by:** Contract testing (Dredd), API documentation

## Testing Strategy
- Test with Stride repos (103 endpoints, 87 calls)
- Verify drift detection accuracy
- Validate generated OpenAPI specs
- Test per-slice contract generation

## Performance Considerations
- Cache Graph DB queries
- Batch endpoint/call extraction
- Target: <5 seconds for 100 endpoints

## Example Usage
```bash
# Generate contracts for Stride
arela generate contracts /Users/Star/stride-mobile /Users/Star/stride-api

# Expected output:
# - 103 backend endpoints
# - 87 frontend calls
# - 3 drift issues detected
# - 4 OpenAPI specs generated
```

## Notes
- Start with simple path matching, add schema inference later
- Use Levenshtein distance for fuzzy matching
- Group contracts by slice for better organization
- Save specs to `openapi/` directory

## Related Features
- Depends on: Feature 6.1 (Graph DB with API endpoints)
- Depends on: Feature 6.2 (Slice Detection for grouping)
- Enables: Contract testing with Dredd

## Estimated Time
3-4 hours

## Agent Assignment
Claude (Complex API analysis and OpenAPI spec generation)
