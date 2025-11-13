# CODEX-001: Tri-Memory System (Basic)

## Priority
🔴 CRITICAL

## Complexity
Medium (3-4 hours)

## Phase
Phase 1 - Foundation (v3.7.0)

## Description
Implement the Tri-Memory System that provides three types of persistent memory for AI agents: Vector DB (semantic search), Graph DB (structural dependencies), and Governance Log (audit trail). This creates the "cognitive state" that enables consistent, context-aware AI operations.

## Context
AI agents need persistent memory to maintain consistency across long-running operations. The Tri-Memory System provides three complementary memory types that work together to give agents perfect recall of codebase structure, semantic meaning, and decision history.

## Acceptance Criteria
- [ ] Three memory types initialized and working
- [ ] Vector DB integrates with existing RAG system
- [ ] Graph DB provides dependency queries
- [ ] Governance Log persists audit trail
- [ ] CLI interface for querying all three memory types
- [ ] Memory stats and health checks

## CLI Interface
```bash
# Initialize all three memory types
arela memory init

# Query semantic memory (Vector DB)
arela memory query "Where is user authentication logic?"

# Query structural memory (Graph DB)
arela memory impact src/auth/login.ts

# Query decision memory (Governance Log)
arela memory audit --commit abc123

# Memory health check
arela memory status
```

## Expected Output
```
🧠 Initializing Tri-Memory System...

✅ Vector DB: Initialized (using existing RAG)
✅ Graph DB: Initialized (.arela/memory/graph.db)
✅ Governance Log: Initialized (.arela/memory/audit.db)

📊 Memory Stats:
   - Indexed files: 247
   - Vector embeddings: 1,834
   - Graph nodes: 456
   - Audit entries: 0

🎉 Tri-Memory ready!
```

## Technical Implementation

### 1. Vector DB (Semantic Memory)
```typescript
// Use existing RAG system
// src/memory/vector.ts
export class VectorMemory {
  async query(question: string): Promise<SearchResult[]> {
    // Use existing arela_search MCP tool
    // Return semantically similar code chunks
  }
  
  async getStats(): Promise<VectorStats> {
    // Return: file count, embedding count, index size
  }
}
```

### 2. Graph DB (Structural Memory)
```typescript
// src/memory/graph.ts
export class GraphMemory {
  private db: Database; // SQLite from Feature 6.1
  
  async getImpact(filePath: string): Promise<ImpactAnalysis> {
    // Query: What files import this file?
    // Query: What files does this file import?
    // Query: What functions call functions in this file?
    // Return: Upstream and downstream dependencies
  }
  
  async findSlice(fileName: string): Promise<string[]> {
    // Query: All files in the same "community" (high cohesion)
    // Return: List of related files
  }
  
  async getStats(): Promise<GraphStats> {
    // Return: node count, edge count, module count
  }
}
```

### 3. Governance Log (Decision Memory)
```typescript
// src/memory/audit.ts
export class AuditMemory {
  private db: Database; // SQLite
  
  async logDecision(entry: AuditEntry): Promise<void> {
    // Store: timestamp, agent, action, input, output, result
  }
  
  async getCommitAudit(commitHash: string): Promise<AuditTrail> {
    // Query: All decisions related to this commit
    // Return: Slice Card, ADR, Test Report, Policy Result
  }
  
  async getStats(): Promise<AuditStats> {
    // Return: entry count, agent breakdown, success rate
  }
}
```

### Governance Log Schema
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  agent TEXT NOT NULL, -- 'architect', 'developer', 'qa', 'ops', 'arela'
  action TEXT NOT NULL, -- 'plan', 'implement', 'test', 'merge', 'policy_check'
  input_hash TEXT, -- Hash of input (ticket, code, etc.)
  output_hash TEXT, -- Hash of output
  result TEXT NOT NULL, -- 'success', 'failure', 'pending'
  metadata TEXT, -- JSON with additional context
  commit_hash TEXT, -- Git commit if applicable
  ticket_id TEXT, -- Ticket ID if applicable
  policy_violations TEXT -- JSON array of violations
);

CREATE INDEX idx_commit ON audit_log(commit_hash);
CREATE INDEX idx_ticket ON audit_log(ticket_id);
CREATE INDEX idx_agent ON audit_log(agent);
```

### Files to Create
```
src/memory/
├── index.ts          # Main coordinator (exports TriMemory class)
├── vector.ts         # Vector DB interface (wraps existing RAG)
├── graph.ts          # Graph DB interface (uses Feature 6.1 DB)
├── audit.ts          # Governance Log (new SQLite DB)
├── types.ts          # TypeScript types
└── cli.ts            # CLI commands for memory queries
```

### Main Coordinator
```typescript
// src/memory/index.ts
export class TriMemory {
  private vector: VectorMemory;
  private graph: GraphMemory;
  private audit: AuditMemory;
  
  async init(): Promise<void> {
    // Initialize all three memory types
    // Create databases if they don't exist
    // Verify connections
  }
  
  async query(question: string): Promise<MemoryResult> {
    // Query Vector DB for semantic matches
    // Query Graph DB for structural context
    // Return combined result
  }
  
  async impact(filePath: string): Promise<ImpactAnalysis> {
    // Query Graph DB for dependencies
    // Return upstream/downstream files
  }
  
  async audit(commitHash: string): Promise<AuditTrail> {
    // Query Governance Log
    // Return full audit trail for commit
  }
  
  async getStats(): Promise<TriMemoryStats> {
    // Aggregate stats from all three memory types
  }
}
```

## CLI Integration
```typescript
// src/cli.ts
program
  .command('memory')
  .description('Tri-Memory System commands')
  .addCommand(
    new Command('init')
      .description('Initialize Tri-Memory System')
      .action(async () => {
        const memory = new TriMemory();
        await memory.init();
        console.log('🎉 Tri-Memory ready!');
      })
  )
  .addCommand(
    new Command('query')
      .description('Query semantic memory')
      .argument('<question>', 'Natural language question')
      .action(async (question) => {
        const memory = new TriMemory();
        const result = await memory.query(question);
        console.log(result);
      })
  )
  .addCommand(
    new Command('impact')
      .description('Analyze file impact')
      .argument('<file>', 'File path')
      .action(async (file) => {
        const memory = new TriMemory();
        const impact = await memory.impact(file);
        console.log(impact);
      })
  )
  .addCommand(
    new Command('audit')
      .description('View audit trail')
      .option('--commit <hash>', 'Commit hash')
      .action(async (options) => {
        const memory = new TriMemory();
        const trail = await memory.audit(options.commit);
        console.log(trail);
      })
  )
  .addCommand(
    new Command('status')
      .description('Memory system status')
      .action(async () => {
        const memory = new TriMemory();
        const stats = await memory.getStats();
        console.log(stats);
      })
  );
```

## Dependencies
- `better-sqlite3` - For Governance Log
- Existing RAG system - For Vector DB
- Feature 6.1 Graph DB - For Graph DB

## Integration Points
- **Vector DB:** Uses existing `arela index` and RAG system
- **Graph DB:** Uses database from Feature 6.1 (Codebase Ingestion)
- **Governance Log:** New SQLite database at `.arela/memory/audit.db`
- **Used by:** All Phase 3 features (orchestration, refactoring, policies)

## Testing Strategy
- Test Vector DB queries with existing RAG
- Test Graph DB impact analysis
- Test Governance Log write/read
- Test combined queries (semantic + structural)
- Verify memory persistence across sessions

## Example Usage
```bash
# Initialize
arela memory init

# Semantic search
arela memory query "Where is the login function?"
# → Returns: src/features/authentication/services/authService.ts:42

# Impact analysis
arela memory impact src/auth/login.ts
# → Upstream: [authService.ts, authApi.ts]
# → Downstream: [LoginScreen.tsx, SignupScreen.tsx]

# Audit trail
arela memory audit --commit abc123
# → Slice Card: authentication-slice-card.json
# → ADR: Use JWT for auth
# → Test Report: 47/47 passed
# → Policy Result: All passed
```

## Notes
- Vector DB reuses existing RAG infrastructure (no new indexing needed)
- Graph DB reuses database from Feature 6.1 (no duplication)
- Governance Log is the only new database
- All three memory types are queryable via CLI and programmatically

## Related Features
- Depends on: Existing RAG system, Feature 6.1 (Graph DB)
- Enables: All Phase 3 features (orchestration, policies, refactoring)

## Estimated Time
3-4 hours

## Agent Assignment
Codex (Straightforward database integration and CLI commands)
