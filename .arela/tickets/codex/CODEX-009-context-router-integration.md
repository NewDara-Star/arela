# CODEX-009: Context Router Integration

**Priority:** HIGH  
**Complexity:** Low  
**Estimated Time:** 1-2 hours  
**Dependencies:** CLAUDE-008 (Meta-RAG Router)

## Context

We have:
- ✅ Classifier (`src/meta-rag/classifier.ts`)
- ✅ Router (`src/meta-rag/router.ts`) - CLAUDE-008
- ✅ Hexi-Memory (`src/memory/hexi-memory.ts`)

Now integrate them into a single `ContextRouter` that orchestrates the full flow.

## Task

Create the main integration point that:
1. Classifies query
2. Routes to memory layers
3. Returns focused context

## Technical Requirements

### File to Create

**`src/context-router.ts`**

```typescript
import { QueryClassifier } from './meta-rag/classifier.js';
import { MemoryRouter } from './meta-rag/router.js';
import { HexiMemory } from './memory/hexi-memory.js';

export interface ContextRequest {
  query: string;
  cwd?: string;
}

export interface ContextResponse {
  query: string;
  classification: {
    type: string;
    confidence: number;
  };
  routing: {
    layers: string[];
    reasoning: string;
  };
  context: any; // Memory results
  stats: {
    classificationTime: number;
    retrievalTime: number;
    totalTime: number;
    tokensEstimated: number;
  };
}

export class ContextRouter {
  private classifier: QueryClassifier;
  private router: MemoryRouter;
  private memory: HexiMemory;
  
  constructor(cwd: string = process.cwd()) {
    this.classifier = new QueryClassifier();
    this.router = new MemoryRouter();
    this.memory = new HexiMemory(cwd);
  }
  
  async init(): Promise<void> {
    await this.classifier.init();
    await this.memory.init();
  }
  
  async route(request: ContextRequest): Promise<ContextResponse> {
    const startTime = Date.now();
    
    // Step 1: Classify query
    const classifyStart = Date.now();
    const classification = await this.classifier.classify(request.query);
    const classificationTime = Date.now() - classifyStart;
    
    // Step 2: Route to layers
    const routing = this.router.route(classification);
    
    // Step 3: Query memory layers
    const retrievalStart = Date.now();
    const context = await this.memory.queryLayers(request.query, routing.layers);
    const retrievalTime = Date.now() - retrievalStart;
    
    const totalTime = Date.now() - startTime;
    
    return {
      query: request.query,
      classification: {
        type: classification.type,
        confidence: classification.confidence
      },
      routing: {
        layers: routing.layers,
        reasoning: routing.reasoning
      },
      context,
      stats: {
        classificationTime,
        retrievalTime,
        totalTime,
        tokensEstimated: routing.estimatedTokens
      }
    };
  }
}
```

### CLI Integration

Update `src/cli.ts` to add test command:

```typescript
program
  .command('route')
  .description('Test Meta-RAG context routing')
  .argument('<query>', 'Query to route')
  .option('--verbose', 'Show detailed routing info')
  .action(async (query: string, opts: any) => {
    const { ContextRouter } = await import('./context-router.js');
    
    const router = new ContextRouter();
    await router.init();
    
    console.log(`\n🧠 Routing query: "${query}"\n`);
    
    const response = await router.route({ query });
    
    console.log(`📊 Classification: ${response.classification.type} (${response.classification.confidence})`);
    console.log(`🎯 Layers: ${response.routing.layers.join(', ')}`);
    console.log(`💡 Reasoning: ${response.routing.reasoning}`);
    console.log(`\n⏱️  Stats:`);
    console.log(`   Classification: ${response.stats.classificationTime}ms`);
    console.log(`   Retrieval: ${response.stats.retrievalTime}ms`);
    console.log(`   Total: ${response.stats.totalTime}ms`);
    console.log(`   Estimated tokens: ${response.stats.tokensEstimated}`);
    
    if (opts.verbose) {
      console.log(`\n📦 Context:`);
      console.log(JSON.stringify(response.context, null, 2));
    }
  });
```

## Testing

Create `test/context-router.test.ts`:

```typescript
import { ContextRouter } from '../src/context-router.js';

describe('ContextRouter', () => {
  let router: ContextRouter;
  
  beforeAll(async () => {
    router = new ContextRouter();
    await router.init();
  });
  
  test('routes procedural query correctly', async () => {
    const response = await router.route({
      query: 'Continue working on authentication'
    });
    
    expect(response.classification.type).toBe('PROCEDURAL');
    expect(response.routing.layers).toContain('SESSION');
    expect(response.stats.totalTime).toBeLessThan(5000); // <5s
  });
  
  test('routes factual query correctly', async () => {
    const response = await router.route({
      query: 'What is JWT?'
    });
    
    expect(response.classification.type).toBe('FACTUAL');
    expect(response.routing.layers).toContain('VECTOR');
  });
  
  // Add more test cases
});
```

## Acceptance Criteria

- [ ] `src/context-router.ts` created with ContextRouter class
- [ ] CLI command `arela route <query>` works
- [ ] End-to-end flow: classify → route → retrieve
- [ ] Stats tracking (timing, tokens)
- [ ] Tests pass (3+ test cases)
- [ ] TypeScript compiles
- [ ] Documentation in README

## Search Priority

1. **arela_search** "context router" "integration" "orchestration"
2. Check `src/meta-rag/` for classifier and router
3. Check `src/memory/hexi-memory.ts` for queryLayers method
4. grep only as last resort

## Manual Testing

After implementation:

```bash
npm run build

# Test different query types
npm run arela -- route "Continue working on auth"
npm run arela -- route "What is JWT?"
npm run arela -- route "Show me dependencies"
npm run arela -- route "What's my preferred framework?"
npm run arela -- route "Why did we choose Postgres?"

# Verbose mode
npm run arela -- route "Continue working on auth" --verbose
```

## Report

After implementation:
1. CLI output examples (all 5 query types)
2. Performance stats (classification + retrieval times)
3. Any integration issues discovered
4. Next steps for v4.1.0 release
