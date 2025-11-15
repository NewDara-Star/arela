import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";
import { AuditMemory } from "../../src/memory/audit.js";
import { GovernanceMemory } from "../../src/memory/governance.js";

describe("GovernanceMemory (Hexi-006 wrapper)", () => {
  let testDir: string;
  let audit: AuditMemory;
  let gov: GovernanceMemory;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `arela-governance-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    audit = new AuditMemory(testDir);
    await audit.init();

    const now = Date.now();
    const earlier = now - 60_000;

    // Decision event
    await audit.logDecision({
      agent: "codex",
      action: "decision-recorded",
      result: "success",
      timestamp: new Date(earlier).toISOString(),
      metadata: {
        type: "decision",
        id: "dec-1",
        title: "Use PostgreSQL",
        description: "Chose Postgres over MongoDB",
        rationale: "Relational model fits better",
        tags: ["database", "architecture"],
      },
    });

    // Change event
    await audit.logDecision({
      agent: "claude",
      action: "change-recorded",
      result: "success",
      timestamp: new Date(now).toISOString(),
      metadata: {
        type: "change",
        id: "chg-1",
        file: "src/index.ts",
        author: "Alice",
        description: "Refactor entry point",
        linesAdded: 10,
        linesRemoved: 2,
      },
    });

    gov = new GovernanceMemory(testDir);
    await gov.init(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should fetch raw events with filters", async () => {
    const all = await gov.getEvents();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const decisions = await gov.getEventsByType("decision");
    expect(decisions.every((e) => e.type === "decision")).toBe(true);

    const codexEvents = await gov.getEventsByAgent("codex");
    expect(codexEvents.length).toBeGreaterThanOrEqual(1);
    expect(codexEvents.every((e) => e.agent === "codex")).toBe(true);

    const recent = await gov.getRecentEvents(1);
    expect(recent.length).toBe(1);
  });

  it("should project decision records", async () => {
    const decisions = await gov.getDecisions();
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    const decision = decisions[0];
    expect(decision.id).toBe("dec-1");
    expect(decision.title).toBe("Use PostgreSQL");
    expect(decision.tags).toContain("database");

    const dbDecisions = await gov.getDecisionsByTag("database");
    expect(dbDecisions.length).toBeGreaterThanOrEqual(1);
  });

  it("should project change records and filter by file/author", async () => {
    const changes = await gov.getChanges();
    expect(changes.length).toBeGreaterThanOrEqual(1);

    const fileChanges = await gov.getChanges("src/index.ts");
    expect(fileChanges.length).toBeGreaterThanOrEqual(1);
    expect(fileChanges[0].file).toBe("src/index.ts");

    const byAuthor = await gov.getChangesByAuthor("Alice");
    expect(byAuthor.length).toBeGreaterThanOrEqual(1);
    expect(byAuthor[0].author).toBe("Alice");
  });

  it("should compute governance stats", async () => {
    const stats = await gov.getStats();
    expect(stats.totalEvents).toBeGreaterThanOrEqual(2);
    expect(stats.totalDecisions).toBeGreaterThanOrEqual(1);
    expect(stats.totalChanges).toBeGreaterThanOrEqual(1);
    expect(stats.eventsByType.decision).toBeGreaterThanOrEqual(1);
    expect(stats.lastUpdated).toBeGreaterThan(0);
  });
});

