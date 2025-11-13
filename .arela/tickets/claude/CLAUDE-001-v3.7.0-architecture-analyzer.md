# CLAUDE-001: Multi-Repo Architecture Analyzer

## Priority
🔴 CRITICAL

## Complexity
Medium (3-4 hours)

## Phase
Phase 1 - Foundation (v3.7.0)

## Description
Build a multi-repository architecture analyzer that detects whether a codebase is horizontally layered or vertically sliced, calculates coupling/cohesion scores, and provides actionable recommendations for VSA migration.

## Context
This is the foundation feature for Arela v4.0.0. It enables Arela to understand codebase structure across multiple repositories (e.g., mobile + backend) and identify architectural issues. This powers all downstream features like slice detection and autonomous refactoring.

## Acceptance Criteria
- [ ] Detects horizontal vs vertical architecture
- [ ] Works with single or multiple repositories
- [ ] Calculates accurate coupling/cohesion scores (0-100)
- [ ] Identifies cross-layer dependencies
- [ ] Provides actionable recommendations
- [ ] Outputs clear, formatted results

## CLI Interface
```bash
# Single repo
arela analyze architecture

# Multi-repo (Stride example)
arela analyze architecture /Users/Star/stride-mobile /Users/Star/stride-backend

# With options
arela analyze architecture --verbose
arela analyze architecture --output json
```

## Expected Output
```
🔍 Analyzing architecture across 2 repositories...

📊 Architecture Type: Horizontal (Layered)
   - stride-mobile: 78% horizontal
   - stride-backend: 82% horizontal

❌ Issues Found:
   1. High cross-layer coupling (87%)
   2. Low feature cohesion (34%)
   3. API contract drift (12 endpoints)
   4. Shared state in services/ (23 files)

💡 Recommendation: Migrate to Vertical Slice Architecture
   - Estimated effort: 8-12 weeks
   - Breakeven: 14 months
   - 3-year ROI: 380%

📋 Next step: arela detect slices
```

## Technical Implementation

### Algorithm
1. **Load dependency graph** from existing RAG index
2. **Detect directory patterns**:
   - Horizontal: `components/`, `services/`, `controllers/`, `models/`
   - Vertical: `features/`, `modules/`, slice-named directories
3. **Calculate coupling**:
   - Count cross-directory imports
   - Weight by directory type (layer vs feature)
   - Score: 0 (perfect) to 100 (tightly coupled)
4. **Calculate cohesion**:
   - Measure intra-directory imports
   - Compare to inter-directory imports
   - Score: 0 (scattered) to 100 (cohesive)
5. **Detect API drift** (multi-repo):
   - Find API calls in frontend (fetch, axios, etc.)
   - Match to backend routes (Express, Fastify, etc.)
   - Identify mismatches

### Files to Create
```
src/analyze/
├── architecture.ts       # Main analyzer (exports analyzeArchitecture)
├── coupling.ts           # Coupling calculator
├── cohesion.ts           # Cohesion calculator
├── multi-repo.ts         # Multi-repo coordinator
├── patterns.ts           # Directory pattern detection
└── types.ts              # TypeScript types
```

### Key Functions
```typescript
// src/analyze/architecture.ts
export async function analyzeArchitecture(
  paths: string[],
  options?: AnalyzeOptions
): Promise<ArchitectureReport> {
  // 1. Load dependency graphs for all repos
  // 2. Detect patterns (horizontal vs vertical)
  // 3. Calculate coupling/cohesion
  // 4. Generate recommendations
  // 5. Return formatted report
}

// src/analyze/coupling.ts
export function calculateCoupling(graph: DependencyGraph): number {
  // Count cross-layer/cross-module imports
  // Weight by distance (same layer = low, cross-layer = high)
  // Return score 0-100
}

// src/analyze/cohesion.ts
export function calculateCohesion(graph: DependencyGraph): number {
  // Measure intra-module imports vs inter-module
  // Higher ratio = higher cohesion
  // Return score 0-100
}
```

### Dependencies
- Use existing RAG index (already has file/import data)
- Use `ts-morph` for additional AST parsing if needed
- Use `picocolors` for terminal output

## Integration Points
- **Input:** Existing RAG index from `arela index`
- **Output:** JSON report + formatted terminal output
- **Next step:** Feeds into Feature 6.2 (Slice Detection)

## Testing Strategy
- Test with Stride repos (known horizontal architecture)
- Test with Arela repo (already VSA-ish)
- Verify coupling/cohesion scores are reasonable
- Test multi-repo linking (API call detection)

## Example Usage
```bash
# Analyze Stride
cd /Users/Star/stride-mobile
arela index

cd /Users/Star/stride-backend
arela index

arela analyze architecture /Users/Star/stride-mobile /Users/Star/stride-backend
```

## Notes
- Start with static analysis only (no dynamic runtime analysis yet)
- Focus on TypeScript/JavaScript initially
- Multi-repo linking via API call pattern matching (fetch/axios → Express routes)
- Save report to `.arela/reports/architecture-{timestamp}.json`

## Related Features
- Depends on: Existing RAG index
- Enables: Feature 6.2 (Slice Detection)
- Enables: Feature 1.1 complete

## Estimated Time
3-4 hours

## Agent Assignment
Claude (Architect-level analysis and recommendation generation)
