# HEXI-003: User Memory Layer

**Agent:** Claude  
**Priority:** HIGH  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** HEXI-002 ✅

---

## Context

User Memory is Layer 6 of the Hexi-Memory system. It stores **long-term context** about the user across ALL projects.

**Purpose:**
- Remember user preferences and coding style
- Track expertise levels
- Learn user patterns across projects
- Store global conventions
- Persist forever (global, cross-project)

**Lifespan:** Forever (until explicitly deleted)

---

## Requirements

### 1. User Memory Storage

**Schema:**
```typescript
interface UserMemory {
  userId: string;
  preferences: UserPreferences;
  expertise: Expertise;
  patterns: UserPattern[];
  globalConventions: Record<string, string>;
  projectHistory: ProjectRef[];
  metadata: Record<string, any>;
}

interface UserPreferences {
  language: string; // "TypeScript"
  framework: string; // "Next.js"
  testing: string; // "Vitest"
  style: string; // "Functional programming"
  editor: string; // "VS Code"
  packageManager: string; // "npm"
}

interface Expertise {
  frontend: 'beginner' | 'intermediate' | 'expert';
  backend: 'beginner' | 'intermediate' | 'expert';
  devops: 'beginner' | 'intermediate' | 'expert';
  mobile: 'beginner' | 'intermediate' | 'expert';
  [key: string]: string;
}

interface UserPattern {
  id: string;
  name: string;
  description: string;
  frequency: number; // Across all projects
  examples: string[];
  learnedFrom: string[]; // Project IDs
}

interface ProjectRef {
  projectId: string;
  projectPath: string;
  lastAccessed: number;
  totalSessions: number;
}
```

### 2. User Memory Manager

**File:** `src/memory/user.ts`

```typescript
export class UserMemory {
  // Initialization
  async init(): Promise<void>
  
  // Preferences
  async setPreference(key: string, value: string): Promise<void>
  async getPreference(key: string): Promise<string | undefined>
  async getAllPreferences(): Promise<UserPreferences>
  
  // Expertise
  async setExpertise(domain: string, level: string): Promise<void>
  async getExpertise(domain: string): Promise<string | undefined>
  async getAllExpertise(): Promise<Expertise>
  
  // Patterns (learned across projects)
  async addPattern(pattern: UserPattern): Promise<void>
  async getPatterns(): Promise<UserPattern[]>
  async incrementPatternUsage(patternId: string, projectId: string): Promise<void>
  async getTopPatterns(limit: number): Promise<UserPattern[]>
  
  // Global Conventions
  async setConvention(key: string, value: string): Promise<void>
  async getConvention(key: string): Promise<string | undefined>
  async getAllConventions(): Promise<Record<string, string>>
  
  // Project History
  async trackProject(projectId: string, projectPath: string): Promise<void>
  async getRecentProjects(limit: number): Promise<ProjectRef[]>
  async incrementSessionCount(projectId: string): Promise<void>
  
  // Metadata
  async setMetadata(key: string, value: any): Promise<void>
  async getMetadata(key: string): Promise<any>
}
```

---

## Technical Details

### Schema (SQLite)

**File:** `~/.arela/user.db` (global, one per user)

```sql
CREATE TABLE user_info (
  id TEXT PRIMARY KEY,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE preferences (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_info(id),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE expertise (
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  level TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_info(id),
  PRIMARY KEY (user_id, domain)
);

CREATE TABLE user_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency INTEGER DEFAULT 0,
  examples TEXT, -- JSON array
  learned_from TEXT, -- JSON array of project IDs
  FOREIGN KEY (user_id) REFERENCES user_info(id)
);

CREATE TABLE global_conventions (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_info(id),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE project_history (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  last_accessed INTEGER DEFAULT (strftime('%s', 'now')),
  total_sessions INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES user_info(id),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE user_metadata (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_info(id),
  PRIMARY KEY (user_id, key)
);

-- Indexes
CREATE INDEX idx_patterns_frequency ON user_patterns(frequency DESC);
CREATE INDEX idx_project_history_accessed ON project_history(last_accessed DESC);
```

---

## Files to Create

1. **`src/memory/user.ts`** - UserMemory class
2. **`test/memory/user.test.ts`** - Unit tests

---

## Acceptance Criteria

- [ ] UserMemory class implemented
- [ ] Global SQLite database (~/.arela/user.db)
- [ ] Preferences management
- [ ] Expertise tracking
- [ ] Pattern learning across projects
- [ ] Global conventions
- [ ] Project history tracking
- [ ] Metadata storage
- [ ] Top patterns by frequency
- [ ] Recent projects query
- [ ] Unit tests (>90% coverage)
- [ ] Query performance <100ms

---

## Testing Strategy

```typescript
describe('UserMemory', () => {
  it('should initialize user memory', async () => {
    const user = new UserMemory();
    await user.init();
    expect(user.getUserId()).toBeDefined();
  });
  
  it('should store preferences', async () => {
    await user.setPreference('language', 'TypeScript');
    await user.setPreference('framework', 'Next.js');
    
    const prefs = await user.getAllPreferences();
    expect(prefs.language).toBe('TypeScript');
    expect(prefs.framework).toBe('Next.js');
  });
  
  it('should track expertise', async () => {
    await user.setExpertise('frontend', 'expert');
    await user.setExpertise('backend', 'intermediate');
    
    const expertise = await user.getAllExpertise();
    expect(expertise.frontend).toBe('expert');
  });
  
  it('should learn patterns across projects', async () => {
    await user.addPattern({
      id: 'pat-001',
      name: 'Always write tests first',
      description: 'TDD approach',
      frequency: 0,
      examples: [],
      learnedFrom: ['project-1'],
    });
    
    await user.incrementPatternUsage('pat-001', 'project-2');
    
    const patterns = await user.getPatterns();
    expect(patterns[0].frequency).toBe(1);
    expect(patterns[0].learnedFrom).toContain('project-2');
  });
  
  it('should track project history', async () => {
    await user.trackProject('proj-1', '/path/to/proj1');
    await user.trackProject('proj-2', '/path/to/proj2');
    
    const recent = await user.getRecentProjects(5);
    expect(recent).toHaveLength(2);
  });
});
```

---

## Example Usage

```typescript
// Initialize user memory (global)
const user = new UserMemory();
await user.init();

// Set preferences
await user.setPreference('language', 'TypeScript');
await user.setPreference('framework', 'Next.js');
await user.setPreference('testing', 'Vitest');
await user.setPreference('style', 'Functional programming');

// Track expertise
await user.setExpertise('frontend', 'expert');
await user.setExpertise('backend', 'intermediate');
await user.setExpertise('devops', 'beginner');

// Learn patterns
await user.addPattern({
  name: 'Prefers small PRs (<300 LOC)',
  description: 'User consistently creates small, focused PRs',
  frequency: 15,
  examples: ['PR-123', 'PR-456'],
  learnedFrom: ['project-1', 'project-2'],
});

// Global conventions
await user.setConvention('imports', 'Always use absolute imports');
await user.setConvention('testing', 'Write tests before implementation');

// Track projects
await user.trackProject('stride-mobile', '/Users/Star/Arela Stride/mobile');
await user.incrementSessionCount('stride-mobile');
```

---

## Integration

Once complete, this will be used by:
- Meta-RAG (query user preferences before project/session)
- Context Router (include user context in LLM calls)
- CLI commands (`arela user info`, `arela user preferences`)
- Agents (adapt to user's coding style and expertise)
- Onboarding (learn user preferences automatically)

---

## Success Metrics

- [ ] User context persists across all projects
- [ ] Query performance <100ms
- [ ] Pattern learning works across projects
- [ ] Project history tracking accurate
- [ ] Memory usage <2MB total

---

## Notes

**Why global database?**
- User preferences are consistent across projects
- Learn patterns from all projects
- Single source of truth for user identity
- Easy to export/import user profile

**Why track expertise?**
- Adapt explanations to user's level
- Suggest appropriate patterns
- Avoid over-explaining to experts
- Provide more guidance to beginners

**Pattern Learning Example:**
```
Project 1: User writes tests first (3 times)
Project 2: User writes tests first (5 times)
Project 3: User writes tests first (7 times)

→ Arela learns: "This user prefers TDD"
→ Future suggestions: "Write tests first?"
```

---

**This layer makes Arela learn YOUR style!** 🎓
