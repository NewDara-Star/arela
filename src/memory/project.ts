import path from "node:path";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type {
  Decision,
  Pattern,
  Todo,
  ProjectStats,
} from "./types.js";

/**
 * Project Memory Layer (Layer 5 - Hexi-Memory)
 *
 * Stores medium-term context specific to the current project/repository:
 * - Project architecture and tech stack
 * - Architecture decisions (ADR-like)
 * - Code patterns and their usage frequency
 * - Project todos and milestones
 * - Conventions and standards
 * - Arbitrary metadata key-value pairs
 *
 * Features:
 * - SQLite persistence per project
 * - Architecture decision recording
 * - Pattern tracking with frequency
 * - Todo management with priorities
 * - Convention storage
 * - Searchable decisions
 * - Fast queries (<100ms)
 *
 * Lifespan: Project lifetime (persists across sessions)
 */
export class ProjectMemory {
  private db?: Database.Database;
  private dbPath: string;
  private projectId?: string;
  private initialized = false;

  constructor(private readonly projectPath: string = process.cwd()) {
    this.dbPath = path.join(projectPath, ".arela", "memory", "project.db");
  }

  /**
   * Initialize project memory
   * - Sets up SQLite database
   * - Creates tables if needed
   * - Loads or creates project record
   */
  async init(projectPath?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (projectPath) {
      this.projectPath = projectPath;
      this.dbPath = path.join(projectPath, ".arela", "memory", "project.db");
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(this.dbPath));

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL"); // Better concurrency

    // Create tables if they don't exist
    this.createTables();

    // Get or create project record
    await this.initProject();

    this.initialized = true;
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_info (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        architecture TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS tech_stack (
        project_id TEXT NOT NULL,
        technology TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES project_info(id),
        PRIMARY KEY (project_id, technology)
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        rationale TEXT,
        date INTEGER NOT NULL,
        tags TEXT,
        FOREIGN KEY (project_id) REFERENCES project_info(id)
      );

      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        examples TEXT,
        frequency INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES project_info(id)
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (project_id) REFERENCES project_info(id)
      );

      CREATE TABLE IF NOT EXISTS conventions (
        project_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES project_info(id),
        PRIMARY KEY (project_id, key)
      );

      CREATE TABLE IF NOT EXISTS metadata (
        project_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES project_info(id),
        PRIMARY KEY (project_id, key)
      );

      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_tags ON decisions(tags);
      CREATE INDEX IF NOT EXISTS idx_patterns_project ON patterns(project_id);
      CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
      CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    `);
  }

  /**
   * Initialize or load project record
   */
  private async initProject(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    // Check if project exists
    const existing = this.db
      .prepare("SELECT id FROM project_info WHERE project_path = ?")
      .get(this.projectPath) as { id: string } | undefined;

    if (existing) {
      this.projectId = existing.id;
    } else {
      // Create new project record
      this.projectId = randomUUID();
      this.db
        .prepare(
          "INSERT INTO project_info (id, project_path) VALUES (?, ?)"
        )
        .run(this.projectId, this.projectPath);
    }
  }

  /**
   * Get current project ID
   */
  getProjectId(): string {
    if (!this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }
    return this.projectId;
  }

  // ===== Architecture Methods =====

  /**
   * Set project architecture
   */
  async setArchitecture(architecture: string): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    this.db
      .prepare(
        "UPDATE project_info SET architecture = ?, updated_at = strftime('%s', 'now') WHERE id = ?"
      )
      .run(architecture, this.projectId);
  }

  /**
   * Get project architecture
   */
  async getArchitecture(): Promise<string | undefined> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT architecture FROM project_info WHERE id = ?")
      .get(this.projectId) as { architecture: string | null } | undefined;

    return result?.architecture || undefined;
  }

  // ===== Tech Stack Methods =====

  /**
   * Add technology to tech stack
   */
  async addTechStack(technology: string): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    try {
      this.db
        .prepare("INSERT INTO tech_stack (project_id, technology, added_at) VALUES (?, ?, ?)")
        .run(this.projectId, technology, Date.now());
    } catch (error: any) {
      // Ignore duplicate key errors
      if (!error.message?.includes("UNIQUE constraint")) {
        throw error;
      }
    }
  }

  /**
   * Get tech stack
   */
  async getTechStack(): Promise<string[]> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT technology FROM tech_stack WHERE project_id = ? ORDER BY added_at")
      .all(this.projectId) as { technology: string }[];

    return results.map((r) => r.technology);
  }

  // ===== Decision Methods =====

  /**
   * Add architecture decision
   */
  async addDecision(decision: Omit<Decision, "id"> & { id?: string }): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const id = decision.id || randomUUID();
    const tags = JSON.stringify(decision.tags);

    this.db
      .prepare(
        `INSERT INTO decisions (id, project_id, title, description, rationale, date, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        this.projectId,
        decision.title,
        decision.description,
        decision.rationale,
        decision.date,
        tags
      );
  }

  /**
   * Get decisions, optionally filtered by tags
   */
  async getDecisions(tags?: string[]): Promise<Decision[]> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    let results: any[];

    if (tags && tags.length > 0) {
      // Filter by tags - need to check if any tag matches
      const allDecisions = this.db
        .prepare("SELECT * FROM decisions WHERE project_id = ? ORDER BY date DESC")
        .all(this.projectId) as any[];

      results = allDecisions.filter((row) => {
        const rowTags = JSON.parse(row.tags) as string[];
        return tags.some((tag) => rowTags.includes(tag));
      });
    } else {
      results = this.db
        .prepare("SELECT * FROM decisions WHERE project_id = ? ORDER BY date DESC")
        .all(this.projectId) as any[];
    }

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      rationale: row.rationale,
      date: row.date,
      tags: JSON.parse(row.tags),
    }));
  }

  /**
   * Search decisions by query (searches title, description, and rationale)
   */
  async searchDecisions(query: string): Promise<Decision[]> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const searchPattern = `%${query}%`;
    const results = this.db
      .prepare(
        `SELECT * FROM decisions
         WHERE project_id = ?
         AND (title LIKE ? OR description LIKE ? OR rationale LIKE ?)
         ORDER BY date DESC`
      )
      .all(this.projectId, searchPattern, searchPattern, searchPattern) as any[];

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      rationale: row.rationale,
      date: row.date,
      tags: JSON.parse(row.tags),
    }));
  }

  // ===== Pattern Methods =====

  /**
   * Add code pattern
   */
  async addPattern(pattern: Omit<Pattern, "id"> & { id?: string }): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const id = pattern.id || randomUUID();
    const examples = JSON.stringify(pattern.examples);

    this.db
      .prepare(
        `INSERT INTO patterns (id, project_id, name, description, examples, frequency)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        this.projectId,
        pattern.name,
        pattern.description,
        examples,
        pattern.frequency
      );
  }

  /**
   * Get all patterns
   */
  async getPatterns(): Promise<Pattern[]> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT * FROM patterns WHERE project_id = ? ORDER BY frequency DESC")
      .all(this.projectId) as any[];

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      examples: JSON.parse(row.examples),
      frequency: row.frequency,
    }));
  }

  /**
   * Increment pattern usage frequency
   */
  async incrementPatternUsage(patternId: string): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    this.db
      .prepare("UPDATE patterns SET frequency = frequency + 1 WHERE id = ? AND project_id = ?")
      .run(patternId, this.projectId);
  }

  // ===== Todo Methods =====

  /**
   * Add todo
   */
  async addTodo(todo: Omit<Todo, "id" | "createdAt"> & { id?: string }): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const id = todo.id || randomUUID();

    this.db
      .prepare(
        `INSERT INTO todos (id, project_id, task, priority, completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, this.projectId, todo.task, todo.priority, todo.completed ? 1 : 0, Date.now());
  }

  /**
   * Get todos, optionally filtered by priority
   */
  async getTodos(priority?: string): Promise<Todo[]> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    let results: any[];

    if (priority) {
      results = this.db
        .prepare(
          "SELECT * FROM todos WHERE project_id = ? AND priority = ? ORDER BY created_at DESC"
        )
        .all(this.projectId, priority) as any[];
    } else {
      results = this.db
        .prepare("SELECT * FROM todos WHERE project_id = ? ORDER BY created_at DESC")
        .all(this.projectId) as any[];
    }

    return results.map((row) => ({
      id: row.id,
      task: row.task,
      priority: row.priority as "high" | "medium" | "low",
      completed: row.completed === 1,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    }));
  }

  /**
   * Complete a todo
   */
  async completeTodo(todoId: string): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    this.db
      .prepare(
        "UPDATE todos SET completed = 1, completed_at = ? WHERE id = ? AND project_id = ?"
      )
      .run(Date.now(), todoId, this.projectId);
  }

  // ===== Convention Methods =====

  /**
   * Set a convention
   */
  async setConvention(key: string, value: string): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `INSERT INTO conventions (project_id, key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(project_id, key) DO UPDATE SET value = excluded.value`
      )
      .run(this.projectId, key, value);
  }

  /**
   * Get a convention value
   */
  async getConvention(key: string): Promise<string | undefined> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT value FROM conventions WHERE project_id = ? AND key = ?")
      .get(this.projectId, key) as { value: string } | undefined;

    return result?.value;
  }

  /**
   * Get all conventions
   */
  async getAllConventions(): Promise<Record<string, string>> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT key, value FROM conventions WHERE project_id = ?")
      .all(this.projectId) as { key: string; value: string }[];

    const conventions: Record<string, string> = {};
    for (const row of results) {
      conventions[row.key] = row.value;
    }

    return conventions;
  }

  // ===== Metadata Methods =====

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const jsonValue = JSON.stringify(value);
    this.db
      .prepare(
        `INSERT INTO metadata (project_id, key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(project_id, key) DO UPDATE SET value = excluded.value`
      )
      .run(this.projectId, key, jsonValue);
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<any> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT value FROM metadata WHERE project_id = ? AND key = ?")
      .get(this.projectId, key) as { value: string } | undefined;

    if (!result) {
      return undefined;
    }

    try {
      return JSON.parse(result.value);
    } catch {
      return result.value;
    }
  }

  // ===== Stats & Utility Methods =====

  /**
   * Get project statistics
   */
  async getStats(): Promise<ProjectStats> {
    if (!this.db || !this.projectId) {
      throw new Error("Project not initialized. Call init() first.");
    }

    const info = this.db
      .prepare("SELECT architecture FROM project_info WHERE id = ?")
      .get(this.projectId) as { architecture: string | null };

    const techStackCount = this.db
      .prepare("SELECT COUNT(*) as count FROM tech_stack WHERE project_id = ?")
      .get(this.projectId) as { count: number };

    const decisionsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM decisions WHERE project_id = ?")
      .get(this.projectId) as { count: number };

    const patternsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM patterns WHERE project_id = ?")
      .get(this.projectId) as { count: number };

    const todosStats = this.db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
         FROM todos WHERE project_id = ?`
      )
      .get(this.projectId) as { total: number; completed: number | null };

    const conventionsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM conventions WHERE project_id = ?")
      .get(this.projectId) as { count: number };

    const metadataCount = this.db
      .prepare("SELECT COUNT(*) as count FROM metadata WHERE project_id = ?")
      .get(this.projectId) as { count: number };

    return {
      projectId: this.projectId,
      projectPath: this.projectPath,
      architecture: info.architecture || undefined,
      techStackCount: techStackCount.count,
      decisionsCount: decisionsCount.count,
      patternsCount: patternsCount.count,
      todosCount: todosStats.total,
      todosCompletedCount: todosStats.completed || 0,
      conventionsCount: conventionsCount.count,
      metadataCount: metadataCount.count,
      dbPath: this.dbPath,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }

    this.initialized = false;
  }
}
