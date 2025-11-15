# HEXI-006: Governance Memory Wrapper

**Agent:** Codex  
**Priority:** MEDIUM  
**Complexity:** Low  
**Estimated Time:** 1-2 hours  
**Dependencies:** HEXI-005 ✅

---

## Context

Governance Memory is Layer 3 of the Hexi-Memory system. It wraps the existing audit log for historical queries.

**Purpose:**
- Wrap existing `.arela/memory/audit.db` (SQLite)
- Provide unified interface for audit queries
- Integrate with Hexi-Memory system
- No changes to existing audit logic

**Lifespan:** Project lifetime (append-only log)

---

## 🚨 CRITICAL: Use arela_search for File Discovery

**PROVEN TOKEN SAVINGS: 80% reduction (85k → 17k tokens)**

Before implementing, use arela_search to find existing audit files:

```bash
# Find audit implementation files (if exists)
arela_search "audit log database"
arela_search "governance tracking"
arela_search "event logging"
```

**Note:** Audit log may not exist yet - that's OK! Create simple schema.

**DO NOT use grep/find!** This ticket should take <10k tokens with arela_search.

---

## Requirements

### 1. Governance Memory Wrapper

**File:** `src/memory/governance.ts`

```typescript
export class GovernanceMemory {
  // Initialization
  async init(projectPath: string): Promise<void>
  
  // Audit log queries
  async getEvents(filters?: EventFilters): Promise<AuditEvent[]>
  async getEventsByType(type: string): Promise<AuditEvent[]>
  async getEventsByAgent(agent: string): Promise<AuditEvent[]>
  async getRecentEvents(limit: number): Promise<AuditEvent[]>
  
  // Decision tracking
  async getDecisions(): Promise<Decision[]>
  async getDecisionsByTag(tag: string): Promise<Decision[]>
  
  // Change tracking
  async getChanges(filePath?: string): Promise<Change[]>
  async getChangesByAuthor(author: string): Promise<Change[]>
  
  // Stats
  async getStats(): Promise<GovernanceStats>
}

interface AuditEvent {
  id: string;
  timestamp: number;
  type: string; // 'decision', 'change', 'violation', 'ticket'
  agent: string; // 'cascade', 'claude', 'codex'
  data: Record<string, any>;
}

interface EventFilters {
  type?: string;
  agent?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  timestamp: number;
  tags: string[];
}

interface Change {
  id: string;
  file: string;
  author: string;
  timestamp: number;
  description: string;
  linesAdded: number;
  linesRemoved: number;
}

interface GovernanceStats {
  totalEvents: number;
  totalDecisions: number;
  totalChanges: number;
  eventsByType: Record<string, number>;
  lastUpdated: number;
}
```

### 2. Integration with Existing Audit Log

**Reuse existing code:**
- Audit log already exists (if implemented)
- If not, create simple append-only log
- SQLite for storage

**GovernanceMemory is just a wrapper!**

---

## Technical Details

### Implementation

```typescript
import Database from 'better-sqlite3';
import path from 'path';

export class GovernanceMemory {
  private db: Database.Database;
  private projectPath: string;
  
  async init(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    const dbPath = path.join(projectPath, '.arela', 'memory', 'audit.db');
    
    // Create if doesn't exist
    this.db = new Database(dbPath);
    this.initSchema();
  }
  
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        agent TEXT NOT NULL,
        data TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON audit_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_type ON audit_events(type);
      CREATE INDEX IF NOT EXISTS idx_events_agent ON audit_events(agent);
    `);
  }
  
  async getEvents(filters?: EventFilters): Promise<AuditEvent[]> {
    let query = 'SELECT * FROM audit_events WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    if (filters?.agent) {
      query += ' AND agent = ?';
      params.push(filters.agent);
    }
    
    if (filters?.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const rows = this.db.prepare(query).all(...params);
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      type: r.type,
      agent: r.agent,
      data: JSON.parse(r.data),
    }));
  }
  
  async getEventsByType(type: string): Promise<AuditEvent[]> {
    return this.getEvents({ type });
  }
  
  async getEventsByAgent(agent: string): Promise<AuditEvent[]> {
    return this.getEvents({ agent });
  }
  
  async getRecentEvents(limit: number): Promise<AuditEvent[]> {
    return this.getEvents({ limit });
  }
  
  async getStats(): Promise<GovernanceStats> {
    const totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM audit_events').get();
    
    const eventsByType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM audit_events
      GROUP BY type
    `).all();
    
    const typeMap: Record<string, number> = {};
    eventsByType.forEach((row: any) => {
      typeMap[row.type] = row.count;
    });
    
    return {
      totalEvents: totalEvents.count,
      totalDecisions: typeMap['decision'] || 0,
      totalChanges: typeMap['change'] || 0,
      eventsByType: typeMap,
      lastUpdated: Date.now(),
    };
  }
}
```

---

## Files to Create

1. **`src/memory/governance.ts`** - GovernanceMemory wrapper class
2. **`test/memory/governance.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] GovernanceMemory class implemented
- [ ] Creates audit.db if doesn't exist
- [ ] Event queries work
- [ ] Filtering works (type, agent, date range)
- [ ] Stats method works
- [ ] Unit tests (>90% coverage)
- [ ] Query performance <100ms

---

## Testing Strategy

```typescript
describe('GovernanceMemory', () => {
  it('should initialize governance memory', async () => {
    const gov = new GovernanceMemory();
    await gov.init('/path/to/project');
    expect(gov).toBeDefined();
  });
  
  it('should get all events', async () => {
    const events = await gov.getEvents();
    expect(Array.isArray(events)).toBe(true);
  });
  
  it('should filter events by type', async () => {
    const decisions = await gov.getEventsByType('decision');
    expect(decisions.every(e => e.type === 'decision')).toBe(true);
  });
  
  it('should filter events by agent', async () => {
    const claudeEvents = await gov.getEventsByAgent('claude');
    expect(claudeEvents.every(e => e.agent === 'claude')).toBe(true);
  });
  
  it('should get recent events', async () => {
    const recent = await gov.getRecentEvents(10);
    expect(recent.length).toBeLessThanOrEqual(10);
  });
  
  it('should get stats', async () => {
    const stats = await gov.getStats();
    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats).toHaveProperty('eventsByType');
  });
});
```

---

## Example Usage

```typescript
// Initialize
const gov = new GovernanceMemory();
await gov.init(process.cwd());

// Get all events
const events = await gov.getEvents();
console.log(`Total events: ${events.length}`);

// Get decisions only
const decisions = await gov.getEventsByType('decision');
console.log(`Decisions: ${decisions.length}`);

// Get Claude's actions
const claudeEvents = await gov.getEventsByAgent('claude');
console.log(`Claude events: ${claudeEvents.length}`);

// Get recent activity
const recent = await gov.getRecentEvents(20);
console.log('Recent events:');
recent.forEach(e => {
  console.log(`  [${new Date(e.timestamp).toISOString()}] ${e.type} by ${e.agent}`);
});

// Stats
const stats = await gov.getStats();
console.log(`Total events: ${stats.totalEvents}`);
console.log(`Decisions: ${stats.totalDecisions}`);
console.log(`Changes: ${stats.totalChanges}`);
console.log('Events by type:', stats.eventsByType);
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (historical context layer)
- Context Router (include past decisions)
- CLI commands (`arela audit`, `arela history`)
- Compliance reporting

---

## Success Metrics

- [ ] Audit log working
- [ ] Queries performant (<100ms)
- [ ] Stats accurate
- [ ] Memory usage minimal
- [ ] Append-only (no data loss)

---

## Notes

**Why audit log?**
- Track all decisions and changes
- Compliance and governance
- Learn from past mistakes
- Understand project evolution

**Append-only design:**
- Never delete events
- Only add new ones
- Immutable history
- Full audit trail

**This is a simple wrapper - should be quick!** ⚡
