# CODEX-006: API Versioning Detection and Management

## Context
From Research Paper 1, we learned that **versioning via new slices** is the recommended strategy for handling breaking API changes. Instead of modifying an existing slice (which breaks old clients), create a v2 slice that runs side-by-side with v1.

This enables:
- ✅ Backwards compatibility (old clients keep working)
- ✅ Gradual migration (new clients use v2)
- ✅ Safe rollout (can rollback v2 without affecting v1)
- ✅ Clear deprecation path (remove v1 when ready)

## Problem
Currently, there's no detection of breaking API changes or guidance on versioning. Developers might:
- ❌ Modify existing slices (breaking old clients)
- ❌ Not realize they made a breaking change
- ❌ Create inconsistent versioning schemes

## Solution
Implement two commands:
1. `arela version detect-drift` - Detect breaking changes
2. `arela version create <slice> --version 2` - Create v2 slice

## Command Structure
```bash
# Detect breaking changes
arela version detect-drift

# Create v2 of a slice
arela version create workout-session --version 2

# List all versions
arela version list

# Deprecate old version
arela version deprecate workout-session --version 1
```

## Implementation

### 1. Breaking Change Detector
```typescript
// src/version/drift-detector.ts

import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { glob } from 'glob';

export interface BreakingChange {
  file: string;
  type: 'removed-field' | 'changed-type' | 'removed-endpoint' | 'changed-response';
  field?: string;
  oldValue: string;
  newValue: string;
  severity: 'critical' | 'major' | 'minor';
}

export async function detectBreakingChanges(
  repoPath: string
): Promise<BreakingChange[]> {
  const changes: BreakingChange[] = [];
  
  // 1. Find all OpenAPI specs
  const specs = await glob('openapi/**/*.yaml', { cwd: repoPath });
  
  for (const specPath of specs) {
    // 2. Compare with previous version (from git)
    const current = await readOpenAPISpec(specPath);
    const previous = await getPreviousVersion(specPath);
    
    if (!previous) continue; // No previous version
    
    // 3. Detect changes
    const specChanges = compareSpecs(current, previous);
    changes.push(...specChanges);
  }
  
  return changes;
}

function compareSpecs(current: any, previous: any): BreakingChange[] {
  const changes: BreakingChange[] = [];
  
  // Check for removed endpoints
  for (const path in previous.paths) {
    if (!current.paths[path]) {
      changes.push({
        file: 'openapi.yaml',
        type: 'removed-endpoint',
        oldValue: path,
        newValue: 'removed',
        severity: 'critical',
      });
    }
  }
  
  // Check for removed/changed fields
  for (const path in current.paths) {
    if (!previous.paths[path]) continue;
    
    for (const method in current.paths[path]) {
      const currentOp = current.paths[path][method];
      const previousOp = previous.paths[path]?.[method];
      
      if (!previousOp) continue;
      
      // Compare response schemas
      const currentSchema = currentOp.responses?.['200']?.content?.['application/json']?.schema;
      const previousSchema = previousOp.responses?.['200']?.content?.['application/json']?.schema;
      
      if (currentSchema && previousSchema) {
        const fieldChanges = compareSchemas(currentSchema, previousSchema);
        changes.push(...fieldChanges.map(c => ({
          ...c,
          file: path,
        })));
      }
    }
  }
  
  return changes;
}

function compareSchemas(current: any, previous: any): BreakingChange[] {
  const changes: BreakingChange[] = [];
  
  // Check for removed required fields
  const previousRequired = previous.required || [];
  const currentRequired = current.required || [];
  
  for (const field of previousRequired) {
    if (!currentRequired.includes(field)) {
      changes.push({
        file: '',
        type: 'removed-field',
        field,
        oldValue: 'required',
        newValue: 'removed',
        severity: 'critical',
      });
    }
  }
  
  // Check for type changes
  const previousProps = previous.properties || {};
  const currentProps = current.properties || {};
  
  for (const field in previousProps) {
    if (currentProps[field]) {
      const oldType = previousProps[field].type;
      const newType = currentProps[field].type;
      
      if (oldType !== newType) {
        changes.push({
          file: '',
          type: 'changed-type',
          field,
          oldValue: oldType,
          newValue: newType,
          severity: 'major',
        });
      }
    }
  }
  
  return changes;
}
```

### 2. Version Creator
```typescript
// src/version/version-creator.ts

import { copy, readFile, writeFile } from 'fs-extra';
import path from 'path';

export async function createSliceVersion(
  repoPath: string,
  sliceName: string,
  version: number
): Promise<void> {
  const featuresDir = path.join(repoPath, 'features');
  const oldSlicePath = path.join(featuresDir, sliceName);
  const newSlicePath = path.join(featuresDir, `${sliceName}-v${version}`);
  
  // 1. Copy slice directory
  await copy(oldSlicePath, newSlicePath);
  
  // 2. Update route paths (v1 -> v2)
  const routeFile = path.join(newSlicePath, 'routes.ts');
  let routeCode = await readFile(routeFile, 'utf-8');
  
  routeCode = routeCode.replace(
    /\/api\/v(\d+)\//g,
    `/api/v${version}/`
  );
  
  await writeFile(routeFile, routeCode);
  
  // 3. Update OpenAPI spec
  const oldSpecPath = path.join(repoPath, 'openapi', `${sliceName}-api.yaml`);
  const newSpecPath = path.join(repoPath, 'openapi', `${sliceName}-api-v${version}.yaml`);
  
  await copy(oldSpecPath, newSpecPath);
  
  let spec = await readFile(newSpecPath, 'utf-8');
  spec = spec.replace(/version: '1\.0\.0'/, `version: '${version}.0.0'`);
  spec = spec.replace(/\/api\/v1\//g, `/api/v${version}/`);
  
  await writeFile(newSpecPath, spec);
  
  console.log(`✅ Created ${sliceName} v${version}`);
  console.log(`   Slice: ${newSlicePath}`);
  console.log(`   Contract: ${newSpecPath}`);
}
```

### 3. CLI Commands
```typescript
// src/cli.ts

program
  .command('version detect-drift')
  .description('Detect breaking API changes')
  .action(async () => {
    console.log('🔍 Detecting breaking changes...\n');
    
    try {
      const changes = await detectBreakingChanges(process.cwd());
      
      if (changes.length === 0) {
        console.log('✅ No breaking changes detected\n');
        return;
      }
      
      console.log(`⚠️  Found ${changes.length} breaking changes:\n`);
      
      for (const change of changes) {
        const emoji = change.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`${emoji} ${change.type} in ${change.file}`);
        if (change.field) {
          console.log(`   Field: ${change.field}`);
        }
        console.log(`   Old: ${change.oldValue}`);
        console.log(`   New: ${change.newValue}`);
        console.log(`   Severity: ${change.severity}\n`);
      }
      
      console.log('💡 Recommendation: Create a v2 slice instead of modifying v1');
      console.log('   Run: arela version create <slice> --version 2\n');
      
      process.exit(1); // Fail CI if breaking changes
    } catch (error) {
      console.error('Error detecting drift:', error);
      process.exit(1);
    }
  });

program
  .command('version create <slice>')
  .description('Create a new version of a slice')
  .option('--version <number>', 'Version number', '2')
  .action(async (slice, options) => {
    console.log(`📦 Creating ${slice} v${options.version}...\n`);
    
    try {
      await createSliceVersion(process.cwd(), slice, parseInt(options.version));
      
      console.log('\n✅ Version created!');
      console.log('\nNext steps:');
      console.log('1. Implement breaking changes in the v2 slice');
      console.log('2. Update the v2 OpenAPI contract');
      console.log('3. Test both v1 and v2 endpoints');
      console.log('4. Deploy (both versions run side-by-side)');
      console.log('5. Migrate clients gradually');
      console.log('6. Deprecate v1 when ready\n');
    } catch (error) {
      console.error('Error creating version:', error);
      process.exit(1);
    }
  });
```

### 4. CI Integration
```yaml
# .github/workflows/version-check.yml
name: Version Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Need history for comparison
      
      - name: Detect breaking changes
        run: npx arela version detect-drift
        continue-on-error: true  # Don't fail, just warn
      
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Breaking API changes detected! Consider creating a v2 slice instead.'
            })
```

## Acceptance Criteria
- [ ] `arela version detect-drift` command implemented
- [ ] Detects removed endpoints
- [ ] Detects removed/changed fields
- [ ] Detects type changes
- [ ] `arela version create` command implemented
- [ ] Copies slice directory
- [ ] Updates route paths (v1 -> v2)
- [ ] Creates new OpenAPI contract
- [ ] CI integration example provided
- [ ] Documentation added

## Testing
```bash
# Create test slice
mkdir -p features/workout-session
echo "export const route = '/api/v1/workout/session';" > features/workout-session/routes.ts

# Create v2
arela version create workout-session --version 2

# Verify
ls features/
# Should show: workout-session, workout-session-v2

cat features/workout-session-v2/routes.ts
# Should show: /api/v2/workout/session
```

## Files to Create
- `src/version/drift-detector.ts`
- `src/version/version-creator.ts`
- `src/version/schema-comparator.ts`
- `test/version/drift-detector.test.ts`
- `docs/versioning.md`

## Priority
**P2 - MEDIUM**

Important for production safety, but not blocking other features.

## Dependencies
- None (can start immediately)

## Notes
- Breaking changes should fail CI (or at least warn)
- v1 and v2 run side-by-side in same deployment
- Gradual migration is key (don't force all clients to upgrade)
- Deprecation should be explicit (add deprecation warnings to v1)
