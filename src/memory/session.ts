import path from "node:path";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Message, SessionMemoryData, SessionStats } from "./types.js";

/**
 * Session Memory Layer (Layer 4 - Hexi-Memory)
 *
 * Stores short-term context for the current conversation/task:
 * - Current task being worked on
 * - Open files being tracked
 * - Conversation history
 * - Active ticket
 * - Arbitrary context key-value pairs
 *
 * Features:
 * - In-memory cache for fast access (<50ms)
 * - SQLite persistence for crash recovery
 * - Auto-snapshot every 30 seconds
 * - Restore from last snapshot on init
 */
export class SessionMemory {
  private db?: Database.Database;
  private dbPath: string;
  private cache: SessionMemoryData;
  private snapshotInterval?: NodeJS.Timeout;
  private initialized = false;
  private exitHandler?: () => void;
  private sigintHandler?: () => void;
  private sigtermHandler?: () => void;

  constructor(private readonly cwd: string = process.cwd()) {
    this.dbPath = path.join(cwd, ".arela", "memory", "session.db");

    // Initialize in-memory cache
    this.cache = {
      sessionId: randomUUID(),
      startTime: Date.now(),
      filesOpen: [],
      conversationHistory: [],
      context: {},
    };
  }

  /**
   * Initialize session memory
   * - Sets up SQLite database
   * - Attempts to restore from last snapshot
   * - Starts auto-snapshot interval
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

    // Try to restore from last snapshot
    await this.restore();

    // Start auto-snapshot (every 30 seconds)
    this.snapshotInterval = setInterval(() => {
      this.snapshot().catch(console.error);
    }, 30000);

    // Save on exit - store handlers for cleanup
    this.exitHandler = () => {
      if (this.initialized) {
        this.snapshot().catch(console.error);
      }
    };

    this.sigintHandler = () => {
      if (this.initialized) {
        this.snapshot().catch(console.error);
        this.close();
      }
      process.exit(0);
    };

    this.sigtermHandler = () => {
      if (this.initialized) {
        this.snapshot().catch(console.error);
        this.close();
      }
      process.exit(0);
    };

    process.on("exit", this.exitHandler);
    process.on("SIGINT", this.sigintHandler);
    process.on("SIGTERM", this.sigtermHandler);

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
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        current_task TEXT,
        active_ticket TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS session_files (
        session_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        opened_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS session_messages (
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS session_context (
        session_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        PRIMARY KEY (session_id, key)
      );
    `);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.cache.sessionId;
  }

  /**
   * Get current task
   */
  async getCurrentTask(): Promise<string | undefined> {
    return this.cache.currentTask;
  }

  /**
   * Set current task
   */
  async setCurrentTask(task: string): Promise<void> {
    this.cache.currentTask = task;
  }

  /**
   * Add message to conversation history
   */
  async addMessage(message: Message): Promise<void> {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };
    this.cache.conversationHistory.push(messageWithTimestamp);
  }

  /**
   * Get recent messages from conversation history
   */
  async getRecentMessages(count: number): Promise<Message[]> {
    return this.cache.conversationHistory.slice(-count);
  }

  /**
   * Get all messages from conversation history
   */
  async getAllMessages(): Promise<Message[]> {
    return [...this.cache.conversationHistory];
  }

  /**
   * Track an open file
   */
  async trackOpenFile(filePath: string): Promise<void> {
    if (!this.cache.filesOpen.includes(filePath)) {
      this.cache.filesOpen.push(filePath);
    }
  }

  /**
   * Untrack a file
   */
  async untrackFile(filePath: string): Promise<void> {
    this.cache.filesOpen = this.cache.filesOpen.filter(f => f !== filePath);
  }

  /**
   * Get list of open files
   */
  async getOpenFiles(): Promise<string[]> {
    return [...this.cache.filesOpen];
  }

  /**
   * Set active ticket
   */
  async setActiveTicket(ticketId: string): Promise<void> {
    this.cache.activeTicket = ticketId;
  }

  /**
   * Get active ticket
   */
  async getActiveTicket(): Promise<string | undefined> {
    return this.cache.activeTicket;
  }

  /**
   * Set context value
   */
  async setContext(key: string, value: any): Promise<void> {
    this.cache.context[key] = value;
  }

  /**
   * Get context value
   */
  async getContext<T = any>(key: string): Promise<T | undefined> {
    return this.cache.context[key] as T | undefined;
  }

  /**
   * Get all context
   */
  async getAllContext(): Promise<Record<string, any>> {
    return { ...this.cache.context };
  }

  /**
   * Delete context key
   */
  async deleteContext(key: string): Promise<void> {
    delete this.cache.context[key];
  }

  /**
   * Save current state to SQLite (snapshot)
   */
  async snapshot(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }

    const tx = this.db.transaction(() => {
      // Clear existing session data
      this.db!.prepare("DELETE FROM session_context WHERE session_id = ?").run(this.cache.sessionId);
      this.db!.prepare("DELETE FROM session_messages WHERE session_id = ?").run(this.cache.sessionId);
      this.db!.prepare("DELETE FROM session_files WHERE session_id = ?").run(this.cache.sessionId);
      this.db!.prepare("DELETE FROM sessions WHERE id = ?").run(this.cache.sessionId);

      // Insert session
      this.db!.prepare(`
        INSERT INTO sessions (id, start_time, current_task, active_ticket)
        VALUES (?, ?, ?, ?)
      `).run(
        this.cache.sessionId,
        this.cache.startTime,
        this.cache.currentTask || null,
        this.cache.activeTicket || null
      );

      // Insert files
      const insertFile = this.db!.prepare(`
        INSERT INTO session_files (session_id, file_path)
        VALUES (?, ?)
      `);
      for (const filePath of this.cache.filesOpen) {
        insertFile.run(this.cache.sessionId, filePath);
      }

      // Insert messages
      const insertMessage = this.db!.prepare(`
        INSERT INTO session_messages (session_id, role, content, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      for (const message of this.cache.conversationHistory) {
        insertMessage.run(
          this.cache.sessionId,
          message.role,
          message.content,
          message.timestamp || Date.now()
        );
      }

      // Insert context
      const insertContext = this.db!.prepare(`
        INSERT INTO session_context (session_id, key, value)
        VALUES (?, ?, ?)
      `);
      for (const [key, value] of Object.entries(this.cache.context)) {
        insertContext.run(
          this.cache.sessionId,
          key,
          JSON.stringify(value)
        );
      }
    });

    tx();
  }

  /**
   * Restore state from SQLite snapshot
   */
  async restore(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }

    // Get most recent session
    const session = this.db.prepare(`
      SELECT id, start_time, current_task, active_ticket
      FROM sessions
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as { id: string; start_time: number; current_task: string | null; active_ticket: string | null } | undefined;

    if (!session) {
      // No previous session to restore
      return;
    }

    // Restore session data
    this.cache.sessionId = session.id;
    this.cache.startTime = session.start_time;
    this.cache.currentTask = session.current_task || undefined;
    this.cache.activeTicket = session.active_ticket || undefined;

    // Restore files
    const files = this.db.prepare(`
      SELECT file_path
      FROM session_files
      WHERE session_id = ?
      ORDER BY opened_at
    `).all(session.id) as { file_path: string }[];
    this.cache.filesOpen = files.map(f => f.file_path);

    // Restore messages
    const messages = this.db.prepare(`
      SELECT role, content, timestamp
      FROM session_messages
      WHERE session_id = ?
      ORDER BY timestamp
    `).all(session.id) as { role: string; content: string; timestamp: number }[];
    this.cache.conversationHistory = messages.map(m => ({
      role: m.role as Message["role"],
      content: m.content,
      timestamp: m.timestamp,
    }));

    // Restore context
    const contextRows = this.db.prepare(`
      SELECT key, value
      FROM session_context
      WHERE session_id = ?
    `).all(session.id) as { key: string; value: string }[];

    this.cache.context = {};
    for (const row of contextRows) {
      try {
        this.cache.context[row.key] = JSON.parse(row.value);
      } catch {
        this.cache.context[row.key] = row.value;
      }
    }
  }

  /**
   * Clear current session (start fresh)
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }

    // Delete from database
    this.db.prepare("DELETE FROM session_context WHERE session_id = ?").run(this.cache.sessionId);
    this.db.prepare("DELETE FROM session_messages WHERE session_id = ?").run(this.cache.sessionId);
    this.db.prepare("DELETE FROM session_files WHERE session_id = ?").run(this.cache.sessionId);
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(this.cache.sessionId);

    // Reset cache
    this.cache = {
      sessionId: randomUUID(),
      startTime: Date.now(),
      filesOpen: [],
      conversationHistory: [],
      context: {},
    };
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<SessionStats> {
    return {
      sessionId: this.cache.sessionId,
      startTime: this.cache.startTime,
      messagesCount: this.cache.conversationHistory.length,
      filesOpenCount: this.cache.filesOpen.length,
      contextKeysCount: Object.keys(this.cache.context).length,
      dbPath: this.dbPath,
    };
  }

  /**
   * Close database and stop auto-snapshot
   */
  close(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = undefined;
    }

    // Remove event listeners
    if (this.exitHandler) {
      process.off("exit", this.exitHandler);
      this.exitHandler = undefined;
    }
    if (this.sigintHandler) {
      process.off("SIGINT", this.sigintHandler);
      this.sigintHandler = undefined;
    }
    if (this.sigtermHandler) {
      process.off("SIGTERM", this.sigtermHandler);
      this.sigtermHandler = undefined;
    }

    if (this.db) {
      this.db.close();
      this.db = undefined;
    }

    this.initialized = false;
  }
}
