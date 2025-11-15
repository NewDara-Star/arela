# CASCADE-AUTO-UPDATE-001: Build File Watcher System

**Agent:** cascade  
**Priority:** critical  
**Complexity:** medium  
**Estimated Time:** 8-12 hours

---

## 🔍 BEFORE YOU START

**Use Arela's memory system:**
```bash
arela_search "file watcher chokidar"
arela_search "memory update incremental"
arela memory project --category pattern
```

---

## Context

**Why this exists:**
Memory is useless if it's stale. Agents need fresh context to give correct answers. Currently, memory is only updated manually via `arela index` and `arela ingest codebase`. We need automatic updates on every file change.

**Current state:**
- Manual updates only
- Memory goes stale as code changes
- Agents get outdated context

**Desired state:**
- Automatic updates on file save
- Memory always fresh (<1 second lag)
- Incremental updates (fast)

---

## Requirements

### Must Have
- [ ] File watcher using `chokidar`
- [ ] Detect file changes (add, modify, delete)
- [ ] Update Graph DB on file change
- [ ] Update Vector index on file change
- [ ] Update Session memory on file change
- [ ] Ignore patterns (node_modules, .git, dist, .arela)
- [ ] Start/stop methods
- [ ] Error handling (continue on failure)

### Should Have
- [ ] Debouncing (batch rapid changes)
- [ ] Progress logging
- [ ] Performance metrics

### Nice to Have
- [ ] Config for ignored patterns
- [ ] Selective updates (only changed chunks)

---

## Technical Implementation

### Files to Create
```
src/memory/
├── auto-update.ts          # Main file watcher
└── types.ts                # Shared types
```

### Architecture

```typescript
// src/memory/auto-update.ts

import { watch, FSWatcher } from 'chokidar';
import { graphMemory } from './graph';
import { vectorMemory } from './vector';
import { sessionMemory } from './session';

export interface AutoUpdateOptions {
  projectPath: string;
  ignored?: string[];
  debounceMs?: number;
}

export class MemoryAutoUpdater {
  private watcher: FSWatcher | null = null;
  private updateQueue: Map<string, 'add' | 'change' | 'unlink'> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  
  start(options: AutoUpdateOptions) {
    const { projectPath, ignored, debounceMs = 500 } = options;
    
    console.log('🔄 Starting memory auto-updater...');
    
    this.watcher = watch(projectPath, {
      ignored: ignored || [
        /(node_modules|\.git|dist|build|\.arela|\.next|\.turbo)/,
        /\.(log|lock|map)$/
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });
    
    // Queue changes for batch processing
    this.watcher.on('all', (event, path) => {
      if (event === 'add' || event === 'change' || event === 'unlink') {
        this.updateQueue.set(path, event);
        this.scheduleUpdate(debounceMs);
      }
    });
    
    console.log('✅ Memory auto-updater started');
  }
  
  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('⏹️  Memory auto-updater stopped');
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
  
  private scheduleUpdate(debounceMs: number) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, debounceMs);
  }
  
  private async processQueue() {
    if (this.updateQueue.size === 0) return;
    
    const updates = Array.from(this.updateQueue.entries());
    this.updateQueue.clear();
    
    console.log(`📝 Processing ${updates.length} file changes...`);
    
    for (const [path, event] of updates) {
      try {
        if (event === 'unlink') {
          await this.removeFile(path);
        } else {
          await this.updateFile(path);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${path}:`, error);
        // Continue with other files
      }
    }
    
    console.log(`✅ Processed ${updates.length} changes`);
  }
  
  private async updateFile(path: string) {
    const start = Date.now();
    
    // Update graph (imports, functions)
    await graphMemory.updateFile(path);
    
    // Update vector (re-embed changed chunks)
    await vectorMemory.reindexFile(path);
    
    // Update session (mark file as changed)
    if (sessionMemory) {
      await sessionMemory.markFileChanged(path);
    }
    
    const duration = Date.now() - start;
    console.log(`✅ Updated ${path} (${duration}ms)`);
  }
  
  private async removeFile(path: string) {
    await graphMemory.removeFile(path);
    await vectorMemory.removeFile(path);
    console.log(`🗑️  Removed ${path} from memory`);
  }
}

// Singleton instance
export const memoryAutoUpdater = new MemoryAutoUpdater();
```

### Integration Points

**1. MCP Server (`src/mcp/server.ts`):**
```typescript
import { memoryAutoUpdater } from '../memory/auto-update';

// Start watcher when MCP server starts
memoryAutoUpdater.start({
  projectPath: process.cwd(),
  debounceMs: 500
});

// Stop on server shutdown
process.on('SIGTERM', () => {
  memoryAutoUpdater.stop();
});
```

**2. CLI (`src/cli.ts`):**
```typescript
program
  .command('watch')
  .description('Start file watcher for automatic memory updates')
  .action(async () => {
    const { memoryAutoUpdater } = await import('./memory/auto-update');
    memoryAutoUpdater.start({ projectPath: process.cwd() });
    
    console.log('👀 Watching for file changes... (Ctrl+C to stop)');
    
    // Keep process alive
    process.on('SIGINT', () => {
      memoryAutoUpdater.stop();
      process.exit(0);
    });
  });
```

---

## Acceptance Criteria

- [ ] File changes detected within 1 second
- [ ] Graph DB updated on file change
- [ ] Vector index updated on file change
- [ ] Session memory updated on file change
- [ ] Ignores node_modules, .git, dist, .arela
- [ ] Handles rapid changes (debouncing)
- [ ] Continues on individual file errors
- [ ] Clean start/stop
- [ ] Logs progress clearly

---

## Test Plan

### Unit Tests
```typescript
describe('MemoryAutoUpdater', () => {
  it('should detect file changes', async () => {
    const updater = new MemoryAutoUpdater();
    updater.start({ projectPath: './test-project' });
    
    // Write file
    await fs.writeFile('./test-project/test.ts', 'export const x = 1;');
    
    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify graph updated
    const node = await graphMemory.getFile('./test-project/test.ts');
    expect(node).toBeDefined();
    
    updater.stop();
  });
  
  it('should debounce rapid changes', async () => {
    // Test that 10 rapid changes only trigger 1 update
  });
  
  it('should handle file deletion', async () => {
    // Test that deleted files are removed from memory
  });
});
```

### Integration Tests
- Start watcher, edit file, verify memory updated
- Delete file, verify removed from memory
- Rapid edits, verify debouncing works

---

## Success Metrics

**Performance:**
- File change detected: < 1 second
- Update processing: < 100ms per file
- Memory overhead: < 50MB

**Quality:**
- No memory leaks (long-running)
- Handles 100+ file changes without issues
- Clean error recovery

---

## Dependencies

**NPM packages:**
- `chokidar`: ^3.5.3 (file watching)

**Internal:**
- `src/memory/graph.ts` (must have `updateFile`, `removeFile`)
- `src/memory/vector.ts` (must have `reindexFile`, `removeFile`)
- `src/memory/session.ts` (must have `markFileChanged`)

---

## Notes

**Important considerations:**
- Debouncing is critical (editors save multiple times)
- Must not block file saves (async updates)
- Error in one file shouldn't stop others
- Performance matters (runs continuously)

**Related work:**
- AUTO-UPDATE-002 (git hooks)
- HEXI-001 (session memory)

---

## Remember

**This is the foundation for fresh memory!**

Without this, memory goes stale and agents give wrong answers. This must be rock-solid and performant.

🚀 **Build it right, build it once.**
