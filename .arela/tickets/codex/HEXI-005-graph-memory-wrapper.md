# HEXI-005: Graph Memory Wrapper

**Agent:** Codex  
**Priority:** MEDIUM  
**Complexity:** Low  
**Estimated Time:** 1-2 hours  
**Dependencies:** HEXI-004 ✅

---

## Context

Graph Memory is Layer 2 of the Hexi-Memory system. It wraps the existing Graph DB for structural queries.

**Purpose:**
- Wrap existing `.arela/memory/graph.db` (SQLite)
- Provide unified interface for dependency queries
- Integrate with Hexi-Memory system
- No changes to existing graph logic

**Lifespan:** Project lifetime (regenerated on ingest)

---

## 🚨 CRITICAL: Use arela_search for File Discovery

**PROVEN TOKEN SAVINGS: 80% reduction (85k → 17k tokens)**

Before implementing, use arela_search to find existing graph files:

```bash
# Find graph implementation files
arela_search "graph database queries"
arela_search "graph loader imports"
arela_search "graph builder schema"
```

**DO NOT use grep/find!** This ticket should take <10k tokens with arela_search.

---

## Requirements

### 1. Graph Memory Wrapper

**File:** `src/memory/graph.ts`

```typescript
export class GraphMemory {
  // Initialization
  async init(projectPath: string): Promise<void>
  
  // File queries
  async getFile(path: string): Promise<FileNode | undefined>
  async getFiles(repoPaths?: string[]): Promise<FileNode[]>
  async searchFiles(pattern: string): Promise<FileNode[]>
  
  // Dependency queries
  async getImports(filePath: string): Promise<Import[]>
  async getImportedBy(filePath: string): Promise<string[]>
  async getDependencies(filePath: string, depth?: number): Promise<string[]>
  async getDependents(filePath: string, depth?: number): Promise<string[]>
  
  // Function queries
  async getFunctions(filePath: string): Promise<FunctionNode[]>
  async searchFunctions(name: string): Promise<FunctionNode[]>
  
  // Stats
  async getStats(): Promise<GraphStats>
}

interface FileNode {
  path: string;
  repoPath: string;
  language: string;
  size: number;
}

interface Import {
  source: string;
  target: string;
  type: 'internal' | 'external';
}

interface FunctionNode {
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
}

interface GraphStats {
  totalFiles: number;
  totalImports: number;
  totalFunctions: number;
  lastUpdated: number;
}
```

### 2. Integration with Existing Graph DB

**Reuse existing code:**
- `src/ingest/graph-builder.ts` - Graph construction
- `src/detect/graph-loader.ts` - Graph queries
- Database schema already defined

**GraphMemory is just a wrapper!**

---

## Technical Details

### Implementation

```typescript
import { loadGraph, queryFiles, queryImports } from '../detect/graph-loader.js';
import Database from 'better-sqlite3';

export class GraphMemory {
  private db: Database.Database;
  private projectPath: string;
  
  async init(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    const dbPath = path.join(projectPath, '.arela', 'memory', 'graph.db');
    this.db = new Database(dbPath, { readonly: true });
  }
  
  async getFiles(repoPaths?: string[]): Promise<FileNode[]> {
    let query = 'SELECT * FROM files';
    
    if (repoPaths && repoPaths.length > 0) {
      const placeholders = repoPaths.map(() => '?').join(',');
      query += ` WHERE repo_path IN (${placeholders})`;
    }
    
    const rows = this.db.prepare(query).all(...(repoPaths || []));
    return rows.map(r => ({
      path: r.path,
      repoPath: r.repo_path,
      language: r.language,
      size: r.size,
    }));
  }
  
  async getImports(filePath: string): Promise<Import[]> {
    const query = `
      SELECT source, target, type
      FROM imports
      WHERE source = ?
    `;
    
    const rows = this.db.prepare(query).all(filePath);
    return rows.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type,
    }));
  }
  
  async getImportedBy(filePath: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT source
      FROM imports
      WHERE target = ?
    `;
    
    const rows = this.db.prepare(query).all(filePath);
    return rows.map(r => r.source);
  }
  
  async getFunctions(filePath: string): Promise<FunctionNode[]> {
    const query = `
      SELECT name, file, line_start, line_end
      FROM functions
      WHERE file = ?
    `;
    
    const rows = this.db.prepare(query).all(filePath);
    return rows.map(r => ({
      name: r.name,
      file: r.file,
      lineStart: r.line_start,
      lineEnd: r.line_end,
    }));
  }
  
  async getStats(): Promise<GraphStats> {
    const fileCount = this.db.prepare('SELECT COUNT(*) as count FROM files').get();
    const importCount = this.db.prepare('SELECT COUNT(*) as count FROM imports').get();
    const funcCount = this.db.prepare('SELECT COUNT(*) as count FROM functions').get();
    
    return {
      totalFiles: fileCount.count,
      totalImports: importCount.count,
      totalFunctions: funcCount.count,
      lastUpdated: Date.now(), // TODO: Get from metadata
    };
  }
}
```

---

## Files to Create

1. **`src/memory/graph.ts`** - GraphMemory wrapper class
2. **`test/memory/graph.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] GraphMemory class implemented
- [ ] Wraps existing graph.db
- [ ] File queries work
- [ ] Import queries work
- [ ] Function queries work
- [ ] Stats method works
- [ ] No changes to existing graph code
- [ ] Unit tests (>90% coverage)
- [ ] Query performance <100ms

---

## Testing Strategy

```typescript
describe('GraphMemory', () => {
  it('should initialize graph memory', async () => {
    const graph = new GraphMemory();
    await graph.init('/path/to/project');
    expect(graph).toBeDefined();
  });
  
  it('should get files', async () => {
    const files = await graph.getFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toHaveProperty('path');
    expect(files[0]).toHaveProperty('language');
  });
  
  it('should get imports', async () => {
    const imports = await graph.getImports('src/index.ts');
    expect(imports.length).toBeGreaterThan(0);
    expect(imports[0]).toHaveProperty('source');
    expect(imports[0]).toHaveProperty('target');
  });
  
  it('should get imported by', async () => {
    const importedBy = await graph.getImportedBy('src/utils.ts');
    expect(importedBy.length).toBeGreaterThan(0);
  });
  
  it('should get functions', async () => {
    const functions = await graph.getFunctions('src/index.ts');
    expect(functions.length).toBeGreaterThan(0);
    expect(functions[0]).toHaveProperty('name');
  });
  
  it('should get stats', async () => {
    const stats = await graph.getStats();
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.totalImports).toBeGreaterThan(0);
  });
});
```

---

## Example Usage

```typescript
// Initialize
const graph = new GraphMemory();
await graph.init(process.cwd());

// Get all files
const files = await graph.getFiles();
console.log(`Total files: ${files.length}`);

// Get imports for a file
const imports = await graph.getImports('src/auth/login.ts');
console.log(`Imports: ${imports.length}`);
imports.forEach(i => {
  console.log(`  ${i.source} → ${i.target} (${i.type})`);
});

// Get who imports this file
const importedBy = await graph.getImportedBy('src/utils/string.ts');
console.log(`Imported by ${importedBy.length} files`);

// Get functions in a file
const functions = await graph.getFunctions('src/auth/login.ts');
console.log(`Functions: ${functions.length}`);
functions.forEach(f => {
  console.log(`  ${f.name} (lines ${f.lineStart}-${f.lineEnd})`);
});

// Stats
const stats = await graph.getStats();
console.log(`Files: ${stats.totalFiles}`);
console.log(`Imports: ${stats.totalImports}`);
console.log(`Functions: ${stats.totalFunctions}`);
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (structural queries layer)
- Context Router (include dependency context)
- Slice detection (uses graph for clustering)
- CLI commands (`arela graph stats`, `arela graph deps`)

---

## Success Metrics

- [ ] Wraps existing graph.db without changes
- [ ] Queries work identically to current graph
- [ ] Stats accurate
- [ ] Performance unchanged (<100ms)
- [ ] Memory usage minimal

---

## Notes

**Why wrap instead of modify?**
- Existing graph DB works perfectly
- Don't break what's not broken
- Unified interface for Hexi-Memory
- Easy to add new query methods later

**This is a simple wrapper - should be quick!** ⚡
