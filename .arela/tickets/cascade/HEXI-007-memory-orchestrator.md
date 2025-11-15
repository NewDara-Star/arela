# HEXI-007: Hexi-Memory Orchestrator

**Agent:** Cascade  
**Priority:** CRITICAL  
**Complexity:** High  
**Estimated Time:** 4-5 hours  
**Dependencies:** HEXI-001, HEXI-002, HEXI-003, HEXI-004, HEXI-005, HEXI-006 ✅

---

## Context

The Hexi-Memory Orchestrator is the **main integration point** for all 6 memory layers. It provides a unified API for querying memory and routes queries to the appropriate layers.

**Purpose:**
- Unified interface for all memory layers
- Smart query routing (which layers to query)
- Result fusion (combine results from multiple layers)
- Performance optimization (parallel queries)
- Integration with Meta-RAG (coming in Week 3)

---

## Requirements

### 1. Hexi-Memory Orchestrator

**File:** `src/memory/hexi-memory.ts`

```typescript
export class HexiMemory {
  private session: SessionMemory;
  private project: ProjectMemory;
  private user: UserMemory;
  private vector: VectorMemory;
  private graph: GraphMemory;
  private governance: GovernanceMemory;
  
  // Initialization
  async init(projectPath: string): Promise<void>
  
  // Unified query interface
  async query(query: string, options?: QueryOptions): Promise<QueryResult>
  
  // Layer-specific queries
  async querySession(query: string): Promise<any>
  async queryProject(query: string): Promise<any>
  async queryUser(query: string): Promise<any>
  async queryVector(query: string): Promise<any>
  async queryGraph(query: string): Promise<any>
  async queryGovernance(query: string): Promise<any>
  
  // Multi-layer queries
  async queryAll(query: string): Promise<MultiLayerResult>
  async queryLayers(query: string, layers: MemoryLayer[]): Promise<MultiLayerResult>
  
  // Stats
  async getStats(): Promise<HexiMemoryStats>
}

interface QueryOptions {
  layers?: MemoryLayer[]; // Which layers to query
  limit?: number;
  includeContext?: boolean;
}

enum MemoryLayer {
  SESSION = 'session',
  PROJECT = 'project',
  USER = 'user',
  VECTOR = 'vector',
  GRAPH = 'graph',
  GOVERNANCE = 'governance',
}

interface QueryResult {
  query: string;
  results: any[];
  layers: MemoryLayer[];
  totalResults: number;
  executionTime: number;
}

interface MultiLayerResult {
  session?: any;
  project?: any;
  user?: any;
  vector?: any[];
  graph?: any;
  governance?: any[];
}

interface HexiMemoryStats {
  session: any;
  project: any;
  user: any;
  vector: any;
  graph: any;
  governance: any;
  totalMemoryUsage: number;
}
```

---

## Technical Details

### Implementation

```typescript
import { SessionMemory } from './session.js';
import { ProjectMemory } from './project.js';
import { UserMemory } from './user.js';
import { VectorMemory } from './vector.js';
import { GraphMemory } from './graph.js';
import { GovernanceMemory } from './governance.js';

export class HexiMemory {
  private session: SessionMemory;
  private project: ProjectMemory;
  private user: UserMemory;
  private vector: VectorMemory;
  private graph: GraphMemory;
  private governance: GovernanceMemory;
  
  async init(projectPath: string): Promise<void> {
    // Initialize all layers
    this.session = new SessionMemory();
    await this.session.init();
    
    this.project = new ProjectMemory();
    await this.project.init(projectPath);
    
    this.user = new UserMemory();
    await this.user.init();
    
    this.vector = new VectorMemory();
    await this.vector.init(projectPath);
    
    this.graph = new GraphMemory();
    await this.graph.init(projectPath);
    
    this.governance = new GovernanceMemory();
    await this.governance.init(projectPath);
  }
  
  async queryAll(query: string): Promise<MultiLayerResult> {
    const startTime = Date.now();
    
    // Query all layers in parallel
    const [session, project, user, vector, graph, governance] = await Promise.all([
      this.querySession(query).catch(() => null),
      this.queryProject(query).catch(() => null),
      this.queryUser(query).catch(() => null),
      this.queryVector(query).catch(() => []),
      this.queryGraph(query).catch(() => null),
      this.queryGovernance(query).catch(() => []),
    ]);
    
    const executionTime = Date.now() - startTime;
    console.log(`Queried all 6 layers in ${executionTime}ms`);
    
    return {
      session,
      project,
      user,
      vector,
      graph,
      governance,
    };
  }
  
  async querySession(query: string): Promise<any> {
    // Session layer: current task, open files, recent messages
    return {
      currentTask: await this.session.getCurrentTask(),
      openFiles: await this.session.getOpenFiles(),
      recentMessages: await this.session.getRecentMessages(5),
    };
  }
  
  async queryProject(query: string): Promise<any> {
    // Project layer: architecture, decisions, patterns
    return {
      architecture: await this.project.getArchitecture(),
      techStack: await this.project.getTechStack(),
      decisions: await this.project.searchDecisions(query),
      patterns: await this.project.getPatterns(),
    };
  }
  
  async queryUser(query: string): Promise<any> {
    // User layer: preferences, expertise, patterns
    return {
      preferences: await this.user.getAllPreferences(),
      expertise: await this.user.getAllExpertise(),
      patterns: await this.user.getTopPatterns(5),
    };
  }
  
  async queryVector(query: string): Promise<any[]> {
    // Vector layer: semantic search
    return await this.vector.search(query, 10);
  }
  
  async queryGraph(query: string): Promise<any> {
    // Graph layer: structural queries
    // TODO: Parse query to determine what to search for
    return {
      files: await this.graph.getFiles(),
      stats: await this.graph.getStats(),
    };
  }
  
  async queryGovernance(query: string): Promise<any[]> {
    // Governance layer: audit log
    return await this.governance.getRecentEvents(10);
  }
  
  async getStats(): Promise<HexiMemoryStats> {
    const [session, project, user, vector, graph, governance] = await Promise.all([
      this.session.getStats?.() || {},
      this.project.getStats?.() || {},
      this.user.getStats?.() || {},
      this.vector.getStats(),
      this.graph.getStats(),
      this.governance.getStats(),
    ]);
    
    return {
      session,
      project,
      user,
      vector,
      graph,
      governance,
      totalMemoryUsage: 0, // TODO: Calculate
    };
  }
}
```

---

## Files to Create

1. **`src/memory/hexi-memory.ts`** - Main orchestrator
2. **`src/memory/index.ts`** - Exports all memory classes
3. **`test/memory/hexi-memory.test.ts`** - Integration tests

---

## Acceptance Criteria

- [ ] HexiMemory class implemented
- [ ] All 6 layers initialized
- [ ] Query routing works
- [ ] Parallel queries working
- [ ] Multi-layer results combined
- [ ] Stats aggregation works
- [ ] Error handling (layer failures don't crash)
- [ ] Performance <200ms for all layers
- [ ] Integration tests (>90% coverage)
- [ ] CLI integration (`arela memory query`)

---

## Testing Strategy

```typescript
describe('HexiMemory', () => {
  it('should initialize all layers', async () => {
    const memory = new HexiMemory();
    await memory.init('/path/to/project');
    expect(memory).toBeDefined();
  });
  
  it('should query all layers', async () => {
    const results = await memory.queryAll('authentication');
    expect(results.session).toBeDefined();
    expect(results.project).toBeDefined();
    expect(results.user).toBeDefined();
    expect(results.vector).toBeDefined();
    expect(results.graph).toBeDefined();
    expect(results.governance).toBeDefined();
  });
  
  it('should handle layer failures gracefully', async () => {
    // Mock one layer to fail
    jest.spyOn(memory['vector'], 'search').mockRejectedValue(new Error('Failed'));
    
    const results = await memory.queryAll('test');
    expect(results.vector).toEqual([]);
    expect(results.session).toBeDefined(); // Other layers still work
  });
  
  it('should query in parallel', async () => {
    const start = Date.now();
    await memory.queryAll('test');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500); // Should be fast with parallel queries
  });
  
  it('should get aggregated stats', async () => {
    const stats = await memory.getStats();
    expect(stats.session).toBeDefined();
    expect(stats.project).toBeDefined();
    expect(stats.user).toBeDefined();
    expect(stats.vector).toBeDefined();
    expect(stats.graph).toBeDefined();
    expect(stats.governance).toBeDefined();
  });
});
```

---

## CLI Integration

**New command:** `arela memory`

```bash
# Query all layers
arela memory query "authentication logic"

# Query specific layers
arela memory query "auth" --layers session,project,vector

# Show stats
arela memory stats

# Show layer-specific stats
arela memory stats --layer session
```

---

## Example Usage

```typescript
// Initialize
const memory = new HexiMemory();
await memory.init(process.cwd());

// Query all layers
const results = await memory.queryAll('authentication');

console.log('Session:', results.session?.currentTask);
console.log('Project:', results.project?.architecture);
console.log('User:', results.user?.preferences);
console.log('Vector:', results.vector?.length, 'results');
console.log('Graph:', results.graph?.stats);
console.log('Governance:', results.governance?.length, 'events');

// Get stats
const stats = await memory.getStats();
console.log('Memory Stats:');
console.log('  Session:', stats.session);
console.log('  Project:', stats.project);
console.log('  User:', stats.user);
console.log('  Vector:', stats.vector.totalChunks, 'chunks');
console.log('  Graph:', stats.graph.totalFiles, 'files');
console.log('  Governance:', stats.governance.totalEvents, 'events');
```

---

## Integration

Once complete, this will be used by:
- **Meta-RAG** (Week 3) - Query routing based on query type
- **Context Router** (Week 3) - Build LLM context from memory
- **CLI** - User-facing memory commands
- **Agents** - Access memory during task execution

---

## Success Metrics

- [ ] All 6 layers working together
- [ ] Query performance <200ms
- [ ] Parallel queries working
- [ ] Error handling robust
- [ ] Stats accurate
- [ ] Memory usage <50MB total

---

## Notes

**Why orchestrator?**
- Unified API for all layers
- Hide complexity from consumers
- Enable smart query routing (Meta-RAG)
- Performance optimization (parallel queries)

**Query routing (future):**
```
"Continue working on auth" → Session + Project + Vector
"What's my preferred testing framework?" → User
"Show me auth-related code" → Vector + Graph
"What decisions were made about auth?" → Project + Governance
```

**This is the heart of Hexi-Memory!** 🧠
