# CLAUDE-004: Contract Validation with Dredd Integration

## Context
From Research Paper 1 (Software Development Approaches Comparison), we learned that **contract enforcement** is critical to prevent "schema drift" where the API implementation diverges from the OpenAPI contract.

The recommended tool is **Dredd** - a spec-driven validator that directly validates a live API against its OpenAPI spec.

## Problem
Currently, Arela can generate OpenAPI contracts from code, but there's no automated validation that the API implementation actually matches the contract. This leads to:
- ❌ Frontend breaks when backend changes
- ❌ Contract drift (spec says one thing, API does another)
- ❌ No CI enforcement of contracts

## Solution
Implement `arela validate contracts` command that:
1. Reads all OpenAPI specs from `openapi/` directory
2. Starts the API server (or connects to running server)
3. Runs Dredd to validate each endpoint
4. Reports violations with clear error messages
5. Exits with error code for CI integration

## Architecture

### Command Structure
```bash
# Validate all contracts
arela validate contracts

# Validate specific contract
arela validate contracts --contract openapi/auth-api.yaml

# Watch mode for development
arela validate contracts --watch

# Specify server URL
arela validate contracts --server http://localhost:3000

# Auto-start server
arela validate contracts --start-server "npm run dev"
```

### Implementation Plan

**1. Install Dredd dependency:**
```json
// package.json
{
  "dependencies": {
    "dredd": "^14.1.0",
    "@types/dredd": "^11.2.0"
  }
}
```

**2. Create contract validator:**
```typescript
// src/validate/contract-validator.ts

import Dredd from 'dredd';
import { glob } from 'glob';
import path from 'path';

export interface ContractValidationOptions {
  contractPath?: string;      // Specific contract to validate
  serverUrl?: string;          // API server URL
  startServer?: string;        // Command to start server
  watch?: boolean;             // Watch mode
  hookfiles?: string[];        // Custom hooks
}

export interface ContractValidationResult {
  passed: boolean;
  total: number;
  failures: number;
  errors: ContractError[];
}

export interface ContractError {
  endpoint: string;
  method: string;
  expected: string;
  actual: string;
  message: string;
}

export async function validateContracts(
  options: ContractValidationOptions
): Promise<ContractValidationResult> {
  // 1. Find OpenAPI specs
  const specs = await findOpenAPISpecs(options.contractPath);
  
  if (specs.length === 0) {
    throw new Error('No OpenAPI specs found in openapi/ directory');
  }
  
  // 2. Start server if needed
  let serverProcess;
  if (options.startServer) {
    serverProcess = await startAPIServer(options.startServer);
    await waitForServer(options.serverUrl || 'http://localhost:3000');
  }
  
  // 3. Run Dredd for each spec
  const results: ContractValidationResult[] = [];
  
  for (const spec of specs) {
    const result = await runDredd(spec, options.serverUrl);
    results.push(result);
  }
  
  // 4. Cleanup
  if (serverProcess) {
    serverProcess.kill();
  }
  
  // 5. Aggregate results
  return aggregateResults(results);
}

async function runDredd(
  specPath: string,
  serverUrl: string
): Promise<ContractValidationResult> {
  return new Promise((resolve, reject) => {
    const configuration = {
      endpoint: serverUrl,
      path: [specPath],
      hookfiles: [],
      reporter: ['json'],
      output: [],
      header: [],
      sorted: false,
      user: null,
      inline-errors: false,
      details: true,
      method: [],
      only: [],
      color: true,
      loglevel: 'warning',
      timestamp: false,
    };
    
    const dredd = new Dredd(configuration);
    
    const errors: ContractError[] = [];
    
    dredd.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      
      resolve({
        passed: stats.failures === 0 && stats.errors === 0,
        total: stats.total,
        failures: stats.failures + stats.errors,
        errors,
      });
    });
  });
}
```

**3. Add CLI command:**
```typescript
// src/cli.ts

program
  .command('validate contracts')
  .description('Validate API implementation against OpenAPI contracts')
  .option('--contract <path>', 'Specific contract to validate')
  .option('--server <url>', 'API server URL', 'http://localhost:3000')
  .option('--start-server <cmd>', 'Command to start API server')
  .option('--watch', 'Watch mode for development')
  .action(async (options) => {
    console.log('🔍 Validating API contracts...\n');
    
    try {
      const result = await validateContracts(options);
      
      if (result.passed) {
        console.log('✅ All contracts validated successfully!');
        console.log(`   ${result.total} endpoints tested\n`);
        process.exit(0);
      } else {
        console.log('❌ Contract validation failed!\n');
        console.log(`   Total: ${result.total} endpoints`);
        console.log(`   Failed: ${result.failures} endpoints\n`);
        
        // Print errors
        for (const error of result.errors) {
          console.log(`❌ ${error.method} ${error.endpoint}`);
          console.log(`   Expected: ${error.expected}`);
          console.log(`   Actual: ${error.actual}`);
          console.log(`   ${error.message}\n`);
        }
        
        process.exit(1);
      }
    } catch (error) {
      console.error('Error validating contracts:', error);
      process.exit(1);
    }
  });
```

**4. CI Integration:**
```yaml
# .github/workflows/contract-validation.yml
name: Contract Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Validate contracts
        run: npx arela validate contracts --start-server "npm run dev"
```

## Acceptance Criteria
- [ ] `arela validate contracts` command implemented
- [ ] Dredd integration working
- [ ] Validates all OpenAPI specs in `openapi/` directory
- [ ] Clear error messages for violations
- [ ] Can auto-start API server
- [ ] Watch mode for development
- [ ] CI integration example provided
- [ ] Documentation added to README
- [ ] Tests added for validator

## Testing

**Create test OpenAPI spec:**
```yaml
# test/fixtures/test-api.yaml
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /api/users:
    get:
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: number
                    name:
                      type: string
```

**Test validation:**
```bash
# Start test server
npm run test:server

# Run validation
arela validate contracts --contract test/fixtures/test-api.yaml --server http://localhost:3001

# Expected output:
# ✅ All contracts validated successfully!
#    1 endpoints tested
```

## Files to Create/Modify
- `src/validate/contract-validator.ts` (new)
- `src/validate/dredd-runner.ts` (new)
- `src/cli.ts` (add command)
- `test/validate/contract-validator.test.ts` (new)
- `docs/contract-validation.md` (new)
- `package.json` (add dredd dependency)

## Priority
**P1 - HIGH**

This is a core feature for the VSA + API-Contract-First workflow. Without it, contracts can drift from implementation.

## Dependencies
- None (can start immediately)

## References
- Research Paper 1: Software Development Approaches Comparison
- Dredd documentation: https://dredd.org/
- OpenAPI 3.1 spec: https://spec.openapis.org/oas/v3.1.0

## Notes
- Dredd is the "80/20 winner" over Pact (simpler, uses OpenAPI as single source of truth)
- This enables the full API-Contract-First workflow
- Critical for preventing schema drift in production
