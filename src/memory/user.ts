import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type {
  UserPreferences,
  Expertise,
  UserPattern,
  ProjectRef,
  UserStats,
} from "./types.js";

/**
 * User Memory Layer (Layer 6 - Hexi-Memory)
 *
 * Stores long-term context about the user across ALL projects:
 * - User preferences and coding style
 * - Expertise levels across different domains
 * - Learned patterns from all projects
 * - Global conventions
 * - Project history
 * - Arbitrary metadata
 *
 * Features:
 * - Global SQLite database (~/.arela/user.db)
 * - Pattern learning across projects
 * - Project history tracking
 * - Top patterns by frequency
 * - Recent projects query
 * - Fast queries (<100ms)
 *
 * Lifespan: Forever (until explicitly deleted)
 */
export class UserMemory {
  private db?: Database.Database;
  private dbPath: string;
  private userId?: string;
  private initialized = false;

  constructor() {
    // Global user database at ~/.arela/user.db
    const homeDir = os.homedir();
    this.dbPath = path.join(homeDir, ".arela", "user.db");
  }

  /**
   * Initialize user memory
   * - Sets up global SQLite database
   * - Creates tables if needed
   * - Loads or creates user record
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(this.dbPath));

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL"); // Better concurrency

    // Create tables if they don't exist
    this.createTables();

    // Get or create user record
    await this.initUser();

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
      CREATE TABLE IF NOT EXISTS user_info (
        id TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS preferences (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_info(id),
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS expertise (
        user_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        level TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_info(id),
        PRIMARY KEY (user_id, domain)
      );

      CREATE TABLE IF NOT EXISTS user_patterns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        frequency INTEGER DEFAULT 0,
        examples TEXT,
        learned_from TEXT,
        FOREIGN KEY (user_id) REFERENCES user_info(id)
      );

      CREATE TABLE IF NOT EXISTS global_conventions (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_info(id),
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS project_history (
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        project_path TEXT NOT NULL,
        last_accessed INTEGER DEFAULT (strftime('%s', 'now')),
        total_sessions INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES user_info(id),
        PRIMARY KEY (user_id, project_id)
      );

      CREATE TABLE IF NOT EXISTS user_metadata (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_info(id),
        PRIMARY KEY (user_id, key)
      );

      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON user_patterns(frequency DESC);
      CREATE INDEX IF NOT EXISTS idx_project_history_accessed ON project_history(last_accessed DESC);
    `);
  }

  /**
   * Initialize or load user record
   */
  private async initUser(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    // Check if user exists (there should only be one user)
    const existing = this.db
      .prepare("SELECT id FROM user_info LIMIT 1")
      .get() as { id: string } | undefined;

    if (existing) {
      this.userId = existing.id;
    } else {
      // Create new user record
      this.userId = randomUUID();
      this.db
        .prepare("INSERT INTO user_info (id) VALUES (?)")
        .run(this.userId);
    }
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    if (!this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }
    return this.userId;
  }

  // ===== Preferences Methods =====

  /**
   * Set a user preference
   */
  async setPreference(key: string, value: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `INSERT INTO preferences (user_id, key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
      )
      .run(this.userId, key, value);
  }

  /**
   * Get a preference value
   */
  async getPreference(key: string): Promise<string | undefined> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT value FROM preferences WHERE user_id = ? AND key = ?")
      .get(this.userId, key) as { value: string } | undefined;

    return result?.value;
  }

  /**
   * Get all preferences
   */
  async getAllPreferences(): Promise<UserPreferences> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT key, value FROM preferences WHERE user_id = ?")
      .all(this.userId) as { key: string; value: string }[];

    const preferences: UserPreferences = {};
    for (const row of results) {
      preferences[row.key] = row.value;
    }

    return preferences;
  }

  // ===== Expertise Methods =====

  /**
   * Set expertise level for a domain
   */
  async setExpertise(domain: string, level: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `INSERT INTO expertise (user_id, domain, level)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, domain) DO UPDATE SET level = excluded.level`
      )
      .run(this.userId, domain, level);
  }

  /**
   * Get expertise level for a domain
   */
  async getExpertise(domain: string): Promise<string | undefined> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT level FROM expertise WHERE user_id = ? AND domain = ?")
      .get(this.userId, domain) as { level: string } | undefined;

    return result?.level;
  }

  /**
   * Get all expertise levels
   */
  async getAllExpertise(): Promise<Expertise> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT domain, level FROM expertise WHERE user_id = ?")
      .all(this.userId) as { domain: string; level: string }[];

    const expertise: Expertise = {};
    for (const row of results) {
      expertise[row.domain] = row.level as any;
    }

    return expertise;
  }

  // ===== Pattern Methods =====

  /**
   * Add a user pattern
   */
  async addPattern(pattern: Omit<UserPattern, "id"> & { id?: string }): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const id = pattern.id || randomUUID();
    const examples = JSON.stringify(pattern.examples);
    const learnedFrom = JSON.stringify(pattern.learnedFrom);

    this.db
      .prepare(
        `INSERT INTO user_patterns (id, user_id, name, description, frequency, examples, learned_from)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        this.userId,
        pattern.name,
        pattern.description,
        pattern.frequency,
        examples,
        learnedFrom
      );
  }

  /**
   * Get all patterns
   */
  async getPatterns(): Promise<UserPattern[]> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT * FROM user_patterns WHERE user_id = ? ORDER BY frequency DESC")
      .all(this.userId) as any[];

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      frequency: row.frequency,
      examples: JSON.parse(row.examples),
      learnedFrom: JSON.parse(row.learned_from),
    }));
  }

  /**
   * Increment pattern usage and add project to learned_from
   */
  async incrementPatternUsage(patternId: string, projectId: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    // Get current pattern
    const pattern = this.db
      .prepare("SELECT learned_from FROM user_patterns WHERE id = ? AND user_id = ?")
      .get(patternId, this.userId) as { learned_from: string } | undefined;

    if (!pattern) {
      return; // Pattern doesn't exist
    }

    const learnedFrom = JSON.parse(pattern.learned_from) as string[];

    // Add projectId if not already present
    if (!learnedFrom.includes(projectId)) {
      learnedFrom.push(projectId);
    }

    // Update pattern
    this.db
      .prepare(
        `UPDATE user_patterns
         SET frequency = frequency + 1, learned_from = ?
         WHERE id = ? AND user_id = ?`
      )
      .run(JSON.stringify(learnedFrom), patternId, this.userId);
  }

  /**
   * Get top patterns by frequency
   */
  async getTopPatterns(limit: number): Promise<UserPattern[]> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT * FROM user_patterns WHERE user_id = ? ORDER BY frequency DESC LIMIT ?")
      .all(this.userId, limit) as any[];

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      frequency: row.frequency,
      examples: JSON.parse(row.examples),
      learnedFrom: JSON.parse(row.learned_from),
    }));
  }

  // ===== Global Conventions Methods =====

  /**
   * Set a global convention
   */
  async setConvention(key: string, value: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `INSERT INTO global_conventions (user_id, key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
      )
      .run(this.userId, key, value);
  }

  /**
   * Get a convention value
   */
  async getConvention(key: string): Promise<string | undefined> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT value FROM global_conventions WHERE user_id = ? AND key = ?")
      .get(this.userId, key) as { value: string } | undefined;

    return result?.value;
  }

  /**
   * Get all conventions
   */
  async getAllConventions(): Promise<Record<string, string>> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare("SELECT key, value FROM global_conventions WHERE user_id = ?")
      .all(this.userId) as { key: string; value: string }[];

    const conventions: Record<string, string> = {};
    for (const row of results) {
      conventions[row.key] = row.value;
    }

    return conventions;
  }

  // ===== Project History Methods =====

  /**
   * Track a project (adds or updates project history)
   */
  async trackProject(projectId: string, projectPath: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `INSERT INTO project_history (user_id, project_id, project_path, last_accessed, total_sessions)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(user_id, project_id) DO UPDATE SET
           last_accessed = ?,
           project_path = excluded.project_path`
      )
      .run(this.userId, projectId, projectPath, Date.now(), Date.now());
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number): Promise<ProjectRef[]> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const results = this.db
      .prepare(
        `SELECT project_id, project_path, last_accessed, total_sessions
         FROM project_history
         WHERE user_id = ?
         ORDER BY last_accessed DESC
         LIMIT ?`
      )
      .all(this.userId, limit) as any[];

    return results.map((row) => ({
      projectId: row.project_id,
      projectPath: row.project_path,
      lastAccessed: row.last_accessed,
      totalSessions: row.total_sessions,
    }));
  }

  /**
   * Increment session count for a project
   */
  async incrementSessionCount(projectId: string): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    this.db
      .prepare(
        `UPDATE project_history
         SET total_sessions = total_sessions + 1, last_accessed = ?
         WHERE user_id = ? AND project_id = ?`
      )
      .run(Date.now(), this.userId, projectId);
  }

  // ===== Metadata Methods =====

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const jsonValue = JSON.stringify(value);
    this.db
      .prepare(
        `INSERT INTO user_metadata (user_id, key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
      )
      .run(this.userId, key, jsonValue);
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<any> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const result = this.db
      .prepare("SELECT value FROM user_metadata WHERE user_id = ? AND key = ?")
      .get(this.userId, key) as { value: string } | undefined;

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
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    if (!this.db || !this.userId) {
      throw new Error("User not initialized. Call init() first.");
    }

    const preferencesCount = this.db
      .prepare("SELECT COUNT(*) as count FROM preferences WHERE user_id = ?")
      .get(this.userId) as { count: number };

    const expertiseCount = this.db
      .prepare("SELECT COUNT(*) as count FROM expertise WHERE user_id = ?")
      .get(this.userId) as { count: number };

    const patternsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM user_patterns WHERE user_id = ?")
      .get(this.userId) as { count: number };

    const conventionsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM global_conventions WHERE user_id = ?")
      .get(this.userId) as { count: number };

    const projectHistoryCount = this.db
      .prepare("SELECT COUNT(*) as count FROM project_history WHERE user_id = ?")
      .get(this.userId) as { count: number };

    const metadataCount = this.db
      .prepare("SELECT COUNT(*) as count FROM user_metadata WHERE user_id = ?")
      .get(this.userId) as { count: number };

    return {
      userId: this.userId,
      preferencesCount: preferencesCount.count,
      expertiseCount: expertiseCount.count,
      patternsCount: patternsCount.count,
      globalConventionsCount: conventionsCount.count,
      projectHistoryCount: projectHistoryCount.count,
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
