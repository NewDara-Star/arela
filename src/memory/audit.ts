import path from "node:path";
import Database from "better-sqlite3";
import fs from "fs-extra";
import type { AuditEntry, AuditLogEntry, AuditStats, AuditTrail, AuditResult } from "./types.js";

export interface AuditFilter {
  commitHash?: string;
  ticketId?: string;
  limit?: number;
}

export class AuditMemory {
  constructor(private readonly cwd: string = process.cwd()) {}

  private get dbPath(): string {
    return path.join(this.cwd, ".arela", "memory", "audit.db");
  }

  async isReady(): Promise<boolean> {
    return fs.pathExists(this.dbPath);
  }

  async init(): Promise<void> {
    const db = this.openDb();
    db.close();
  }

  async logDecision(entry: AuditEntry): Promise<void> {
    const db = this.openDb();
    try {
      const stmt = db.prepare(`
        INSERT INTO audit_log (
          timestamp,
          agent,
          action,
          input_hash,
          output_hash,
          result,
          metadata,
          commit_hash,
          ticket_id,
          policy_violations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        entry.timestamp ?? new Date().toISOString(),
        entry.agent,
        entry.action,
        entry.inputHash ?? null,
        entry.outputHash ?? null,
        entry.result,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.commitHash ?? null,
        entry.ticketId ?? null,
        entry.policyViolations ? JSON.stringify(entry.policyViolations) : null
      );
    } finally {
      db.close();
    }
  }

  async getAuditTrail(filter?: AuditFilter): Promise<AuditTrail> {
    if (!(await this.isReady())) {
      return { scope: "all", entries: [] };
    }

    const db = this.openDb();
    try {
      const where: string[] = [];
      const params: Array<string | number> = [];

      if (filter?.commitHash) {
        where.push("commit_hash = ?");
        params.push(filter.commitHash);
      }

      if (filter?.ticketId) {
        where.push("ticket_id = ?");
        params.push(filter.ticketId);
      }

      const limit = Math.max(1, filter?.limit ?? 25);
      const query = `
        SELECT *
        FROM audit_log
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      const rows = db.prepare(query).all(...params, limit) as any[];

      return {
        scope: filter?.commitHash ? "commit" : filter?.ticketId ? "ticket" : "all",
        filter: filter?.commitHash ?? filter?.ticketId,
        entries: rows.map(deserializeAuditRow),
      };
    } finally {
      db.close();
    }
  }

  async getStats(): Promise<AuditStats> {
    if (!(await this.isReady())) {
      return {
        ready: false,
        entries: 0,
        success: 0,
        failure: 0,
        pending: 0,
        agents: {},
        dbPath: this.dbPath,
      };
    }

    const db = this.openDb();
    try {
      const totals = db
        .prepare(
          `
            SELECT
              COUNT(*) as entries,
              SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) as success,
              SUM(CASE WHEN result = 'failure' THEN 1 ELSE 0 END) as failure,
              SUM(CASE WHEN result = 'pending' THEN 1 ELSE 0 END) as pending
            FROM audit_log
          `
        )
        .get() as Record<string, number>;

      const agentRows = db
        .prepare(`SELECT agent, COUNT(*) as count FROM audit_log GROUP BY agent ORDER BY count DESC`)
        .all() as Array<{ agent: string; count: number }>;

      const agents: Record<string, number> = {};
      for (const row of agentRows) {
        if (row.agent) {
          agents[row.agent] = row.count;
        }
      }

      return {
        ready: true,
        entries: totals?.entries ?? 0,
        success: totals?.success ?? 0,
        failure: totals?.failure ?? 0,
        pending: totals?.pending ?? 0,
        agents,
        dbPath: this.dbPath,
      };
    } finally {
      db.close();
    }
  }

  private openDb(): Database.Database {
    fs.ensureDirSync(path.dirname(this.dbPath));
    const db = new Database(this.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    this.initSchema(db);
    return db;
  }

  private initSchema(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        agent TEXT NOT NULL,
        action TEXT NOT NULL,
        input_hash TEXT,
        output_hash TEXT,
        result TEXT NOT NULL,
        metadata TEXT,
        commit_hash TEXT,
        ticket_id TEXT,
        policy_violations TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_commit ON audit_log(commit_hash);
      CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_log(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent);
    `);
  }
}

function deserializeAuditRow(row: any): AuditLogEntry {
  return {
    ...row,
    timestamp: row.timestamp,
    metadata: parseJson(row.metadata),
    policyViolations: parseJson(row.policyViolations) ?? undefined,
    result: normalizeResult(row.result),
  };
}

function parseJson(value: unknown): any {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function normalizeResult(value: unknown): AuditResult {
  if (value === "success" || value === "failure" || value === "pending") {
    return value;
  }
  return "pending";
}
