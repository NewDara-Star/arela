import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";
import { GraphDB } from "../../src/ingest/storage.js";
import { GraphMemory } from "../../src/memory/graph.js";

describe("GraphMemory (Hexi-005 wrapper)", () => {
  let testDir: string;
  let dbPath: string;
  let graph: GraphMemory;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `arela-graph-test-${Date.now()}`);
    dbPath = path.join(testDir, ".arela", "memory", "graph.db");
    await fs.ensureDir(path.dirname(dbPath));

    // Seed a tiny graph database
    const db = new GraphDB(dbPath);
    const fileIdA = db.addFile({
      path: "src/a.ts",
      repoPath: testDir,
      type: "component",
      lines: 10,
    });
    const fileIdB = db.addFile({
      path: "src/b.ts",
      repoPath: testDir,
      type: "service",
      lines: 20,
    });

    // a.ts imports b.ts
    db.addImport(fileIdA, fileIdB, null, "named", ["b"], 3);

    // Functions in a.ts and b.ts
    db.addFunction(fileIdA, {
      name: "fnA",
      isExported: true,
      lineStart: 1,
      lineEnd: 5,
      calls: [],
      calledBy: [],
    });
    db.addFunction(fileIdB, {
      name: "fnB",
      isExported: false,
      lineStart: 1,
      lineEnd: 10,
      calls: [],
      calledBy: [],
    });
    db.close();

    graph = new GraphMemory(testDir);
    await graph.init(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should report readiness when graph.db exists", async () => {
    const ready = await graph.isReady();
    expect(ready).toBe(true);
  });

  it("should expose file stats via wrapper getStats", async () => {
    const stats = await graph.getStats();
    expect(stats.ready).toBe(true);
    expect(stats.files).toBeGreaterThanOrEqual(2);
    expect(stats.imports).toBeGreaterThanOrEqual(1);
    expect(stats.functions).toBeGreaterThanOrEqual(2);
    expect(stats.dbPath).toContain("graph.db");
  });

  it("should retrieve file nodes and search files", async () => {
    const file = await graph.getFile("src/a.ts");
    expect(file).toBeDefined();
    expect(file!.path).toBe("src/a.ts");
    expect(file!.repoPath).toBe(testDir);
    expect(file!.language).toBe("TypeScript");

    const files = await graph.getFiles();
    expect(files.length).toBeGreaterThanOrEqual(2);

    const matching = await graph.searchFiles("a.ts");
    expect(matching.some((f) => f.path === "src/a.ts")).toBe(true);
  });

  it("should resolve imports and imported-by relationships", async () => {
    const imports = await graph.getImports("src/a.ts");
    expect(imports).toHaveLength(1);
    expect(imports[0].source).toBe("src/a.ts");
    expect(imports[0].target).toBe("src/b.ts");

    const importedBy = await graph.getImportedBy("src/b.ts");
    expect(importedBy).toContain("src/a.ts");
  });

  it("should walk dependencies and dependents up to given depth", async () => {
    const deps = await graph.getDependencies("src/a.ts", 2);
    expect(deps).toContain("src/b.ts");

    const dependents = await graph.getDependents("src/b.ts", 2);
    expect(dependents).toContain("src/a.ts");
  });

  it("should return functions for a file and support function search", async () => {
    const funcs = await graph.getFunctions("src/a.ts");
    expect(funcs).toHaveLength(1);
    expect(funcs[0].name).toBe("fnA");

    const search = await graph.searchFunctions("fn");
    expect(search.length).toBeGreaterThanOrEqual(2);
    const names = search.map((f) => f.name);
    expect(names).toContain("fnA");
    expect(names).toContain("fnB");
  });
});

