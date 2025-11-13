# CODEX-001: Test Strategy Optimizer

## Priority
🟡 HIGH

## Complexity
Medium (3-4 hours)

## Phase
Phase 2 - Intelligence (v3.8.0)

## Description
Build a test strategy optimizer that analyzes existing tests, identifies issues (mock overuse, missing coverage, slow tests), and recommends improvements. Specifically recommends Testcontainers for slice-level integration testing over mock-heavy unit tests.

## Context
This is the third intelligence feature for Arela v4.0.0. It analyzes test quality and provides actionable recommendations to improve test reliability and speed. This aligns with the research showing Testcontainers are superior to mocks for integration testing.

## Acceptance Criteria
- [ ] Scans test files (*.test.ts, *.spec.ts, *_test.py)
- [ ] Identifies mock usage patterns
- [ ] Calculates test coverage gaps
- [ ] Detects slow tests (>1s per test)
- [ ] Recommends Testcontainers for integration tests
- [ ] Suggests test organization by slice
- [ ] Outputs actionable recommendations

## CLI Interface
```bash
# Analyze tests in current directory
arela analyze tests

# Analyze specific directory
arela analyze tests --dir src/

# Export report
arela analyze tests --json test-report.json

# Verbose output
arela analyze tests --verbose
```

## Expected Output
```
🧪 Analyzing test strategy...

📊 Test Statistics:
   - Total tests: 247
   - Unit tests: 189 (76%)
   - Integration tests: 58 (24%)
   - Test files: 43
   - Average test time: 1.2s

❌ Issues Found:

🔴 Critical (3):
   1. Mock Overuse
      - 142 tests use mocks (57%)
      - High risk of false positives
      - Recommendation: Use Testcontainers for integration tests

   2. Missing Coverage
      - API endpoints: 34/103 tested (33%)
      - Database operations: 12/45 tested (27%)
      - Recommendation: Add slice-level integration tests

   3. Slow Tests
      - 23 tests take >2s (9%)
      - Total suite time: 4m 32s
      - Recommendation: Parallelize with Testcontainers

🟡 Warnings (5):
   1. No slice-level tests found
   2. Tests scattered across directories
   3. Inconsistent naming conventions
   4. Missing error case coverage
   5. No contract testing (API drift risk)

💡 Recommendations:

1. 🐳 Adopt Testcontainers
   - Replace 142 mock-heavy tests with real containers
   - Test against real PostgreSQL, Redis, etc.
   - Estimated improvement: 40% fewer false positives

2. 📦 Organize Tests by Slice
   - Create tests/authentication/
   - Create tests/workout/
   - Create tests/nutrition/
   - Create tests/social/

3. ⚡ Parallelize Tests
   - Use Testcontainers parallel execution
   - Estimated improvement: 3x faster (4m 32s → 1m 30s)

4. 📝 Add Contract Tests
   - Use Dredd with generated OpenAPI specs
   - Catch API drift before deployment

📋 Next step: arela generate testcontainers
```

## Technical Implementation

### Algorithm

**Step 1: Scan Test Files**
```typescript
// Find all test files
const testFiles = await glob('**/*.{test,spec}.{ts,js,py}', {
  ignore: ['node_modules', 'dist', 'build']
});
```

**Step 2: Analyze Test Patterns**
```typescript
// Detect mocks
const mockPatterns = [
  /jest\.mock\(/,
  /vi\.mock\(/,
  /sinon\.stub\(/,
  /unittest\.mock/,
];

// Count mock usage
for (const file of testFiles) {
  const content = await fs.readFile(file, 'utf-8');
  const mockCount = mockPatterns.reduce((sum, pattern) => 
    sum + (content.match(pattern) || []).length, 0
  );
}
```

**Step 3: Detect Test Types**
```typescript
// Unit test: tests single function in isolation
// Integration test: tests multiple components together
// E2E test: tests full user flow

function detectTestType(content: string): TestType {
  if (content.includes('Testcontainers') || content.includes('docker')) {
    return 'integration';
  }
  if (content.includes('mock') || content.includes('stub')) {
    return 'unit';
  }
  if (content.includes('browser') || content.includes('playwright')) {
    return 'e2e';
  }
  return 'unknown';
}
```

**Step 4: Calculate Coverage Gaps**
```typescript
// Compare tested vs untested
const allEndpoints = await loadEndpointsFromGraphDB();
const testedEndpoints = await findTestedEndpoints(testFiles);
const coverage = (testedEndpoints.length / allEndpoints.length) * 100;
```

**Step 5: Detect Slow Tests**
```typescript
// Parse test output for timing
// Jest: "PASS  src/auth.test.ts (2.3s)"
// Pytest: "test_auth.py::test_login PASSED [100%] 2.30s"

const slowTests = tests.filter(t => t.duration > 1000); // >1s
```

**Step 6: Generate Recommendations**
```typescript
const recommendations = [];

if (mockPercentage > 50) {
  recommendations.push({
    priority: 'critical',
    title: 'Mock Overuse',
    description: `${mockCount} tests use mocks (${mockPercentage}%)`,
    solution: 'Replace with Testcontainers for integration tests',
    impact: '40% fewer false positives',
  });
}

if (coveragePercentage < 70) {
  recommendations.push({
    priority: 'high',
    title: 'Missing Coverage',
    description: `Only ${coveragePercentage}% of endpoints tested`,
    solution: 'Add slice-level integration tests',
    impact: 'Catch bugs before production',
  });
}
```

### Files to Create
```
src/analyze/
├── tests.ts              # Main orchestrator (exports analyzeTests)
├── test-scanner.ts       # Scan and parse test files
├── mock-detector.ts      # Detect mock usage patterns
├── coverage-analyzer.ts  # Calculate coverage gaps
├── performance-analyzer.ts # Detect slow tests
├── recommender.ts        # Generate recommendations
├── reporter.ts           # Format and display results
└── types.ts              # TypeScript types
```

### Key Functions

```typescript
// src/analyze/tests.ts
export async function analyzeTests(
  repoPath: string,
  options?: AnalyzeOptions
): Promise<TestReport> {
  // 1. Scan test files
  const testFiles = await scanTestFiles(repoPath);
  
  // 2. Analyze each test file
  const analyses = await Promise.all(
    testFiles.map(f => analyzeTestFile(f))
  );
  
  // 3. Detect patterns
  const mockUsage = detectMockUsage(analyses);
  const coverage = await calculateCoverage(repoPath, analyses);
  const slowTests = detectSlowTests(analyses);
  
  // 4. Generate recommendations
  const recommendations = generateRecommendations({
    mockUsage,
    coverage,
    slowTests,
    totalTests: analyses.length,
  });
  
  return {
    statistics: {
      totalTests: analyses.length,
      unitTests: analyses.filter(a => a.type === 'unit').length,
      integrationTests: analyses.filter(a => a.type === 'integration').length,
      averageTime: calculateAverageTime(analyses),
    },
    issues: recommendations.filter(r => r.priority !== 'info'),
    recommendations,
  };
}
```

```typescript
// src/analyze/mock-detector.ts
export function detectMockUsage(analyses: TestAnalysis[]): MockUsage {
  const mockPatterns = {
    jest: /jest\.mock\(|jest\.fn\(/g,
    vitest: /vi\.mock\(|vi\.fn\(/g,
    sinon: /sinon\.stub\(|sinon\.spy\(/g,
    python: /unittest\.mock|@patch|MagicMock/g,
  };
  
  let totalMocks = 0;
  const mocksByFile: Record<string, number> = {};
  
  for (const analysis of analyses) {
    let fileMocks = 0;
    
    for (const [framework, pattern] of Object.entries(mockPatterns)) {
      const matches = analysis.content.match(pattern);
      if (matches) {
        fileMocks += matches.length;
      }
    }
    
    if (fileMocks > 0) {
      mocksByFile[analysis.file] = fileMocks;
      totalMocks += fileMocks;
    }
  }
  
  return {
    total: totalMocks,
    percentage: (totalMocks / analyses.length) * 100,
    byFile: mocksByFile,
  };
}
```

```typescript
// src/analyze/coverage-analyzer.ts
export async function calculateCoverage(
  repoPath: string,
  analyses: TestAnalysis[]
): Promise<Coverage> {
  // Load all endpoints from Graph DB
  const allEndpoints = await loadEndpointsFromGraphDB(repoPath);
  
  // Find which endpoints are tested
  const testedEndpoints = new Set<string>();
  
  for (const analysis of analyses) {
    // Look for endpoint references in tests
    const endpointRefs = analysis.content.match(/['"`](\/api\/[^'"`]+)['"`]/g);
    if (endpointRefs) {
      endpointRefs.forEach(ref => testedEndpoints.add(ref));
    }
  }
  
  return {
    endpoints: {
      total: allEndpoints.length,
      tested: testedEndpoints.size,
      percentage: (testedEndpoints.size / allEndpoints.length) * 100,
    },
    untested: allEndpoints.filter(e => !testedEndpoints.has(e.path)),
  };
}
```

```typescript
// src/analyze/recommender.ts
export function generateRecommendations(data: AnalysisData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // Mock overuse
  if (data.mockUsage.percentage > 50) {
    recommendations.push({
      priority: 'critical',
      title: 'Mock Overuse',
      description: `${data.mockUsage.total} mocks found (${data.mockUsage.percentage.toFixed(0)}% of tests)`,
      solution: 'Replace mock-heavy tests with Testcontainers',
      impact: '40% fewer false positives, more reliable tests',
      example: `
// Before (mock-heavy)
const mockDb = jest.fn();
test('creates user', () => {
  mockDb.mockReturnValue({ id: 1 });
  // ...
});

// After (Testcontainers)
const container = await new PostgreSqlContainer().start();
test('creates user', async () => {
  const db = await connect(container.getConnectionString());
  // Test against real database
});
      `,
    });
  }
  
  // Missing coverage
  if (data.coverage.endpoints.percentage < 70) {
    recommendations.push({
      priority: 'high',
      title: 'Missing Coverage',
      description: `Only ${data.coverage.endpoints.tested}/${data.coverage.endpoints.total} endpoints tested (${data.coverage.endpoints.percentage.toFixed(0)}%)`,
      solution: 'Add slice-level integration tests',
      impact: 'Catch bugs before production',
    });
  }
  
  // Slow tests
  if (data.slowTests.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Slow Tests',
      description: `${data.slowTests.length} tests take >1s`,
      solution: 'Parallelize with Testcontainers',
      impact: `Estimated 3x faster (${data.totalTime}s → ${data.totalTime / 3}s)`,
    });
  }
  
  return recommendations;
}
```

## Dependencies
- Graph DB from Phase 1 (for endpoint coverage)
- fast-glob (for file scanning)

## Integration Points
- **Input:** Test files (*.test.ts, *.spec.ts, *_test.py)
- **Input:** Graph DB (for coverage calculation)
- **Output:** Test analysis report (JSON + formatted terminal)

## Testing Strategy
- Test with Stride repos (analyze existing tests)
- Test with Arela repo (self-analysis)
- Verify mock detection accuracy
- Validate coverage calculations

## Performance Considerations
- Scan files in parallel
- Cache Graph DB queries
- Target: <5 seconds for 100 test files

## Example Usage
```bash
# Analyze Stride tests
arela analyze tests --dir /Users/Star/stride-mobile

# Expected output:
# - 247 tests analyzed
# - 142 mocks detected (57%)
# - 33% endpoint coverage
# - Recommendations for Testcontainers
```

## Notes
- Focus on actionable recommendations
- Provide code examples for improvements
- Link to Testcontainers documentation
- Save report to `.arela/test-analysis.json`

## Related Features
- Depends on: Feature 6.1 (Graph DB for coverage)
- Depends on: Feature 6.2 (Slice Detection for organization)
- Enables: Better test quality and reliability

## Estimated Time
3-4 hours

## Agent Assignment
Codex (Straightforward analysis and pattern detection)
