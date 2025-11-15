# HEXI-004: Vector Memory Wrapper

**Agent:** Codex  
**Priority:** MEDIUM  
**Complexity:** Low  
**Estimated Time:** 1-2 hours  
**Dependencies:** HEXI-003 ✅

---

## Context

Vector Memory is Layer 1 of the Hexi-Memory system. It wraps the existing RAG index for semantic search.

**Purpose:**
- Wrap existing `.arela/.rag-index.json` (46MB)
- Provide unified interface for semantic search
- Integrate with Hexi-Memory system
- No changes to existing RAG logic

**Lifespan:** Project lifetime (regenerated on index)

---

## 🚨 CRITICAL: Use arela_search for File Discovery

**PROVEN TOKEN SAVINGS: 80% reduction (85k → 17k tokens)**

Before implementing, use arela_search to find existing RAG files:

```bash
# Find RAG implementation files
arela_search "RAG search implementation"
arela_search "semantic search embeddings"
arela_search "RAG index stats"
```

**DO NOT use grep/find!** This ticket should take <10k tokens with arela_search.

---

## Requirements

### 1. Vector Memory Wrapper

**File:** `src/memory/vector.ts`

```typescript
export class VectorMemory {
  // Initialization
  async init(projectPath: string): Promise<void>
  
  // Search
  async search(query: string, limit?: number): Promise<SearchResult[]>
  async searchByEmbedding(embedding: number[], limit?: number): Promise<SearchResult[]>
  
  // Stats
  async getStats(): Promise<VectorStats>
  async getIndexSize(): Promise<number>
  async getChunkCount(): Promise<number>
}

interface SearchResult {
  file: string;
  chunk: string;
  score: number;
  lineStart: number;
  lineEnd: number;
}

interface VectorStats {
  totalChunks: number;
  totalFiles: number;
  indexSize: number; // bytes
  lastUpdated: number;
}
```

### 2. Integration with Existing RAG

**Reuse existing code:**
- `src/rag/index.ts` - RAG indexer
- `src/rag/embeddings.ts` - Embedding generation
- `src/rag/search.ts` - Semantic search

**VectorMemory is just a wrapper!**

---

## Technical Details

### Implementation

```typescript
import { searchRAG, getRAGStats } from '../rag/index.js';

export class VectorMemory {
  private projectPath: string;
  
  async init(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    // No initialization needed - RAG index already exists
  }
  
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    // Delegate to existing RAG search
    const results = await searchRAG(query, {
      limit,
      cwd: this.projectPath,
    });
    
    return results.map(r => ({
      file: r.file,
      chunk: r.content,
      score: r.score,
      lineStart: r.lineStart,
      lineEnd: r.lineEnd,
    }));
  }
  
  async getStats(): Promise<VectorStats> {
    const stats = await getRAGStats(this.projectPath);
    return {
      totalChunks: stats.chunks,
      totalFiles: stats.files,
      indexSize: stats.sizeBytes,
      lastUpdated: stats.lastUpdated,
    };
  }
  
  async getIndexSize(): Promise<number> {
    const stats = await this.getStats();
    return stats.indexSize;
  }
  
  async getChunkCount(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalChunks;
  }
}
```

---

## Files to Create

1. **`src/memory/vector.ts`** - VectorMemory wrapper class
2. **`test/memory/vector.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] VectorMemory class implemented
- [ ] Wraps existing RAG index
- [ ] Search method works
- [ ] Stats method works
- [ ] No changes to existing RAG code
- [ ] Unit tests (>90% coverage)
- [ ] Search performance <200ms

---

## Testing Strategy

```typescript
describe('VectorMemory', () => {
  it('should initialize vector memory', async () => {
    const vector = new VectorMemory();
    await vector.init('/path/to/project');
    expect(vector).toBeDefined();
  });
  
  it('should search semantically', async () => {
    const results = await vector.search('authentication logic', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('file');
    expect(results[0]).toHaveProperty('chunk');
    expect(results[0]).toHaveProperty('score');
  });
  
  it('should get stats', async () => {
    const stats = await vector.getStats();
    expect(stats.totalChunks).toBeGreaterThan(0);
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.indexSize).toBeGreaterThan(0);
  });
  
  it('should get index size', async () => {
    const size = await vector.getIndexSize();
    expect(size).toBeGreaterThan(0);
  });
});
```

---

## Example Usage

```typescript
// Initialize
const vector = new VectorMemory();
await vector.init(process.cwd());

// Search
const results = await vector.search('login authentication', 10);
console.log(`Found ${results.length} results`);

results.forEach(r => {
  console.log(`${r.file}:${r.lineStart}-${r.lineEnd}`);
  console.log(`Score: ${r.score}`);
  console.log(`Chunk: ${r.chunk.substring(0, 100)}...`);
});

// Stats
const stats = await vector.getStats();
console.log(`Total chunks: ${stats.totalChunks}`);
console.log(`Total files: ${stats.totalFiles}`);
console.log(`Index size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (semantic search layer)
- Context Router (include vector search results)
- CLI commands (`arela search`, `arela index stats`)

---

## Success Metrics

- [ ] Wraps existing RAG without changes
- [ ] Search works identically to current RAG
- [ ] Stats accurate
- [ ] Performance unchanged (<200ms)
- [ ] Memory usage unchanged

---

## Notes

**Why wrap instead of modify?**
- Existing RAG works perfectly
- Don't break what's not broken
- Unified interface for Hexi-Memory
- Easy to swap implementations later

**This is a simple wrapper - should be quick!** ⚡
