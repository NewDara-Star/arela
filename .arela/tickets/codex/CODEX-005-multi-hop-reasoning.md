# CODEX-005: Multi-Hop Reasoning

**Agent:** codex  
**Priority:** Medium  
**Complexity:** High  
**Estimated Time:** 6-8 hours  
**Status:** Ready

---

## Context

Complex queries often require multiple steps to answer. For example, "How does the authentication flow work from login to dashboard?" requires:
1. Understanding the login endpoint
2. Following the token generation
3. Tracing the session creation
4. Finding the dashboard route

**Current limitation:** Arela retrieves context in one shot, which may miss intermediate steps.

**Solution:** Multi-hop reasoning - break complex queries into sub-queries, route each independently, and combine results.

---

## Requirements

### 1. Query Decomposer (`src/reasoning/decomposer.ts`)

Break complex queries into sub-queries:

```typescript
interface SubQuery {
  id: string;
  query: string;
  dependencies: string[]; // IDs of queries that must complete first
  priority: number;
}

interface DecompositionResult {
  isComplex: boolean;
  subQueries: SubQuery[];
  strategy: 'sequential' | 'parallel' | 'hybrid';
}

class QueryDecomposer {
  async decompose(query: string): Promise<DecompositionResult>;
  
  // Detect if query is complex enough to decompose
  private isComplexQuery(query: string): boolean;
  
  // Use LLM to break down query
  private async breakDown(query: string): Promise<SubQuery[]>;
}
```

### 2. Multi-Hop Router (`src/reasoning/multi-hop-router.ts`)

Execute sub-queries and combine results:

```typescript
interface HopResult {
  subQueryId: string;
  context: string[];
  relevanceScore: number;
}

class MultiHopRouter {
  async route(decomposition: DecompositionResult): Promise<string[]>;
  
  // Execute sub-queries based on strategy
  private async executeSequential(subQueries: SubQuery[]): Promise<HopResult[]>;
  private async executeParallel(subQueries: SubQuery[]): Promise<HopResult[]>;
  private async executeHybrid(subQueries: SubQuery[]): Promise<HopResult[]>;
  
  // Combine results from all hops
  private combineResults(results: HopResult[]): string[];
}
```

### 3. Result Combiner (`src/reasoning/combiner.ts`)

Intelligently merge results from multiple hops:

```typescript
class ResultCombiner {
  // Remove duplicates across hops
  deduplicate(results: HopResult[]): HopResult[];
  
  // Rank by relevance and hop order
  rank(results: HopResult[]): HopResult[];
  
  // Build coherent narrative from hops
  buildNarrative(results: HopResult[]): string[];
}
```

### 4. CLI Integration

```bash
# Enable multi-hop reasoning
arela route "How does auth flow work?" --multi-hop

# Show decomposition
arela route "Complex query" --multi-hop --verbose
# Output:
# 🔍 Decomposing query...
# Sub-query 1: "What is the login endpoint?"
# Sub-query 2: "How is the token generated?"
# Sub-query 3: "Where is the session stored?"
# 
# 🎯 Executing 3 hops...
# Hop 1: Found 5 results
# Hop 2: Found 3 results
# Hop 3: Found 4 results
# 
# ✅ Combined 12 results
```

---

## Implementation Steps

### Step 1: Query Decomposer (2-3 hours)

**File:** `src/reasoning/decomposer.ts`

**Complexity Detection:**
```typescript
private isComplexQuery(query: string): boolean {
  // Heuristics for complexity
  const indicators = [
    query.includes(' and '),
    query.includes(' then '),
    query.includes('flow'),
    query.includes('process'),
    query.includes('from') && query.includes('to'),
    query.split(' ').length > 10,
  ];
  
  return indicators.filter(Boolean).length >= 2;
}
```

**LLM Decomposition:**
```typescript
private async breakDown(query: string): Promise<SubQuery[]> {
  const prompt = `Break down this complex query into 2-4 simpler sub-queries:

Query: "${query}"

Return JSON array of sub-queries with dependencies:
[
  {
    "id": "1",
    "query": "First sub-query",
    "dependencies": [],
    "priority": 1
  },
  {
    "id": "2", 
    "query": "Second sub-query",
    "dependencies": ["1"],
    "priority": 2
  }
]`;

  const response = await this.llm.generate(prompt);
  return JSON.parse(response);
}
```

### Step 2: Multi-Hop Router (2-3 hours)

**File:** `src/reasoning/multi-hop-router.ts`

**Sequential Execution:**
```typescript
private async executeSequential(subQueries: SubQuery[]): Promise<HopResult[]> {
  const results: HopResult[] = [];
  
  for (const subQuery of subQueries) {
    // Wait for dependencies
    await this.waitForDependencies(subQuery.dependencies, results);
    
    // Route sub-query
    const context = await this.contextRouter.route(subQuery.query);
    
    results.push({
      subQueryId: subQuery.id,
      context,
      relevanceScore: this.calculateRelevance(context),
    });
  }
  
  return results;
}
```

**Parallel Execution:**
```typescript
private async executeParallel(subQueries: SubQuery[]): Promise<HopResult[]> {
  // Execute all sub-queries in parallel
  const promises = subQueries.map(async (subQuery) => {
    const context = await this.contextRouter.route(subQuery.query);
    return {
      subQueryId: subQuery.id,
      context,
      relevanceScore: this.calculateRelevance(context),
    };
  });
  
  return Promise.all(promises);
}
```

### Step 3: Result Combiner (1-2 hours)

**File:** `src/reasoning/combiner.ts`

**Deduplication:**
```typescript
deduplicate(results: HopResult[]): HopResult[] {
  const seen = new Set<string>();
  const unique: HopResult[] = [];
  
  for (const result of results) {
    const filtered = result.context.filter(item => {
      const key = this.generateKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    if (filtered.length > 0) {
      unique.push({ ...result, context: filtered });
    }
  }
  
  return unique;
}
```

**Narrative Building:**
```typescript
buildNarrative(results: HopResult[]): string[] {
  // Sort by hop order
  const sorted = results.sort((a, b) => 
    parseInt(a.subQueryId) - parseInt(b.subQueryId)
  );
  
  // Combine with hop markers
  const narrative: string[] = [];
  for (const result of sorted) {
    narrative.push(`--- Hop ${result.subQueryId} ---`);
    narrative.push(...result.context);
  }
  
  return narrative;
}
```

### Step 4: CLI Integration (1 hour)

**File:** `src/cli.ts`

```typescript
program
  .command("route")
  .argument("<query>", "Query to route")
  .option("--multi-hop", "Enable multi-hop reasoning")
  .option("--verbose", "Show decomposition details")
  .action(async (query, opts) => {
    if (opts.multiHop) {
      const { QueryDecomposer } = await import("./reasoning/decomposer.js");
      const { MultiHopRouter } = await import("./reasoning/multi-hop-router.js");
      
      const decomposer = new QueryDecomposer();
      const router = new MultiHopRouter();
      
      const decomposition = await decomposer.decompose(query);
      
      if (opts.verbose) {
        console.log("🔍 Decomposing query...");
        decomposition.subQueries.forEach(sq => {
          console.log(`Sub-query ${sq.id}: "${sq.query}"`);
        });
      }
      
      const results = await router.route(decomposition);
      // Display results
    } else {
      // Regular routing
    }
  });
```

### Step 5: Tests (1-2 hours)

**File:** `test/reasoning/multi-hop.test.ts`

```typescript
describe('Multi-Hop Reasoning', () => {
  describe('QueryDecomposer', () => {
    it('should detect complex queries');
    it('should decompose into sub-queries');
    it('should identify dependencies');
  });
  
  describe('MultiHopRouter', () => {
    it('should execute sequential hops');
    it('should execute parallel hops');
    it('should handle dependencies');
  });
  
  describe('ResultCombiner', () => {
    it('should deduplicate results');
    it('should rank by relevance');
    it('should build coherent narrative');
  });
});
```

---

## Success Criteria

- [ ] Decomposer detects complex queries (>80% accuracy)
- [ ] Sub-queries are semantically correct
- [ ] Sequential execution respects dependencies
- [ ] Parallel execution is faster than sequential
- [ ] Results are deduplicated
- [ ] Narrative is coherent
- [ ] CLI integration works
- [ ] All tests passing (8+ tests)

---

## Files to Create

```
src/reasoning/
├── decomposer.ts       # Query decomposition
├── multi-hop-router.ts # Multi-hop execution
├── combiner.ts         # Result combination
├── types.ts            # TypeScript types
└── index.ts            # Exports

test/reasoning/
└── multi-hop.test.ts   # Tests
```

---

## Example Output

```bash
$ arela route "How does authentication flow work from login to dashboard?" --multi-hop --verbose

🔍 Decomposing query...
Sub-query 1: "What is the login endpoint?"
Sub-query 2: "How is the token generated after login?"
Sub-query 3: "How is the session created with the token?"
Sub-query 4: "What is the dashboard route?"

🎯 Executing 4 hops (sequential)...

Hop 1: Login Endpoint
  ✅ Found 3 results
  - src/api/auth/login.ts
  - src/routes/auth.ts
  - docs/api/authentication.md

Hop 2: Token Generation
  ✅ Found 2 results
  - src/auth/jwt.ts
  - src/utils/token-generator.ts

Hop 3: Session Creation
  ✅ Found 4 results
  - src/session/session-manager.ts
  - src/middleware/session.ts
  - src/database/session-store.ts

Hop 4: Dashboard Route
  ✅ Found 2 results
  - src/routes/dashboard.ts
  - src/pages/Dashboard.tsx

✅ Combined 11 results (deduplicated from 15)

📊 Multi-Hop Stats:
  Total hops: 4
  Total time: 3.2s
  Results per hop: 2.75 avg
  Deduplication: 27% reduction
```

---

## Technical Notes

**When to Use Multi-Hop:**
- Query mentions "flow" or "process"
- Query has multiple parts (and/then/from/to)
- Query is >10 words
- Single-hop retrieval is insufficient

**Execution Strategies:**
- **Sequential:** When hops have dependencies (A → B → C)
- **Parallel:** When hops are independent (A, B, C)
- **Hybrid:** Mix of both (A → [B, C] → D)

**Performance:**
- Sequential: 1-2s per hop
- Parallel: Same as single hop
- Overhead: ~500ms for decomposition

---

## Dependencies

**Existing:**
- Context Router (already built)
- LLM Synthesizer (for decomposition)
- Fusion Engine (for deduplication)

**New:**
- None - uses existing infrastructure

---

## Testing

```bash
npm test -- reasoning --run
```

**Expected:** 8+ tests passing

---

## Questions?

Use `arela_search` to find:
- Context router implementation
- Fusion engine patterns
- LLM synthesis examples

**Search queries:**
```
arela_search "context router implementation"
arela_search "fusion engine deduplication"
arela_search "LLM synthesis patterns"
```

---

## Ready to Start?

1. Create `src/reasoning/` directory
2. Implement decomposer first (foundation)
3. Then multi-hop router (uses decomposer)
4. Then combiner (uses router results)
5. Finally CLI integration (ties it together)

**Ship it when all tests pass!** 🚀
