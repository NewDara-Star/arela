import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProjectMemory } from "../../src/memory/project.js";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";

describe("ProjectMemory", () => {
  let projectMemory: ProjectMemory;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = path.join(os.tmpdir(), `arela-project-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    projectMemory = new ProjectMemory(testDir);
    await projectMemory.init();
  });

  afterEach(async () => {
    // Clean up
    projectMemory.close();
    await fs.remove(testDir);
  });

  describe("Initialization", () => {
    it("should initialize new project with unique ID", async () => {
      const projectId = projectMemory.getProjectId();
      expect(projectId).toBeDefined();
      expect(projectId.length).toBeGreaterThan(0);
    });

    it("should create database file", async () => {
      const dbPath = path.join(testDir, ".arela", "memory", "project.db");
      const exists = await fs.pathExists(dbPath);
      expect(exists).toBe(true);
    });

    it("should reuse same project ID on second init", async () => {
      const projectId1 = projectMemory.getProjectId();
      projectMemory.close();

      const projectMemory2 = new ProjectMemory(testDir);
      await projectMemory2.init();
      const projectId2 = projectMemory2.getProjectId();

      expect(projectId1).toBe(projectId2);
      projectMemory2.close();
    });

    it("should initialize with custom project path", async () => {
      const customDir = path.join(os.tmpdir(), `arela-custom-${Date.now()}`);
      await fs.ensureDir(customDir);

      const customProject = new ProjectMemory();
      await customProject.init(customDir);

      const dbPath = path.join(customDir, ".arela", "memory", "project.db");
      const exists = await fs.pathExists(dbPath);
      expect(exists).toBe(true);

      customProject.close();
      await fs.remove(customDir);
    });
  });

  describe("Architecture Management", () => {
    it("should set and get architecture", async () => {
      await projectMemory.setArchitecture("VSA with 8 slices");
      const arch = await projectMemory.getArchitecture();
      expect(arch).toBe("VSA with 8 slices");
    });

    it("should update architecture", async () => {
      await projectMemory.setArchitecture("Modular Monolith");
      await projectMemory.setArchitecture("Microservices");
      const arch = await projectMemory.getArchitecture();
      expect(arch).toBe("Microservices");
    });

    it("should return undefined for unset architecture", async () => {
      const arch = await projectMemory.getArchitecture();
      expect(arch).toBeUndefined();
    });

    it("should persist architecture across sessions", async () => {
      await projectMemory.setArchitecture("VSA with 8 slices");
      projectMemory.close();

      const newProject = new ProjectMemory(testDir);
      await newProject.init();
      const arch = await newProject.getArchitecture();
      expect(arch).toBe("VSA with 8 slices");
      newProject.close();
    });
  });

  describe("Tech Stack Management", () => {
    it("should add technology to stack", async () => {
      await projectMemory.addTechStack("TypeScript");
      const stack = await projectMemory.getTechStack();
      expect(stack).toContain("TypeScript");
    });

    it("should add multiple technologies", async () => {
      await projectMemory.addTechStack("TypeScript");
      await projectMemory.addTechStack("Next.js");
      await projectMemory.addTechStack("PostgreSQL");

      const stack = await projectMemory.getTechStack();
      expect(stack).toHaveLength(3);
      expect(stack).toContain("TypeScript");
      expect(stack).toContain("Next.js");
      expect(stack).toContain("PostgreSQL");
    });

    it("should not duplicate technologies", async () => {
      await projectMemory.addTechStack("React");
      await projectMemory.addTechStack("React");
      const stack = await projectMemory.getTechStack();
      expect(stack).toHaveLength(1);
    });

    it("should maintain insertion order", async () => {
      await projectMemory.addTechStack("A");
      await projectMemory.addTechStack("B");
      await projectMemory.addTechStack("C");

      const stack = await projectMemory.getTechStack();
      expect(stack).toEqual(["A", "B", "C"]);
    });
  });

  describe("Decision Recording", () => {
    it("should add decision", async () => {
      await projectMemory.addDecision({
        title: "Use PostgreSQL",
        description: "Chose Postgres over MongoDB",
        rationale: "Relational data model fits better",
        date: Date.now(),
        tags: ["database", "architecture"],
      });

      const decisions = await projectMemory.getDecisions();
      expect(decisions).toHaveLength(1);
      expect(decisions[0].title).toBe("Use PostgreSQL");
      expect(decisions[0].tags).toEqual(["database", "architecture"]);
    });

    it("should add decision with custom ID", async () => {
      await projectMemory.addDecision({
        id: "custom-id-001",
        title: "Decision with custom ID",
        description: "Test",
        rationale: "Test",
        date: Date.now(),
        tags: ["test"],
      });

      const decisions = await projectMemory.getDecisions();
      expect(decisions[0].id).toBe("custom-id-001");
    });

    it("should filter decisions by tags", async () => {
      await projectMemory.addDecision({
        title: "Decision 1",
        description: "DB choice",
        rationale: "Better performance",
        date: Date.now(),
        tags: ["database", "performance"],
      });

      await projectMemory.addDecision({
        title: "Decision 2",
        description: "Auth choice",
        rationale: "Security",
        date: Date.now(),
        tags: ["auth", "security"],
      });

      await projectMemory.addDecision({
        title: "Decision 3",
        description: "DB and Auth",
        rationale: "Combined",
        date: Date.now(),
        tags: ["database", "auth"],
      });

      const dbDecisions = await projectMemory.getDecisions(["database"]);
      expect(dbDecisions).toHaveLength(2);
      expect(dbDecisions.map((d) => d.title)).toContain("Decision 1");
      expect(dbDecisions.map((d) => d.title)).toContain("Decision 3");
    });

    it("should search decisions by text", async () => {
      await projectMemory.addDecision({
        title: "Use PostgreSQL",
        description: "Database choice",
        rationale: "Strong ACID compliance",
        date: Date.now(),
        tags: ["database"],
      });

      await projectMemory.addDecision({
        title: "Use Redis",
        description: "Caching layer",
        rationale: "Fast in-memory storage",
        date: Date.now(),
        tags: ["cache"],
      });

      const results = await projectMemory.searchDecisions("PostgreSQL");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Use PostgreSQL");
    });

    it("should search in description and rationale", async () => {
      await projectMemory.addDecision({
        title: "Framework Choice",
        description: "Use Next.js for frontend",
        rationale: "Better SEO and performance",
        date: Date.now(),
        tags: ["frontend"],
      });

      const results = await projectMemory.searchDecisions("Next.js");
      expect(results).toHaveLength(1);

      const results2 = await projectMemory.searchDecisions("SEO");
      expect(results2).toHaveLength(1);
    });

    it("should order decisions by date (newest first)", async () => {
      await projectMemory.addDecision({
        title: "Old Decision",
        description: "Test",
        rationale: "Test",
        date: Date.now() - 10000,
        tags: [],
      });

      await projectMemory.addDecision({
        title: "New Decision",
        description: "Test",
        rationale: "Test",
        date: Date.now(),
        tags: [],
      });

      const decisions = await projectMemory.getDecisions();
      expect(decisions[0].title).toBe("New Decision");
      expect(decisions[1].title).toBe("Old Decision");
    });
  });

  describe("Pattern Tracking", () => {
    it("should add pattern", async () => {
      await projectMemory.addPattern({
        name: "Repository Pattern",
        description: "Data access abstraction",
        examples: ["UserRepository", "PostRepository"],
        frequency: 0,
      });

      const patterns = await projectMemory.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("Repository Pattern");
      expect(patterns[0].examples).toEqual([
        "UserRepository",
        "PostRepository",
      ]);
    });

    it("should add pattern with custom ID", async () => {
      await projectMemory.addPattern({
        id: "pat-001",
        name: "Singleton",
        description: "Single instance",
        examples: ["Database"],
        frequency: 0,
      });

      const patterns = await projectMemory.getPatterns();
      expect(patterns[0].id).toBe("pat-001");
    });

    it("should increment pattern usage", async () => {
      await projectMemory.addPattern({
        id: "pat-001",
        name: "Factory",
        description: "Object creation",
        examples: [],
        frequency: 0,
      });

      await projectMemory.incrementPatternUsage("pat-001");
      await projectMemory.incrementPatternUsage("pat-001");

      const patterns = await projectMemory.getPatterns();
      expect(patterns[0].frequency).toBe(2);
    });

    it("should order patterns by frequency (highest first)", async () => {
      await projectMemory.addPattern({
        id: "pat-001",
        name: "Pattern A",
        description: "Test",
        examples: [],
        frequency: 5,
      });

      await projectMemory.addPattern({
        id: "pat-002",
        name: "Pattern B",
        description: "Test",
        examples: [],
        frequency: 10,
      });

      await projectMemory.addPattern({
        id: "pat-003",
        name: "Pattern C",
        description: "Test",
        examples: [],
        frequency: 3,
      });

      const patterns = await projectMemory.getPatterns();
      expect(patterns[0].name).toBe("Pattern B");
      expect(patterns[1].name).toBe("Pattern A");
      expect(patterns[2].name).toBe("Pattern C");
    });
  });

  describe("Todo Management", () => {
    it("should add todo", async () => {
      await projectMemory.addTodo({
        task: "Add integration tests",
        priority: "high",
        completed: false,
      });

      const todos = await projectMemory.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].task).toBe("Add integration tests");
      expect(todos[0].priority).toBe("high");
      expect(todos[0].completed).toBe(false);
    });

    it("should add todo with custom ID", async () => {
      await projectMemory.addTodo({
        id: "todo-001",
        task: "Custom ID todo",
        priority: "medium",
        completed: false,
      });

      const todos = await projectMemory.getTodos();
      expect(todos[0].id).toBe("todo-001");
    });

    it("should filter todos by priority", async () => {
      await projectMemory.addTodo({
        task: "High priority task",
        priority: "high",
        completed: false,
      });

      await projectMemory.addTodo({
        task: "Low priority task",
        priority: "low",
        completed: false,
      });

      await projectMemory.addTodo({
        task: "Another high priority",
        priority: "high",
        completed: false,
      });

      const highTodos = await projectMemory.getTodos("high");
      expect(highTodos).toHaveLength(2);
    });

    it("should complete todo", async () => {
      await projectMemory.addTodo({
        id: "todo-001",
        task: "Task to complete",
        priority: "medium",
        completed: false,
      });

      await projectMemory.completeTodo("todo-001");

      const todos = await projectMemory.getTodos();
      expect(todos[0].completed).toBe(true);
      expect(todos[0].completedAt).toBeDefined();
    });

    it("should order todos by creation date (newest first)", async () => {
      await projectMemory.addTodo({
        task: "Old todo",
        priority: "low",
        completed: false,
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await projectMemory.addTodo({
        task: "New todo",
        priority: "low",
        completed: false,
      });

      const todos = await projectMemory.getTodos();
      expect(todos[0].task).toBe("New todo");
      expect(todos[1].task).toBe("Old todo");
    });
  });

  describe("Convention Management", () => {
    it("should set and get convention", async () => {
      await projectMemory.setConvention("testing", "Always use Vitest");
      const value = await projectMemory.getConvention("testing");
      expect(value).toBe("Always use Vitest");
    });

    it("should update existing convention", async () => {
      await projectMemory.setConvention("imports", "Use relative imports");
      await projectMemory.setConvention("imports", "Use absolute imports");
      const value = await projectMemory.getConvention("imports");
      expect(value).toBe("Use absolute imports");
    });

    it("should return undefined for missing convention", async () => {
      const value = await projectMemory.getConvention("nonexistent");
      expect(value).toBeUndefined();
    });

    it("should get all conventions", async () => {
      await projectMemory.setConvention("testing", "Use Vitest");
      await projectMemory.setConvention("imports", "Absolute imports");
      await projectMemory.setConvention("formatting", "Use Prettier");

      const conventions = await projectMemory.getAllConventions();
      expect(Object.keys(conventions)).toHaveLength(3);
      expect(conventions.testing).toBe("Use Vitest");
      expect(conventions.imports).toBe("Absolute imports");
      expect(conventions.formatting).toBe("Use Prettier");
    });
  });

  describe("Metadata Management", () => {
    it("should set and get metadata", async () => {
      await projectMemory.setMetadata("lastBuild", Date.now());
      const value = await projectMemory.getMetadata("lastBuild");
      expect(value).toBeDefined();
      expect(typeof value).toBe("number");
    });

    it("should store complex objects", async () => {
      const obj = { a: 1, b: [2, 3], c: { d: 4 } };
      await projectMemory.setMetadata("complex", obj);
      const value = await projectMemory.getMetadata("complex");
      expect(value).toEqual(obj);
    });

    it("should update existing metadata", async () => {
      await projectMemory.setMetadata("version", "1.0.0");
      await projectMemory.setMetadata("version", "2.0.0");
      const value = await projectMemory.getMetadata("version");
      expect(value).toBe("2.0.0");
    });

    it("should return undefined for missing metadata", async () => {
      const value = await projectMemory.getMetadata("nonexistent");
      expect(value).toBeUndefined();
    });
  });

  describe("Statistics", () => {
    it("should return project stats", async () => {
      await projectMemory.setArchitecture("VSA");
      await projectMemory.addTechStack("TypeScript");
      await projectMemory.addTechStack("Node.js");
      await projectMemory.addDecision({
        title: "Test Decision",
        description: "Test",
        rationale: "Test",
        date: Date.now(),
        tags: [],
      });
      await projectMemory.addPattern({
        name: "Test Pattern",
        description: "Test",
        examples: [],
        frequency: 0,
      });
      await projectMemory.addTodo({
        task: "Todo 1",
        priority: "high",
        completed: false,
      });
      await projectMemory.addTodo({
        id: "todo-2",
        task: "Todo 2",
        priority: "low",
        completed: false,
      });
      await projectMemory.completeTodo("todo-2");
      await projectMemory.setConvention("test", "value");
      await projectMemory.setMetadata("key", "value");

      const stats = await projectMemory.getStats();

      expect(stats.projectId).toBe(projectMemory.getProjectId());
      expect(stats.projectPath).toBe(testDir);
      expect(stats.architecture).toBe("VSA");
      expect(stats.techStackCount).toBe(2);
      expect(stats.decisionsCount).toBe(1);
      expect(stats.patternsCount).toBe(1);
      expect(stats.todosCount).toBe(2);
      expect(stats.todosCompletedCount).toBe(1);
      expect(stats.conventionsCount).toBe(1);
      expect(stats.metadataCount).toBe(1);
      expect(stats.dbPath).toBe(
        path.join(testDir, ".arela", "memory", "project.db")
      );
    });

    it("should handle empty project stats", async () => {
      const stats = await projectMemory.getStats();

      expect(stats.techStackCount).toBe(0);
      expect(stats.decisionsCount).toBe(0);
      expect(stats.patternsCount).toBe(0);
      expect(stats.todosCount).toBe(0);
      expect(stats.todosCompletedCount).toBe(0);
      expect(stats.conventionsCount).toBe(0);
      expect(stats.metadataCount).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should handle queries in less than 100ms", async () => {
      // Add substantial data
      for (let i = 0; i < 50; i++) {
        await projectMemory.addDecision({
          title: `Decision ${i}`,
          description: `Description ${i}`,
          rationale: `Rationale ${i}`,
          date: Date.now(),
          tags: ["test"],
        });
      }

      const start = Date.now();
      await projectMemory.getDecisions();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it("should handle large decision sets efficiently", async () => {
      // Add 100 decisions
      for (let i = 0; i < 100; i++) {
        await projectMemory.addDecision({
          title: `Decision ${i}`,
          description: `Test decision ${i}`,
          rationale: `Because ${i}`,
          date: Date.now() - i * 1000,
          tags: i % 2 === 0 ? ["even"] : ["odd"],
        });
      }

      const allDecisions = await projectMemory.getDecisions();
      expect(allDecisions).toHaveLength(100);

      const evenDecisions = await projectMemory.getDecisions(["even"]);
      expect(evenDecisions.length).toBe(50);

      const searchResults = await projectMemory.searchDecisions("Decision 5");
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe("Persistence", () => {
    it("should persist all data across sessions", async () => {
      // Set up comprehensive data
      await projectMemory.setArchitecture("VSA with 8 slices");
      await projectMemory.addTechStack("TypeScript");
      await projectMemory.addTechStack("Next.js");

      await projectMemory.addDecision({
        id: "dec-001",
        title: "Architecture Decision",
        description: "Use VSA",
        rationale: "Modularity",
        date: Date.now(),
        tags: ["architecture"],
      });

      await projectMemory.addPattern({
        id: "pat-001",
        name: "Repository Pattern",
        description: "Data access",
        examples: ["UserRepo"],
        frequency: 5,
      });

      await projectMemory.addTodo({
        id: "todo-001",
        task: "Add tests",
        priority: "high",
        completed: false,
      });

      await projectMemory.setConvention("testing", "Use Vitest");
      await projectMemory.setMetadata("version", "1.0.0");

      // Close and reopen
      projectMemory.close();
      const newProject = new ProjectMemory(testDir);
      await newProject.init();

      // Verify all data
      expect(await newProject.getArchitecture()).toBe("VSA with 8 slices");

      const stack = await newProject.getTechStack();
      expect(stack).toHaveLength(2);
      expect(stack).toContain("TypeScript");
      expect(stack).toContain("Next.js");

      const decisions = await newProject.getDecisions();
      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe("dec-001");

      const patterns = await newProject.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe("pat-001");
      expect(patterns[0].frequency).toBe(5);

      const todos = await newProject.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].id).toBe("todo-001");

      const convention = await newProject.getConvention("testing");
      expect(convention).toBe("Use Vitest");

      const metadata = await newProject.getMetadata("version");
      expect(metadata).toBe("1.0.0");

      newProject.close();
    });
  });

  describe("Error Handling", () => {
    it("should throw error when accessing uninitialized project", async () => {
      const uninitProject = new ProjectMemory(testDir);
      expect(() => uninitProject.getProjectId()).toThrow(
        "Project not initialized"
      );
    });

    it("should throw error when calling methods before init", async () => {
      const uninitProject = new ProjectMemory(testDir);

      await expect(
        uninitProject.setArchitecture("test")
      ).rejects.toThrow("Project not initialized");
      await expect(uninitProject.getTechStack()).rejects.toThrow(
        "Project not initialized"
      );
      await expect(uninitProject.getDecisions()).rejects.toThrow(
        "Project not initialized"
      );
    });

    it("should handle multiple init calls gracefully", async () => {
      await projectMemory.init();
      await projectMemory.init();
      // Should not throw
      expect(projectMemory.getProjectId()).toBeDefined();
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle complete project workflow", async () => {
      // Initial project setup
      await projectMemory.setArchitecture("VSA Modular Monolith");
      await projectMemory.addTechStack("TypeScript");
      await projectMemory.addTechStack("Next.js");
      await projectMemory.addTechStack("Prisma");
      await projectMemory.addTechStack("PostgreSQL");

      // Record architecture decision
      await projectMemory.addDecision({
        title: "Chose VSA over Microservices",
        description: "Team size is 3 people",
        rationale: "VSA provides modularity without operational complexity",
        date: Date.now(),
        tags: ["architecture", "decision"],
      });

      // Store conventions
      await projectMemory.setConvention("testing", "Always use Vitest");
      await projectMemory.setConvention("imports", "Use absolute imports");

      // Add project todos
      await projectMemory.addTodo({
        id: "todo-1",
        task: "Add integration tests",
        priority: "high",
        completed: false,
      });
      await projectMemory.addTodo({
        id: "todo-2",
        task: "Document API endpoints",
        priority: "medium",
        completed: false,
      });

      // Track patterns
      await projectMemory.addPattern({
        id: "pat-1",
        name: "Repository Pattern",
        description: "Data access abstraction",
        examples: ["UserRepository", "PostRepository"],
        frequency: 0,
      });

      // Use pattern multiple times
      await projectMemory.incrementPatternUsage("pat-1");
      await projectMemory.incrementPatternUsage("pat-1");

      // Complete a todo
      await projectMemory.completeTodo("todo-1");

      // Verify state
      const stats = await projectMemory.getStats();
      expect(stats.architecture).toBe("VSA Modular Monolith");
      expect(stats.techStackCount).toBe(4);
      expect(stats.decisionsCount).toBe(1);
      expect(stats.patternsCount).toBe(1);
      expect(stats.todosCount).toBe(2);
      expect(stats.todosCompletedCount).toBe(1);
      expect(stats.conventionsCount).toBe(2);

      const patterns = await projectMemory.getPatterns();
      expect(patterns[0].frequency).toBe(2);
    });
  });
});
