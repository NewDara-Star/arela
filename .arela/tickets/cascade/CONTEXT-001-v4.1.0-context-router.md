# CONTEXT-001: Context Router Integration

**Agent:** Cascade  
**Priority:** High  
**Complexity:** Medium  
**Estimated Time:** 2-3 hours  
**Depends On:** META-RAG-002 (Router), FUSION-001 (Fusion) ⏳

---

## Context

We have all the pieces:
- ✅ QueryClassifier (OpenAI + Ollama)
- ⏳ MemoryRouter (layer selection)
- ⏳ FusionEngine (dedup + merge)

Now we need the **Context Router** - the main orchestrator that ties everything together and provides a simple API for the MCP server.

**Goal:**
Build the end-to-end context routing system that Cascade (and other agents) can use via MCP.

---

## Requirements

### Must Have
1. **Simple API** - Single `route()` method
2. **End-to-End Flow** - Classify → Route → Fuse
3. **Performance Tracking** - Measure each step
4. **Error Handling** - Graceful failures
5. **MCP Integration** - Expose via arela_search tool

### Should Have
6. **Caching** - Cache entire routing results
7. **Logging** - Debug mode with detailed logs
8. **Stats** - Track usage and performance

### Nice to Have
9. **Streaming** - Stream results as they arrive
10. **Feedback Loop** - Learn from usage patterns

---

## Technical Specification

### File to Create
`src/context-router.ts`

### Interface
```typescript
export interface ContextRouterOptions {
  heximemory: HexiMemory;
  classifier: QueryClassifier;
  router: MemoryRouter;
  fusion: FusionEngine;
  maxTokens?: number; // Default: 10000
  debug?: boolean; // Default: false
}

export interface ContextResponse {
  query: string;
  classification: ClassificationResult;
  routing: {
    layers: MemoryLayer[];
    reasoning: string;
  };
  context: FusedItem[];
  stats: {
    classificationTime: number;
    retrievalTime: number;
    fusionTime: number;
    totalTime: number;
    tokensEstimated: number;
  };
}
```

### Implementation

```typescript
export class ContextRouter {
  private heximemory: HexiMemory;
  private classifier: QueryClassifier;
  private router: MemoryRouter;
  private fusion: FusionEngine;
  private maxTokens: number;
  private debug: boolean;

  constructor(options: ContextRouterOptions) {
    this.heximemory = options.heximemory;
    this.classifier = options.classifier;
    this.router = options.router;
    this.fusion = options.fusion;
    this.maxTokens = options.maxTokens || 10000;
    this.debug = options.debug || false;
  }

  /**
   * Initialize all components
   */
  async init(): Promise<void> {
    await this.classifier.init();
    await this.heximemory.init();
    if (this.debug) {
      console.log("✅ ContextRouter initialized");
    }
  }

  /**
   * Route a query to optimal context
   */
  async route(options: { query: string; maxTokens?: number }): Promise<ContextResponse> {
    const { query, maxTokens = this.maxTokens } = options;
    const startTotal = Date.now();

    if (this.debug) {
      console.log(`\n🔍 Routing query: "${query}"`);
    }

    // Step 1: Classify
    const startClassify = Date.now();
    const classification = await this.classifier.classify(query);
    const classificationTime = Date.now() - startClassify;

    if (this.debug) {
      console.log(`  📊 Classification: ${classification.type} (${classification.confidence})`);
      console.log(`  🎯 Layers: ${classification.layers.join(", ")}`);
      console.log(`  ⏱️  ${classificationTime}ms`);
    }

    // Step 2: Route
    const startRoute = Date.now();
    const routingResult = await this.router.route(query);
    const retrievalTime = Date.now() - startRoute;

    if (this.debug) {
      console.log(`  🔄 Routed to ${routingResult.results.length} layers`);
      console.log(`  ⏱️  ${retrievalTime}ms`);
    }

    // Step 3: Fuse
    const startFuse = Date.now();
    const fusedResult = await this.fusion.fuse(routingResult, { maxTokens });
    const fusionTime = Date.now() - startFuse;

    if (this.debug) {
      console.log(`  🔥 Fused ${fusedResult.stats.totalItems} → ${fusedResult.stats.finalItems} items`);
      console.log(`  💾 Estimated tokens: ${fusedResult.stats.estimatedTokens}`);
      console.log(`  ⏱️  ${fusionTime}ms`);
    }

    const totalTime = Date.now() - startTotal;

    if (this.debug) {
      console.log(`  ✅ Total: ${totalTime}ms\n`);
    }

    return {
      query,
      classification,
      routing: {
        layers: classification.layers,
        reasoning: classification.reasoning,
      },
      context: fusedResult.items,
      stats: {
        classificationTime,
        retrievalTime,
        fusionTime,
        totalTime,
        tokensEstimated: fusedResult.stats.estimatedTokens,
      },
    };
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    totalQueries: number;
    avgClassificationTime: number;
    avgRetrievalTime: number;
    avgFusionTime: number;
    avgTotalTime: number;
  } {
    // TODO: Track stats
    return {
      totalQueries: 0,
      avgClassificationTime: 0,
      avgRetrievalTime: 0,
      avgFusionTime: 0,
      avgTotalTime: 0,
    };
  }
}
```

---

## MCP Integration

### Update `src/mcp/server.ts`

```typescript
import { ContextRouter } from "../context-router.js";

// Initialize
const contextRouter = new ContextRouter({
  heximemory,
  classifier: new QueryClassifier(),
  router: new MemoryRouter({ heximemory, classifier }),
  fusion: new FusionEngine(),
  debug: process.env.DEBUG === "true",
});

await contextRouter.init();

// Register tool
server.registerTool(
  "arela_search",
  {
    description: "Semantic search with intelligent context routing",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        maxTokens: {
          type: "number",
          description: "Maximum tokens to return (default: 10000)",
        },
      },
      required: ["query"],
    },
  },
  async ({ query, maxTokens }) => {
    const response = await contextRouter.route({ query, maxTokens });

    // Format for MCP
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            query: response.query,
            classification: response.classification.type,
            layers: response.routing.layers,
            reasoning: response.routing.reasoning,
            results: response.context.map((item) => ({
              content: item.content,
              score: item.score,
              layer: item.layer,
            })),
            stats: response.stats,
          }, null, 2),
        },
      ],
    };
  }
);
```

---

## CLI Command

### Add `arela route` command

```typescript
// src/cli.ts
program
  .command("route")
  .description("Test context routing")
  .argument("<query>", "Query to route")
  .option("--max-tokens <number>", "Maximum tokens", "10000")
  .option("--debug", "Enable debug logging")
  .action(async (query, opts) => {
    const { ContextRouter } = await import("./context-router.js");
    const { HexiMemory } = await import("./memory/hexi-memory.js");
    const { QueryClassifier } = await import("./meta-rag/classifier.js");
    const { MemoryRouter } = await import("./meta-rag/router.js");
    const { FusionEngine } = await import("./fusion/index.js");

    const heximemory = new HexiMemory({ cwd: process.cwd() });
    const classifier = new QueryClassifier();
    const router = new MemoryRouter({ heximemory, classifier });
    const fusion = new FusionEngine();

    const contextRouter = new ContextRouter({
      heximemory,
      classifier,
      router,
      fusion,
      debug: opts.debug,
    });

    await contextRouter.init();

    const response = await contextRouter.route({
      query,
      maxTokens: parseInt(opts.maxTokens),
    });

    console.log("\n📊 Classification:", response.classification.type);
    console.log("🎯 Layers:", response.routing.layers.join(", "));
    console.log("💡 Reasoning:", response.routing.reasoning);
    console.log("\n📝 Context Items:", response.context.length);
    console.log("💾 Tokens:", response.stats.tokensEstimated);
    console.log("\n⏱️  Performance:");
    console.log("  Classification:", response.stats.classificationTime + "ms");
    console.log("  Retrieval:", response.stats.retrievalTime + "ms");
    console.log("  Fusion:", response.stats.fusionTime + "ms");
    console.log("  Total:", response.stats.totalTime + "ms");
  });
```

---

## Testing

### Integration Test
`test/context-router.test.ts`

```typescript
describe("ContextRouter", () => {
  it("should route end-to-end", async () => {
    const response = await router.route({ query: "Continue working on auth" });
    
    expect(response.classification.type).toBe("procedural");
    expect(response.routing.layers).toContain("session");
    expect(response.context.length).toBeGreaterThan(0);
    expect(response.stats.totalTime).toBeLessThan(3000); // <3s
  });

  it("should respect token limits", async () => {
    const response = await router.route({ query: "Test", maxTokens: 1000 });
    expect(response.stats.tokensEstimated).toBeLessThanOrEqual(1000);
  });

  it("should handle errors gracefully", async () => {
    // Mock failure
    const response = await router.route({ query: "Bad query" });
    expect(response.context).toBeDefined(); // Partial results OK
  });
});
```

---

## Acceptance Criteria

- [ ] ContextRouter class implemented
- [ ] End-to-end flow working (classify → route → fuse)
- [ ] MCP integration complete
- [ ] CLI command `arela route` working
- [ ] All integration tests passing
- [ ] Performance: <3s total time
- [ ] Debug logging available
- [ ] Stats tracking implemented

---

## Files to Create/Modify
- `src/context-router.ts` (NEW)
- `src/mcp/server.ts` (UPDATE - add context router)
- `src/cli.ts` (UPDATE - add route command)
- `test/context-router.test.ts` (NEW)

---

## Success Metrics
- **End-to-end time:** <3s (classification + retrieval + fusion)
- **Token efficiency:** Stays within limits
- **Accuracy:** Returns relevant context
- **Reliability:** >95% success rate

---

## Usage Example

```bash
# Test routing
arela route "Continue working on authentication" --debug

# Output:
🔍 Routing query: "Continue working on authentication"
  📊 Classification: procedural (1.0)
  🎯 Layers: session, project, graph
  ⏱️  1234ms
  🔄 Routed to 3 layers
  ⏱️  156ms
  🔥 Fused 47 → 12 items
  💾 Estimated tokens: 8543
  ⏱️  89ms
  ✅ Total: 1479ms

📊 Classification: procedural
🎯 Layers: session, project, graph
💡 Reasoning: PROCEDURAL query: Accessing Session (current task), Project (architecture), and Graph (file structure) to continue work

📝 Context Items: 12
💾 Tokens: 8543

⏱️  Performance:
  Classification: 1234ms
  Retrieval: 156ms
  Fusion: 89ms
  Total: 1479ms
```

---

## Notes
- This is the final integration piece!
- All components come together here
- MCP server uses this for arela_search
- CLI command for testing/debugging
- Performance target: <3s end-to-end

**This completes v4.1.0 - Meta-RAG Context Routing!** 🚀
