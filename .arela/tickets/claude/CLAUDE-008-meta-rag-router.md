# CLAUDE-008: Meta-RAG Router Implementation

**Priority:** HIGH  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Classifier (DONE), Hexi-Memory (HEXI-001-007)

## Context

We have a working query classifier (1.3-1.7s, qwen2.5:3b). Now we need the router that uses classification results to determine which memory layers to query.

**Current state:**
- ✅ Classifier: `src/meta-rag/classifier.ts` (DONE)
- ✅ Hexi-Memory: 6 layers implemented (Session, Project, User, Vector, Graph, Governance)
- ⏳ Router: NEEDS IMPLEMENTATION

## Task

Build the Meta-RAG router that:
1. Takes classification result (PROCEDURAL, FACTUAL, etc.)
2. Determines which memory layers to query
3. Returns layer selection + reasoning

## Technical Requirements

### File to Create

**`src/meta-rag/router.ts`**

```typescript
import { QueryType, ClassificationResult, MemoryLayer } from './types.js';

export interface RoutingDecision {
  layers: MemoryLayer[];
  reasoning: string;
  estimatedTokens: number;
}

export class MemoryRouter {
  /**
   * Route query to appropriate memory layers based on classification
   */
  route(classification: ClassificationResult): RoutingDecision {
    const { type, confidence } = classification;
    
    // Define routing rules
    const rules: Record<QueryType, MemoryLayer[]> = {
      PROCEDURAL: [MemoryLayer.SESSION, MemoryLayer.PROJECT, MemoryLayer.GRAPH],
      FACTUAL: [MemoryLayer.VECTOR],
      ARCHITECTURAL: [MemoryLayer.GRAPH, MemoryLayer.VECTOR],
      USER: [MemoryLayer.USER, MemoryLayer.PROJECT],
      HISTORICAL: [MemoryLayer.GOVERNANCE, MemoryLayer.PROJECT],
      GENERAL: [MemoryLayer.SESSION, MemoryLayer.VECTOR] // fallback
    };
    
    const layers = rules[type] || rules.GENERAL;
    
    return {
      layers,
      reasoning: this.explainRouting(type, layers),
      estimatedTokens: this.estimateTokens(layers)
    };
  }
  
  private explainRouting(type: QueryType, layers: MemoryLayer[]): string {
    // Return human-readable explanation
  }
  
  private estimateTokens(layers: MemoryLayer[]): number {
    // Estimate tokens based on layers
    // Session: ~500, Project: ~1000, User: ~300, Vector: ~2000, Graph: ~500, Governance: ~800
  }
}
```

### Routing Rules

**PROCEDURAL** ("Continue working on X", "Implement Y")
- Query: Session (current task), Project (architecture), Graph (files)
- Skip: Vector (too broad), User (not needed), Governance (not historical)
- Estimated tokens: ~2000

**FACTUAL** ("What is JWT?", "How does bcrypt work?")
- Query: Vector (semantic search for docs/code)
- Skip: Everything else (not relevant)
- Estimated tokens: ~2000

**ARCHITECTURAL** ("Show dependencies", "What imports X?")
- Query: Graph (structure), Vector (related code)
- Skip: Session/Project/User/Governance (not structural)
- Estimated tokens: ~2500

**USER** ("My preferred framework?", "My expertise?")
- Query: User (preferences), Project (current setup)
- Skip: Session/Vector/Graph/Governance (not about user)
- Estimated tokens: ~1300

**HISTORICAL** ("Why did we choose X?", "What decisions?")
- Query: Governance (decisions), Project (rationale)
- Skip: Session/Vector/Graph/User (not historical)
- Estimated tokens: ~1800

**GENERAL** (fallback)
- Query: Session (context), Vector (broad search)
- Estimated tokens: ~2500

## Testing

Create `test/meta-rag/router.test.ts`:

```typescript
import { MemoryRouter } from '../../src/meta-rag/router.js';
import { QueryType, MemoryLayer } from '../../src/meta-rag/types.js';

describe('MemoryRouter', () => {
  const router = new MemoryRouter();
  
  test('routes PROCEDURAL to Session + Project + Graph', () => {
    const decision = router.route({
      type: QueryType.PROCEDURAL,
      confidence: 0.9,
      reasoning: 'Task-oriented'
    });
    
    expect(decision.layers).toContain(MemoryLayer.SESSION);
    expect(decision.layers).toContain(MemoryLayer.PROJECT);
    expect(decision.layers).toContain(MemoryLayer.GRAPH);
    expect(decision.layers).not.toContain(MemoryLayer.VECTOR);
  });
  
  test('routes FACTUAL to Vector only', () => {
    const decision = router.route({
      type: QueryType.FACTUAL,
      confidence: 1.0,
      reasoning: 'Knowledge query'
    });
    
    expect(decision.layers).toEqual([MemoryLayer.VECTOR]);
  });
  
  // Add tests for all query types
});
```

## Acceptance Criteria

- [ ] `src/meta-rag/router.ts` created with MemoryRouter class
- [ ] All 6 query types have routing rules
- [ ] Token estimation implemented
- [ ] Reasoning explanation implemented
- [ ] Tests pass (6 test cases minimum)
- [ ] TypeScript compiles without errors
- [ ] Exports added to `src/meta-rag/index.ts`

## Search Priority

1. **arela_search** "memory router" "routing rules" "layer selection"
2. Check `src/meta-rag/types.ts` for existing types
3. Check `src/memory/hexi-memory.ts` for MemoryLayer enum
4. grep only if arela_search doesn't find what you need

## Notes

- Keep routing rules simple and explicit
- Token estimates are rough (will tune later)
- Reasoning should be human-readable for debugging
- This is Phase 1 - we'll add adaptive routing in Phase 2

## Report

After implementation, provide:
1. Summary of routing rules implemented
2. Test results (all passing?)
3. Token estimation accuracy
4. Any edge cases discovered
5. Integration points for next ticket (CODEX-009)
