# Contract Validation with Dredd

Prevent schema drift between API implementation and OpenAPI contracts with automated validation using [Dredd](https://dredd.org/).

## Overview

Contract validation ensures that your API implementation matches its OpenAPI specification. This prevents:

- ❌ Frontend breaks when backend changes
- ❌ Contract drift (spec says one thing, API does another)
- ❌ Deployment surprises with undocumented changes

## Installation

Contract validation is built into Arela. Just ensure you have OpenAPI specs in the `openapi/` directory:

```bash
# Your project structure
your-project/
├── openapi/
│   ├── auth-api.yaml
│   ├── users-api.yaml
│   └── products-api.yaml
└── src/
```

## Usage

### Validate All Contracts

Validate all OpenAPI specs against a running API server:

```bash
# Server must be running at http://localhost:3000
arela validate contracts

# Or specify a custom server URL
arela validate contracts --server http://localhost:8080
```

### Validate Specific Contract

Validate a single contract:

```bash
arela validate contracts --contract openapi/auth-api.yaml
```

### Auto-Start Server

Automatically start your API server before validation:

```bash
arela validate contracts --start-server "npm run dev"
```

### Command Options

```bash
arela validate contracts [OPTIONS]

Options:
  --contract <path>        Specific contract to validate (optional)
  --server <url>           API server URL (default: http://localhost:3000)
  --start-server <cmd>     Command to start API server
  --watch                  Watch mode for development (experimental)
  --cwd <dir>              Working directory (default: current directory)
  -h, --help               Display help for command
```

## OpenAPI Spec Structure

Create OpenAPI 3.1 specification files in `openapi/` directory:

```yaml
# openapi/users-api.yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
  description: API for managing users

servers:
  - url: http://localhost:3000
    description: Development server

paths:
  /api/users:
    get:
      summary: List all users
      tags:
        - Users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
        '500':
          description: Server error

    post:
      summary: Create a new user
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  /api/users/{id}:
    get:
      summary: Get user by ID
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: number
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      required:
        - id
        - name
        - email
      properties:
        id:
          type: number
          example: 1
        name:
          type: string
          example: John Doe
        email:
          type: string
          format: email
          example: john@example.com
        createdAt:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required:
        - name
        - email
      properties:
        name:
          type: string
        email:
          type: string
          format: email
```

## CI/CD Integration

### GitHub Actions

The contract validation workflow runs automatically on every push and PR:

```yaml
# .github/workflows/contract-validation.yml
name: Contract Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - run: npm ci
      - run: npm run build

      - name: Validate contracts
        run: npx arela validate contracts --start-server "npm run dev"
```

### Pre-commit Hook

Validate contracts before commits:

```bash
#!/bin/sh
# .git/hooks/pre-commit

arela validate contracts --server http://localhost:3000
if [ $? -ne 0 ]; then
  echo "❌ Contract validation failed. Commit aborted."
  exit 1
fi
```

## Understanding Validation Errors

When validation fails, Dredd provides detailed error messages:

```
❌ Contract validation failed!

   Total endpoints: 3
   Failed: 1

✗ users-api.yaml
   Endpoints: 3, Failures: 1
   Details: [GET /api/users]: Expected response status 200 but got 404
```

### Common Issues

**1. Schema Mismatch**
```
Expected: { "id": 1, "name": "John" }
Actual:   { "userId": 1, "userName": "John" }
```
**Fix**: Update your API to match the OpenAPI spec or update the spec.

**2. Missing Fields**
```
Expected response to have: email
Actual response is missing: email
```
**Fix**: Add the missing field to your API response.

**3. Wrong Status Code**
```
Expected status: 201
Actual status:   200
```
**Fix**: Update your API endpoint to return the correct status code.

**4. Wrong Content-Type**
```
Expected: application/json
Actual:   text/plain
```
**Fix**: Ensure your API returns the correct Content-Type header.

## Testing Against Contract

Run validation in your test suite:

```typescript
// test/contract-validation.spec.ts
import { describe, it, expect } from 'vitest';
import { validateContracts } from '../src/validate/contract-validator.js';

describe('Contract Validation', () => {
  it('should validate all API contracts', async () => {
    const result = await validateContracts({
      serverUrl: 'http://localhost:3000',
      cwd: process.cwd(),
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toBe(0);
    console.log(`✅ Validated ${result.total} endpoints`);
  });
});
```

Run with your test command:

```bash
npm test -- contract-validation.spec.ts
```

## Dredd Hooks (Advanced)

For complex validation scenarios, use Dredd hooks to customize behavior:

```javascript
// dredd-hooks.js
const hooks = require('hooks');

hooks.before('GET /api/users > 200', function (transaction) {
  // Add custom headers or authentication
  transaction.request.headers['Authorization'] = 'Bearer token123';
});

hooks.afterEach(function (transaction) {
  // Log transaction details
  console.log(`${transaction.request.method} ${transaction.request.uri}`);
});
```

Use with:

```bash
arela validate contracts --hookfiles dredd-hooks.js
```

## Best Practices

### 1. Keep Specs and Code in Sync

- Generate OpenAPI specs from code: `arela generate contracts`
- Validate contracts in CI/CD
- Use `--drift-only` flag to identify schema drift

### 2. Use Semantic Versioning

```yaml
info:
  title: Users API
  version: 1.2.3  # Semantic versioning
```

When making breaking changes, bump the major version.

### 3. Document Your Endpoints

```yaml
paths:
  /api/users:
    get:
      summary: List all users
      description: |
        Returns a paginated list of users.

        Supports filtering by role and status.
      tags:
        - Users
      parameters:
        - name: role
          in: query
          required: false
          description: Filter by user role
```

### 4. Use References for Reusable Schemas

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: number

paths:
  /api/users:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

### 5. Test Error Responses

```yaml
paths:
  /api/users/{id}:
    get:
      responses:
        '200':
          description: Success
        '400':
          description: Bad request
        '404':
          description: User not found
        '500':
          description: Server error
```

## Troubleshooting

### Server Connection Failed

```
Error: Server did not become available at http://localhost:3000
```

**Solutions:**
- Ensure your server is running
- Check the URL is correct
- Increase timeout: Modify `waitForServer` in contract-validator.ts

### No OpenAPI Specs Found

```
Error: No OpenAPI specs found in openapi/ directory
```

**Solutions:**
- Create `openapi/` directory
- Add `.yaml` or `.json` OpenAPI specs
- Use `--contract` flag to specify a spec

### Dredd Timeout

```
Dredd timed out waiting for response
```

**Solutions:**
- Ensure API responses are fast
- Check for database connection issues
- Increase timeout in Dredd configuration

## Related Documentation

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Dredd Documentation](https://dredd.org/)
- [Contract Generation](./contracts.md)
- [API Flow Architecture](./architecture.md)

## See Also

- `arela generate contracts` - Generate OpenAPI specs from code
- `arela analyze architecture` - Analyze API architecture
- GitHub Actions Workflow: `.github/workflows/contract-validation.yml`
