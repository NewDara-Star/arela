import path from "node:path";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { AuditMemory } from "./audit.js";

export interface EventFilters {
  type?: string;
  agent?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: string;
  agent: string;
  data: Record<string, any>;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  timestamp: number;
  tags: string[];
}

export interface Change {
  id: string;
  file: string;
  author: string;
  timestamp: number;
  description: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface GovernanceStats {
  totalEvents: number;
  totalDecisions: number;
  totalChanges: number;
  eventsByType: Record<string, number>;
  lastUpdated: number;
}

/**
 * GovernanceMemory (Hexi-006)
 *
 * Thin wrapper over the existing audit log database (`.arela/memory/audit.db`)
 * that exposes a higher-level query surface for governance / historical queries.
 *
 * NOTE: This does not modify the underlying audit schema; it simply reads from
 * the existing `audit_log` table created by `AuditMemory`.
 */
export class GovernanceMemory {
  private dbPath!: string;

  constructor(private readonly cwd: string = process.cwd()) {}

  /**
   * Initialize governance memory for a project path.
   * Ensures the underlying audit database exists and schema is ready.
   */
  async init(projectPath: string): Promise<void> {
    const base = projectPath || this.cwd;
    this.dbPath = path.join(base, ".arela", "memory", "audit.db");

    // Ensure directory exists
    await fs.ensureDir(path.dirname(this.dbPath));

    // Reuse AuditMemory to initialize schema without changing its behaviour.
    const audit = new AuditMemory(base);
    await audit.init();
  }

  /**
   * Get raw events from the audit log with optional filtering.
   * Filtering is done in memory for simplicity and to keep schema-agnostic.
   */
  async getEvents(filters?: EventFilters): Promise<AuditEvent[]> {
    const db = this.openDb();
    try {
      const rows = db
        .prepare(
          `
          SELECT id, timestamp, agent, action, result, metadata, commit_hash, ticket_id, policy_violations
          FROM audit_log
          ORDER BY timestamp DESC
        `
        )
        .all() as any[];

      let events = rows.map((row) => this.rowToEvent(row));

      if (filters?.type) {
        events = events.filter((e) => e.type === filters.type);
      }

      if (filters?.agent) {
        events = events.filter((e) => e.agent === filters.agent);
      }

      if (typeof filters?.startDate === "number") {
        events = events.filter((e) => e.timestamp >= filters.startDate!);
      }

      if (typeof filters?.endDate === "number") {
        events = events.filter((e) => e.timestamp <= filters.endDate!);
      }

      if (typeof filters?.limit === "number" && filters.limit > 0) {
        events = events.slice(0, filters.limit);
      }

      return events;
    } finally {
      db.close();
    }
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

  /**
   * Governance decisions derived from audit events with type === "decision".
   * The event's metadata is expected to carry decision-specific fields.
   */
  async getDecisions(): Promise<Decision[]> {
    const events = await this.getEvents({ type: "decision" });
    return events.map((event) => {
      const data = event.data ?? {};
      return {
        id: String(data.id ?? event.id),
        title: String(data.title ?? data.action ?? "Unknown decision"),
        description: String(data.description ?? ""),
        rationale: String(data.rationale ?? ""),
        timestamp: event.timestamp,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      };
    });
  }

  async getDecisionsByTag(tag: string): Promise<Decision[]> {
    const decisions = await this.getDecisions();
    return decisions.filter((d) => d.tags.includes(tag));
  }

  /**
   * Change events derived from audit events with type === "change".
   */
  async getChanges(filePath?: string): Promise<Change[]> {
    const events = await this.getEvents({ type: "change" });
    const changes: Change[] = events.map((event) => {
      const data = event.data ?? {};
      return {
        id: String(data.id ?? event.id),
        file: String(data.file ?? ""),
        author: String(data.author ?? event.agent),
        timestamp: event.timestamp,
        description: String(data.description ?? ""),
        linesAdded: Number(data.linesAdded ?? 0),
        linesRemoved: Number(data.linesRemoved ?? 0),
      };
    });

    if (filePath) {
      const normalized = this.normalizePath(filePath);
      return changes.filter((c) => c.file === normalized);
    }

    return changes;
  }

  async getChangesByAuthor(author: string): Promise<Change[]> {
    const changes = await this.getChanges();
    return changes.filter((c) => c.author === author);
  }

  /**
   * Aggregate governance statistics from the audit log.
   */
  async getStats(): Promise<GovernanceStats> {
    const events = await this.getEvents();

    const eventsByType: Record<string, number> = {};
    let totalDecisions = 0;
    let totalChanges = 0;
    let lastUpdated = 0;

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
      if (event.type === "decision") {
        totalDecisions += 1;
      } else if (event.type === "change") {
        totalChanges += 1;
      }
      if (event.timestamp > lastUpdated) {
        lastUpdated = event.timestamp;
      }
    }

    return {
      totalEvents: events.length,
      totalDecisions,
      totalChanges,
      eventsByType,
      lastUpdated,
    };
  }

  private openDb(): Database.Database {
    if (!this.dbPath) {
      // Fallback if init was not called explicitly – mirror AuditMemory behaviour.
      this.dbPath = path.join(this.cwd, ".arela", "memory", "audit.db");
    }

    fs.ensureDirSync(path.dirname(this.dbPath));
    const db = new Database(this.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
  }

  private rowToEvent(row: any): AuditEvent {
    const metadata = this.safeParseJson(row.metadata) ?? {};
    const policyViolations = this.safeParseJson(row.policy_violations) ?? undefined;

    const timestampMs = this.parseTimestamp(row.timestamp);

    // Prefer explicit metadata.type if present; fall back to action/result.
    const type: string =
      typeof metadata.type === "string"
        ? metadata.type
        : row.action
        ? String(row.action)
        : "event";

    const data: Record<string, any> = {
      ...metadata,
      result: row.result,
      commitHash: row.commit_hash,
      ticketId: row.ticket_id,
      policyViolations,
    };

    return {
      id: String(row.id),
      timestamp: timestampMs,
      type,
      agent: String(row.agent),
      data,
    };
  }

  private parseTimestamp(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Date.now();
  }

  private safeParseJson(value: unknown): any {
    if (!value || typeof value !== "string") {
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  private normalizePath(filePath: string): string {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    const relative = path.relative(this.cwd, absolute);
    return relative.split(path.sep).join(path.posix.sep);
  }
}

