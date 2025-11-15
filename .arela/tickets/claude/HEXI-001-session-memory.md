
# HEXI-001: Session Memory Layer

**Agent:** Claude  
**Priority:** HIGH  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** COMPRESSION-001 ✅

---

## Context

Session Memory is Layer 4 of the Hexi-Memory system. It stores **short-term context** for the current conversation/task.

**Purpose:**
- Remember what we're working on RIGHT NOW
- Track current conversation history
- Store active files and context
- Persist across IDE restarts (SQLite snapshot)
- Fast retrieval (<50ms)

**Lifespan:** Current session only (cleared on new session)

---

## Requirements

### 1. Session Memory Storage

**In-Memory Store:**
```typescript
interface SessionMemory {
  sessionId: string;
  startTime: number;
  currentTask?: string;
  filesOpen: string[];
  conversationHistory: Message[];
  activeTicket?: string;
  context: Record<string, any>;
}
```

**SQLite Snapshot:**
- Save to `.arela/memory/session.db` every 30 seconds
- Load on session start
- Clear on explicit new session

### 2. Session Manager

**File:** `src/memory/session.ts`

```typescript
export class SessionMemory {
  // Core operations
  async init(): Promise<void>
  async getCurrentTask(): Promise<string | undefined>
  async setCurrentTask(task: string): Promise<void>
  async addMessage(message: Message): Promise<void>
  async getRecentMessages(count: number): Promise<Message[]>
  
  // File tracking
  async trackOpenFile(path: string): Promise<void>
  async getOpenFiles(): Promise<string[]>
  
  // Context management
  async setContext(key: string, value: any): Promise<void>
  async getContext(key: string): Promise<any>
  
  // Persistence
  async snapshot(): Promise<void>
  async restore(): Promise<void>
  async clear(): Promise<void>
}
```

### 3. Auto-Snapshot

**Background task:**
- Every 30 seconds, save to SQLite
- On process exit, save snapshot
- On crash, restore from last snapshot

### 4. Session Lifecycle

```typescript
// Session start
await sessionMemory.init(); // Load from snapshot if exists

// During session
await sessionMemory.setCurrentTask("Implementing login");
await sessionMemory.trackOpenFile("src/auth/login.ts");
await sessionMemory.addMessage({ role: "user", content: "..." });

// Session end
await sessionMemory.snapshot(); // Save state
await sessionMemory.clear(); // Optional: clear for new session
```

---

## Technical Details

### Schema (SQLite)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  start_time INTEGER NOT NULL,
  current_task TEXT,
  active_ticket TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE session_files (
  session_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  opened_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE session_messages (
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE session_context (
  session_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  PRIMARY KEY (session_id, key)
);
```

### In-Memory Cache

```typescript
class SessionMemory {
  private cache: SessionMemory = {
    sessionId: uuidv4(),
    startTime: Date.now(),
    filesOpen: [],
    conversationHistory: [],
    context: {},
  };
  
  private snapshotInterval?: NodeJS.Timeout;
  
  async init() {
    // Try to restore from snapshot
    await this.restore();
    
    // Start auto-snapshot
    this.snapshotInterval = setInterval(() => {
      this.snapshot();
    }, 30000); // 30 seconds
    
    // Save on exit
    process.on('exit', () => this.snapshot());
  }
}
```

---

## Files to Create

1. **`src/memory/session.ts`** - SessionMemory class
2. **`src/memory/types.ts`** - Shared types (Message, SessionMemory, etc.)
3. **`test/memory/session.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] SessionMemory class implemented
- [ ] In-memory cache working
- [ ] SQLite snapshot working
- [ ] Auto-snapshot every 30 seconds
- [ ] Restore from snapshot on init
- [ ] Clear session method
- [ ] Track open files
- [ ] Store conversation history
- [ ] Context key-value store
- [ ] Unit tests (>90% coverage)
- [ ] Session load time <50ms

---

## Testing Strategy

```typescript
describe('SessionMemory', () => {
  it('should initialize new session', async () => {
    const session = new SessionMemory();
    await session.init();
    expect(session.getSessionId()).toBeDefined();
  });
  
  it('should track current task', async () => {
    await session.setCurrentTask('Building feature X');
    const task = await session.getCurrentTask();
    expect(task).toBe('Building feature X');
  });
  
  it('should snapshot and restore', async () => {
    await session.setCurrentTask('Test task');
    await session.snapshot();
    
    const newSession = new SessionMemory();
    await newSession.restore();
    expect(await newSession.getCurrentTask()).toBe('Test task');
  });
  
  it('should track open files', async () => {
    await session.trackOpenFile('src/test.ts');
    const files = await session.getOpenFiles();
    expect(files).toContain('src/test.ts');
  });
});
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (query session context first)
- Context Router (include session in LLM context)
- CLI commands (show current session state)

---

## Success Metrics

- [ ] Session continuity across IDE restarts
- [ ] Load time <50ms
- [ ] No data loss on crash (snapshot recovery)
- [ ] Memory usage <10MB per session

---

## Notes

**Why SQLite + In-Memory?**
- In-memory: Fast reads/writes during session
- SQLite: Persistence across restarts
- Best of both worlds!

**Why 30-second snapshots?**
- Balance between data safety and performance
- Worst case: lose 30 seconds of work
- Can be tuned based on usage

---

**Ready to implement! This is the foundation of Hexi-Memory.** 🧠
