# CORE-001: Unified Knowledge Graph

**Status:** Planning  
**Priority:** High  
**Estimated Time:** 4 weeks  
**Target Release:** v5.1.0  
**Created:** 2025-11-16

---

## Context

Currently, Arela has two separate systems:
1. **RAG Index** - Vector embeddings for semantic search (SQLite)
2. **GraphDB** - Code structure + Infomap clustering (SQLite)

This creates:
- Duplicate storage
- Separate queries
- No combined semantic + structural search
- Missed opportunities for context

**Vision:** Merge both into ONE unified knowledge graph where each node contains semantic embeddings, AST structure, dependencies, Infomap clusters, memories, and conversations.

---

## Goals

1. **Unified Storage:** Single SQLite database with all knowledge
2. **Hybrid Queries:** Semantic + structural + architectural search in one query
3. **Full Context:** Code + decisions + conversations linked together
4. **Deduplication:** No duplicate embeddings or graph entries
5. **Performance:** <100ms for hybrid queries

---

## Technical Design

### Schema

```sql
-- Unified nodes table
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- file, function, class, memory, conversation
  path TEXT,
  content TEXT,
  embedding BLOB, -- Vector embedding from RAG
  cluster_id INTEGER, -- Infomap cluster
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- All relationships in one table
CREATE TABLE edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL, -- imports, depends_on, similar_to, discusses, implements
  weight REAL DEFAULT 1.0,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES nodes(id),
  FOREIGN KEY (target_id) REFERENCES nodes(id)
);

-- Infomap clusters
CREATE TABLE clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  purpose TEXT,
  parent_cluster_id INTEGER,
  metadata JSON,
  FOREIGN KEY (parent_cluster_id) REFERENCES clusters(id)
);

-- Indexes for performance
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_cluster ON nodes(cluster_id);
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_edges_type ON edges(type);
```

### API Design

```typescript
class UnifiedKnowledgeGraph {
  // Hybrid query
  async query(params: {
    semantic?: string;        // Vector search
    structural?: {            // Graph traversal
      type: 'dependency' | 'import' | 'cluster';
      depth?: number;
    };
    filters?: {               // Metadata filters
      cluster?: string;
      fileType?: string;
      modified?: Date;
    };
  }): Promise<Node[]>;
  
  // Full context retrieval
  async getFullContext(nodeId: string): Promise<{
    node: Node;
    semanticNeighbors: Node[];
    structuralNeighbors: Node[];
    cluster: Cluster;
    memories: Memory[];
    conversations: Conversation[];
  }>;
  
  // Graph traversal
  async traverse(params: {
    start: string;
    semantic?: { similarity: number };
    structural?: { type: string; depth: number };
  }): Promise<Node[]>;
}
```

---

## Implementation Plan

### Week 1: Schema Design & Migration

**Tasks:**
- [ ] Design final schema (nodes, edges, clusters)
- [ ] Create migration script from RAG → Unified
- [ ] Create migration script from GraphDB → Unified
- [ ] Test migration on sample data
- [ ] Validate no data loss

**Deliverables:**
- `src/memory/unified-graph-schema.sql`
- `src/memory/migrate-rag.ts`
- `src/memory/migrate-graphdb.ts`
- Migration tests

### Week 2: Core Implementation

**Tasks:**
- [ ] Implement `UnifiedKnowledgeGraph` class
- [ ] Implement `query()` method (hybrid search)
- [ ] Implement `getFullContext()` method
- [ ] Implement `traverse()` method
- [ ] Add vector similarity search
- [ ] Add graph traversal algorithms

**Deliverables:**
- `src/memory/unified-graph.ts`
- Unit tests for all methods
- Performance benchmarks

### Week 3: Integration & Migration

**Tasks:**
- [ ] Update `arela index` to use unified graph
- [ ] Migrate existing RAG data
- [ ] Migrate existing GraphDB data
- [ ] Update CLI commands to use new API
- [ ] Update MCP server to use unified graph
- [ ] Backward compatibility layer

**Deliverables:**
- Updated `src/ingest/indexer.ts`
- Migration scripts
- Updated CLI commands
- Integration tests

### Week 4: Features & Polish

**Tasks:**
- [ ] Implement memory linking (code → decisions)
- [ ] Implement conversation linking (code → discussions)
- [ ] Precompute semantic neighbors (cache)
- [ ] Optimize query performance (<100ms)
- [ ] Add query result caching
- [ ] Documentation

**Deliverables:**
- Memory integration
- Conversation integration
- Performance optimizations
- User documentation
- API documentation

---

## Acceptance Criteria

- [ ] Single SQLite database contains all knowledge
- [ ] Hybrid queries work (semantic + structural + cluster)
- [ ] Full context retrieval works for any node
- [ ] Graph traversal works with multiple edge types
- [ ] Query performance <100ms (p95)
- [ ] No duplicate embeddings
- [ ] All existing RAG data migrated
- [ ] All existing GraphDB data migrated
- [ ] Backward compatible with existing commands
- [ ] Documentation complete

---

## Testing Strategy

### Unit Tests
- Schema creation
- Node insertion/retrieval
- Edge creation/retrieval
- Vector similarity search
- Graph traversal algorithms

### Integration Tests
- RAG migration
- GraphDB migration
- Hybrid queries
- Full context retrieval
- Memory linking
- Conversation linking

### Performance Tests
- Query latency (target: <100ms p95)
- Indexing speed
- Memory usage
- Database size

---

## Success Metrics

- **Query Performance:** <100ms for hybrid queries (p95)
- **Context Quality:** 90%+ relevant results in full context
- **Deduplication:** 0 duplicate embeddings
- **Coverage:** 100% of code in unified graph
- **Migration Success:** 100% data migrated without loss

---

## Risks & Mitigations

### Risk 1: Migration Data Loss
**Mitigation:** 
- Backup existing databases before migration
- Validate data integrity after migration
- Keep old databases until v5.2.0

### Risk 2: Performance Degradation
**Mitigation:**
- Benchmark early and often
- Add indexes proactively
- Implement caching layer
- Optimize hot paths

### Risk 3: Breaking Changes
**Mitigation:**
- Maintain backward compatibility layer
- Gradual rollout (feature flag)
- Clear migration guide

---

## Dependencies

- SQLite with FTS5 (full-text search)
- Vector similarity library (existing)
- Infomap clustering (existing)
- Graph traversal algorithms (implement)

---

## Follow-up Work (v5.2.0+)

- "Explain this code" feature using full context
- Impact analysis ("what breaks if I change this?")
- Architectural insights ("what's the purpose of this cluster?")
- Visual graph explorer (web UI)
- Real-time graph updates (watch mode)

---

## References

- Memory: `c7df9145-4499-4351-9189-5478abd2e072` (Unified Graph Vision)
- Current RAG: `src/ingest/indexer.ts`
- Current GraphDB: `src/memory/graph.ts`
- Infomap: `src/detect/graph-loader.ts`
