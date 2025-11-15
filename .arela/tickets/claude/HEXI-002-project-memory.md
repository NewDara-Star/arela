# HEXI-002: Project Memory Layer

**Agent:** Claude  
**Priority:** HIGH  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** HEXI-001 ✅

---

## Context

Project Memory is Layer 5 of the Hexi-Memory system. It stores **medium-term context** specific to the current project/repository.

**Purpose:**
- Remember project-specific patterns and decisions
- Track architecture choices
- Store project todos and milestones
- Remember tech stack and conventions
- Persist across sessions (project lifetime)

**Lifespan:** Project lifetime (stays until project deleted)

---

## Requirements

### 1. Project Memory Storage

**Schema:**
```typescript
interface ProjectMemory {
  projectId: string;
  projectPath: string;
  architecture: string; // "VSA with 8 slices"
  techStack: string[];
  decisions: Decision[];
  patterns: Pattern[];
  todos: Todo[];
  conventions: Record<string, string>;
  metadata: Record<string, any>;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  date: number;
  tags: string[];
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  examples: string[];
  frequency: number; // How often used
}

interface Todo {
  id: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: number;
}
```

### 2. Project Memory Manager

**File:** `src/memory/project.ts`

```typescript
export class ProjectMemory {
  // Initialization
  async init(projectPath: string): Promise<void>
  
  // Architecture
  async setArchitecture(arch: string): Promise<void>
  async getArchitecture(): Promise<string | undefined>
  
  // Tech Stack
  async addTechStack(tech: string): Promise<void>
  async getTechStack(): Promise<string[]>
  
  // Decisions
  async addDecision(decision: Decision): Promise<void>
  async getDecisions(tags?: string[]): Promise<Decision[]>
  async searchDecisions(query: string): Promise<Decision[]>
  
  // Patterns
  async addPattern(pattern: Pattern): Promise<void>
  async getPatterns(): Promise<Pattern[]>
  async incrementPatternUsage(patternId: string): Promise<void>
  
  // Todos
  async addTodo(todo: Todo): Promise<void>
  async getTodos(priority?: string): Promise<Todo[]>
  async completeTodo(todoId: string): Promise<void>
  
  // Conventions
  async setConvention(key: string, value: string): Promise<void>
  async getConvention(key: string): Promise<string | undefined>
  async getAllConventions(): Promise<Record<string, string>>
  
  // Metadata
  async setMetadata(key: string, value: any): Promise<void>
  async getMetadata(key: string): Promise<any>
}
```

---

## Technical Details

### Schema (SQLite)

**File:** `.arela/memory/project.db` (per project)

```sql
CREATE TABLE project_info (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  architecture TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE tech_stack (
  project_id TEXT NOT NULL,
  technology TEXT NOT NULL,
  added_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (project_id) REFERENCES project_info(id),
  PRIMARY KEY (project_id, technology)
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  date INTEGER NOT NULL,
  tags TEXT, -- JSON array
  FOREIGN KEY (project_id) REFERENCES project_info(id)
);

CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  examples TEXT, -- JSON array
  frequency INTEGER DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES project_info(id)
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  completed INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  completed_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES project_info(id)
);

CREATE TABLE conventions (
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project_info(id),
  PRIMARY KEY (project_id, key)
);

CREATE TABLE metadata (
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project_info(id),
  PRIMARY KEY (project_id, key)
);

-- Indexes
CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_tags ON decisions(tags);
CREATE INDEX idx_patterns_project ON patterns(project_id);
CREATE INDEX idx_todos_project ON todos(project_id);
CREATE INDEX idx_todos_priority ON todos(priority);
```

---

## Files to Create

1. **`src/memory/project.ts`** - ProjectMemory class
2. **`test/memory/project.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] ProjectMemory class implemented
- [ ] SQLite database per project
- [ ] Architecture tracking
- [ ] Tech stack management
- [ ] Decision recording (ADR-like)
- [ ] Pattern tracking with frequency
- [ ] Todo list management
- [ ] Convention storage
- [ ] Metadata key-value store
- [ ] Search decisions by query
- [ ] Filter todos by priority
- [ ] Unit tests (>90% coverage)
- [ ] Query performance <100ms

---

## Testing Strategy

```typescript
describe('ProjectMemory', () => {
  it('should initialize project memory', async () => {
    const project = new ProjectMemory();
    await project.init('/path/to/project');
    expect(project.getProjectId()).toBeDefined();
  });
  
  it('should track architecture', async () => {
    await project.setArchitecture('VSA with 8 slices');
    const arch = await project.getArchitecture();
    expect(arch).toBe('VSA with 8 slices');
  });
  
  it('should record decisions', async () => {
    await project.addDecision({
      id: 'dec-001',
      title: 'Use PostgreSQL',
      description: 'Chose Postgres over MongoDB',
      rationale: 'Relational data model',
      date: Date.now(),
      tags: ['database', 'architecture'],
    });
    
    const decisions = await project.getDecisions(['database']);
    expect(decisions).toHaveLength(1);
  });
  
  it('should track pattern usage', async () => {
    await project.addPattern({
      id: 'pat-001',
      name: 'Repository Pattern',
      description: 'Data access abstraction',
      examples: ['UserRepository', 'PostRepository'],
      frequency: 0,
    });
    
    await project.incrementPatternUsage('pat-001');
    const patterns = await project.getPatterns();
    expect(patterns[0].frequency).toBe(1);
  });
});
```

---

## Example Usage

```typescript
// Initialize for current project
const project = new ProjectMemory();
await project.init(process.cwd());

// Record architecture decision
await project.setArchitecture('VSA Modular Monolith');
await project.addDecision({
  title: 'Chose VSA over Microservices',
  description: 'Team size is 3 people',
  rationale: 'VSA provides modularity without operational complexity',
  tags: ['architecture', 'decision'],
});

// Track tech stack
await project.addTechStack('Next.js');
await project.addTechStack('Prisma');
await project.addTechStack('PostgreSQL');

// Store conventions
await project.setConvention('testing', 'Always use Vitest');
await project.setConvention('imports', 'Use absolute imports');

// Add todos
await project.addTodo({
  task: 'Add integration tests',
  priority: 'high',
  completed: false,
});
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (query project patterns before searching code)
- Context Router (include project context in LLM calls)
- CLI commands (`arela project info`, `arela project decisions`)
- Agents (learn from project patterns)

---

## Success Metrics

- [ ] Project context persists across sessions
- [ ] Query performance <100ms
- [ ] Decisions searchable by tags/query
- [ ] Pattern frequency tracking works
- [ ] Memory usage <5MB per project

---

## Notes

**Why per-project database?**
- Each project has unique context
- Prevents cross-project pollution
- Easy to delete project memory
- Scales to multiple projects

**Why track pattern frequency?**
- Learn which patterns are used most
- Suggest patterns based on usage
- Identify project conventions automatically

---

**This layer enables Arela to "remember" your project!** 🎯
