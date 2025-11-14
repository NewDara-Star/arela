# CASCADE-004: Arela AI Governance Rules (Prevent Hallucination/Drift)

## Context
The user correctly identified that I (Cascade/Arela AI) can hallucinate or drift from VSA principles without programmatic enforcement. From Research Paper 1, we learned that **programmatic guards** are essential to catch mistakes before they reach production.

This applies to AI agents too! We need automated checks that:
- ✅ Verify I'm following VSA structure
- ✅ Ensure I generate contracts before code
- ✅ Validate I delegate to appropriate agents
- ✅ Check I run `arela doctor` before shipping

## Problem
Currently, there's no programmatic enforcement of my (Cascade's) behavior. I can:
- ❌ Forget to generate contracts first
- ❌ Create files in wrong locations (violating VSA)
- ❌ Skip validation steps
- ❌ Hallucinate incorrect patterns

## Solution
Implement **Arela AI Governance Rules** - a set of programmatic checks that run before I take actions.

## Architecture

### 1. Governance Rules Definition
```typescript
// .arela/governance/rules.ts

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  check: (action: AIAction) => Promise<RuleViolation | null>;
  severity: 'error' | 'warning';
}

export interface AIAction {
  type: 'create_file' | 'modify_file' | 'delete_file' | 'run_command' | 'create_ticket';
  path?: string;
  content?: string;
  command?: string;
  metadata?: Record<string, any>;
}

export interface RuleViolation {
  rule: string;
  message: string;
  suggestion: string;
}

// Core governance rules
export const governanceRules: GovernanceRule[] = [
  {
    id: 'vsa-structure',
    name: 'Enforce VSA Structure',
    description: 'All feature code must be in features/ directory',
    severity: 'error',
    check: async (action) => {
      if (action.type === 'create_file' && action.path) {
        // Check if creating a feature file outside features/
        if (action.path.includes('handler') || action.path.includes('route')) {
          if (!action.path.includes('features/')) {
            return {
              rule: 'vsa-structure',
              message: `Feature file created outside features/ directory: ${action.path}`,
              suggestion: 'Move to features/<slice-name>/',
            };
          }
        }
      }
      return null;
    },
  },
  
  {
    id: 'contract-first',
    name: 'API Contract First',
    description: 'OpenAPI contract must exist before implementation',
    severity: 'error',
    check: async (action) => {
      if (action.type === 'create_file' && action.path?.includes('routes')) {
        // Check if corresponding OpenAPI spec exists
        const sliceName = extractSliceName(action.path);
        const contractPath = `openapi/${sliceName}-api.yaml`;
        
        if (!await fileExists(contractPath)) {
          return {
            rule: 'contract-first',
            message: `Creating route without OpenAPI contract: ${action.path}`,
            suggestion: `Create ${contractPath} first`,
          };
        }
      }
      return null;
    },
  },
  
  {
    id: 'delegate-to-agents',
    name: 'Delegate Implementation to Agents',
    description: 'Cascade should create tickets, not implement code',
    severity: 'warning',
    check: async (action) => {
      if (action.type === 'create_file' && action.metadata?.agent === 'cascade') {
        // Cascade creating implementation code (should delegate)
        if (action.path?.match(/\.(ts|js|go|py)$/) && !action.path.includes('test')) {
          return {
            rule: 'delegate-to-agents',
            message: 'Cascade implementing code instead of delegating',
            suggestion: 'Create ticket for Codex or Claude',
          };
        }
      }
      return null;
    },
  },
  
  {
    id: 'validate-before-ship',
    name: 'Validate Before Shipping',
    description: 'Must run arela doctor before marking work complete',
    severity: 'error',
    check: async (action) => {
      if (action.type === 'run_command' && action.command?.includes('git commit')) {
        // Check if arela doctor was run recently
        const lastDoctorRun = await getLastDoctorRun();
        const timeSinceDoctor = Date.now() - lastDoctorRun;
        
        if (timeSinceDoctor > 5 * 60 * 1000) { // 5 minutes
          return {
            rule: 'validate-before-ship',
            message: 'Committing without running arela doctor',
            suggestion: 'Run: arela doctor --full',
          };
        }
      }
      return null;
    },
  },
  
  {
    id: 'no-cross-slice-imports',
    name: 'No Cross-Slice Imports',
    description: 'Slices cannot import from other slices',
    severity: 'error',
    check: async (action) => {
      if (action.type === 'create_file' || action.type === 'modify_file') {
        if (action.content) {
          // Check for cross-slice imports
          const imports = extractImports(action.content);
          const currentSlice = extractSliceName(action.path || '');
          
          for (const imp of imports) {
            if (imp.includes('features/') && !imp.includes(currentSlice)) {
              return {
                rule: 'no-cross-slice-imports',
                message: `Cross-slice import detected: ${imp}`,
                suggestion: 'Move shared code to shared/ or use events',
              };
            }
          }
        }
      }
      return null;
    },
  },
];
```

### 2. Governance Checker
```typescript
// src/governance/checker.ts

import { governanceRules, AIAction, RuleViolation } from '../../.arela/governance/rules';

export async function checkGovernance(action: AIAction): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  
  for (const rule of governanceRules) {
    const violation = await rule.check(action);
    
    if (violation) {
      violations.push(violation);
      
      if (rule.severity === 'error') {
        console.error(`🚨 Governance violation: ${violation.message}`);
        console.error(`   Suggestion: ${violation.suggestion}`);
      } else {
        console.warn(`⚠️  Governance warning: ${violation.message}`);
        console.warn(`   Suggestion: ${violation.suggestion}`);
      }
    }
  }
  
  return violations;
}

export async function enforceGovernance(action: AIAction): Promise<boolean> {
  const violations = await checkGovernance(action);
  
  // Block action if any error-level violations
  const errors = violations.filter(v => 
    governanceRules.find(r => r.id === v.rule)?.severity === 'error'
  );
  
  if (errors.length > 0) {
    console.error(`\n❌ Action blocked by governance rules:`);
    for (const error of errors) {
      console.error(`   - ${error.message}`);
    }
    console.error(`\nFix violations and try again.\n`);
    return false;
  }
  
  return true;
}
```

### 3. Integration with Cascade
```typescript
// src/ai/cascade-wrapper.ts

import { enforceGovernance } from '../governance/checker';

export class CascadeAgent {
  async createFile(path: string, content: string) {
    // Check governance before creating file
    const allowed = await enforceGovernance({
      type: 'create_file',
      path,
      content,
      metadata: { agent: 'cascade' },
    });
    
    if (!allowed) {
      throw new Error('Governance violation: Action blocked');
    }
    
    // Proceed with file creation
    await writeFile(path, content);
  }
  
  async runCommand(command: string) {
    // Check governance before running command
    const allowed = await enforceGovernance({
      type: 'run_command',
      command,
      metadata: { agent: 'cascade' },
    });
    
    if (!allowed) {
      throw new Error('Governance violation: Action blocked');
    }
    
    // Proceed with command
    await exec(command);
  }
}
```

### 4. CLI Command
```typescript
// src/cli.ts

program
  .command('governance check')
  .description('Check governance rules compliance')
  .action(async () => {
    console.log('🛡️  Checking governance compliance...\n');
    
    // Check recent actions from logs
    const recentActions = await getRecentActions();
    const allViolations: RuleViolation[] = [];
    
    for (const action of recentActions) {
      const violations = await checkGovernance(action);
      allViolations.push(...violations);
    }
    
    if (allViolations.length === 0) {
      console.log('✅ All governance rules satisfied\n');
    } else {
      console.log(`⚠️  Found ${allViolations.length} governance violations:\n`);
      for (const v of allViolations) {
        console.log(`   - ${v.message}`);
        console.log(`     Suggestion: ${v.suggestion}\n`);
      }
    }
  });
```

### 5. Pre-commit Hook
```bash
#!/bin/bash
# .arela/hooks/pre-commit

echo "🛡️  Running governance checks..."

# Check governance compliance
npx arela governance check

if [ $? -ne 0 ]; then
  echo "❌ Governance violations detected. Commit blocked."
  exit 1
fi

echo "✅ Governance checks passed"
exit 0
```

## Acceptance Criteria
- [ ] Governance rules defined in `.arela/governance/rules.ts`
- [ ] Rules check VSA structure enforcement
- [ ] Rules check contract-first workflow
- [ ] Rules check delegation to agents
- [ ] Rules check validation before commit
- [ ] Rules check no cross-slice imports
- [ ] `arela governance check` command implemented
- [ ] Pre-commit hook installed
- [ ] Integration with Cascade agent
- [ ] Documentation added

## Testing
```bash
# Install governance
arela setup governance

# Try to violate a rule (should fail)
# Example: Create route without contract
touch features/test/routes.ts

# Run check
arela governance check
# Should show: ❌ Creating route without OpenAPI contract

# Fix violation
touch openapi/test-api.yaml

# Run check again
arela governance check
# Should show: ✅ All governance rules satisfied
```

## Files to Create
- `.arela/governance/rules.ts`
- `src/governance/checker.ts`
- `src/governance/action-logger.ts`
- `src/ai/cascade-wrapper.ts`
- `.arela/hooks/pre-commit`
- `test/governance/checker.test.ts`
- `docs/governance.md`

## Priority
**P1 - HIGH**

Critical for preventing AI hallucination and ensuring quality. Without this, I can make mistakes that violate VSA principles.

## Dependencies
- None (can start immediately)

## Notes
- These rules apply to ME (Cascade), not just human developers
- Rules run before actions (preventive, not reactive)
- Pre-commit hook catches violations before they're committed
- Rules can be customized per project in `.arela/governance/rules.ts`
- This is the "programmatic check" the user demanded (correctly!)
