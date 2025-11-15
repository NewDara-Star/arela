import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { UserMemory } from "../../src/memory/user.js";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";

describe("UserMemory", () => {
  let userMemory: UserMemory;
  let testDbPath: string;
  let originalHomedir: string;
  let tempHomeDir: string;

  beforeEach(async () => {
    // Create a temporary home directory for testing
    tempHomeDir = path.join(os.tmpdir(), `arela-user-test-${Date.now()}`);
    await fs.ensureDir(tempHomeDir);

    // Mock os.homedir() to use our temp directory
    originalHomedir = os.homedir();
    os.homedir = () => tempHomeDir;

    testDbPath = path.join(tempHomeDir, ".arela", "user.db");

    userMemory = new UserMemory();
    await userMemory.init();
  });

  afterEach(async () => {
    // Clean up
    userMemory.close();
    await fs.remove(tempHomeDir);

    // Restore original homedir
    os.homedir = () => originalHomedir;
  });

  describe("Initialization", () => {
    it("should initialize user memory with unique ID", async () => {
      const userId = userMemory.getUserId();
      expect(userId).toBeDefined();
      expect(userId.length).toBeGreaterThan(0);
    });

    it("should create global database file", async () => {
      const exists = await fs.pathExists(testDbPath);
      expect(exists).toBe(true);
    });

    it("should reuse same user ID across sessions", async () => {
      const userId1 = userMemory.getUserId();
      userMemory.close();

      // Create new instance
      const userMemory2 = new UserMemory();
      await userMemory2.init();
      const userId2 = userMemory2.getUserId();

      expect(userId2).toBe(userId1);

      userMemory2.close();
    });

    it("should throw error if accessing methods before init", () => {
      const uninitializedUser = new UserMemory();
      expect(() => uninitializedUser.getUserId()).toThrow("User not initialized");
    });
  });

  describe("Preferences", () => {
    it("should set and get preference", async () => {
      await userMemory.setPreference("language", "TypeScript");
      const language = await userMemory.getPreference("language");
      expect(language).toBe("TypeScript");
    });

    it("should update existing preference", async () => {
      await userMemory.setPreference("framework", "React");
      await userMemory.setPreference("framework", "Next.js");
      const framework = await userMemory.getPreference("framework");
      expect(framework).toBe("Next.js");
    });

    it("should return undefined for non-existent preference", async () => {
      const result = await userMemory.getPreference("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should get all preferences", async () => {
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setPreference("framework", "Next.js");
      await userMemory.setPreference("testing", "Vitest");

      const prefs = await userMemory.getAllPreferences();
      expect(prefs.language).toBe("TypeScript");
      expect(prefs.framework).toBe("Next.js");
      expect(prefs.testing).toBe("Vitest");
    });

    it("should handle multiple preference types", async () => {
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setPreference("framework", "Next.js");
      await userMemory.setPreference("style", "Functional programming");
      await userMemory.setPreference("editor", "VS Code");
      await userMemory.setPreference("packageManager", "npm");

      const prefs = await userMemory.getAllPreferences();
      expect(Object.keys(prefs)).toHaveLength(5);
    });
  });

  describe("Expertise", () => {
    it("should set and get expertise level", async () => {
      await userMemory.setExpertise("frontend", "expert");
      const level = await userMemory.getExpertise("frontend");
      expect(level).toBe("expert");
    });

    it("should update existing expertise level", async () => {
      await userMemory.setExpertise("backend", "beginner");
      await userMemory.setExpertise("backend", "intermediate");
      const level = await userMemory.getExpertise("backend");
      expect(level).toBe("intermediate");
    });

    it("should return undefined for non-existent domain", async () => {
      const result = await userMemory.getExpertise("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should get all expertise levels", async () => {
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.setExpertise("backend", "intermediate");
      await userMemory.setExpertise("devops", "beginner");

      const expertise = await userMemory.getAllExpertise();
      expect(expertise.frontend).toBe("expert");
      expect(expertise.backend).toBe("intermediate");
      expect(expertise.devops).toBe("beginner");
    });

    it("should track multiple domains", async () => {
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.setExpertise("backend", "intermediate");
      await userMemory.setExpertise("devops", "beginner");
      await userMemory.setExpertise("mobile", "intermediate");

      const expertise = await userMemory.getAllExpertise();
      expect(Object.keys(expertise)).toHaveLength(4);
    });
  });

  describe("Patterns", () => {
    it("should add pattern", async () => {
      await userMemory.addPattern({
        name: "Always write tests first",
        description: "TDD approach",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });

      const patterns = await userMemory.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("Always write tests first");
    });

    it("should add multiple patterns", async () => {
      await userMemory.addPattern({
        name: "Pattern 1",
        description: "Description 1",
        frequency: 5,
        examples: ["example1"],
        learnedFrom: ["project-1"],
      });

      await userMemory.addPattern({
        name: "Pattern 2",
        description: "Description 2",
        frequency: 10,
        examples: ["example2"],
        learnedFrom: ["project-2"],
      });

      const patterns = await userMemory.getPatterns();
      expect(patterns).toHaveLength(2);
    });

    it("should sort patterns by frequency (highest first)", async () => {
      await userMemory.addPattern({
        name: "Low frequency",
        description: "Low",
        frequency: 3,
        examples: [],
        learnedFrom: ["project-1"],
      });

      await userMemory.addPattern({
        name: "High frequency",
        description: "High",
        frequency: 15,
        examples: [],
        learnedFrom: ["project-2"],
      });

      await userMemory.addPattern({
        name: "Medium frequency",
        description: "Medium",
        frequency: 8,
        examples: [],
        learnedFrom: ["project-3"],
      });

      const patterns = await userMemory.getPatterns();
      expect(patterns[0].name).toBe("High frequency");
      expect(patterns[1].name).toBe("Medium frequency");
      expect(patterns[2].name).toBe("Low frequency");
    });

    it("should increment pattern usage", async () => {
      await userMemory.addPattern({
        id: "pat-001",
        name: "Test pattern",
        description: "Test",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });

      await userMemory.incrementPatternUsage("pat-001", "project-2");

      const patterns = await userMemory.getPatterns();
      expect(patterns[0].frequency).toBe(1);
      expect(patterns[0].learnedFrom).toContain("project-2");
    });

    it("should add project to learnedFrom when incrementing", async () => {
      await userMemory.addPattern({
        id: "pat-002",
        name: "Test pattern",
        description: "Test",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });

      await userMemory.incrementPatternUsage("pat-002", "project-2");
      await userMemory.incrementPatternUsage("pat-002", "project-3");

      const patterns = await userMemory.getPatterns();
      expect(patterns[0].learnedFrom).toHaveLength(3);
      expect(patterns[0].learnedFrom).toContain("project-1");
      expect(patterns[0].learnedFrom).toContain("project-2");
      expect(patterns[0].learnedFrom).toContain("project-3");
    });

    it("should not duplicate projects in learnedFrom", async () => {
      await userMemory.addPattern({
        id: "pat-003",
        name: "Test pattern",
        description: "Test",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });

      await userMemory.incrementPatternUsage("pat-003", "project-1");
      await userMemory.incrementPatternUsage("pat-003", "project-1");

      const patterns = await userMemory.getPatterns();
      expect(patterns[0].learnedFrom).toHaveLength(1);
      expect(patterns[0].frequency).toBe(2);
    });

    it("should get top patterns by frequency", async () => {
      await userMemory.addPattern({
        name: "Pattern 1",
        description: "Desc 1",
        frequency: 5,
        examples: [],
        learnedFrom: ["project-1"],
      });

      await userMemory.addPattern({
        name: "Pattern 2",
        description: "Desc 2",
        frequency: 15,
        examples: [],
        learnedFrom: ["project-2"],
      });

      await userMemory.addPattern({
        name: "Pattern 3",
        description: "Desc 3",
        frequency: 10,
        examples: [],
        learnedFrom: ["project-3"],
      });

      const topPatterns = await userMemory.getTopPatterns(2);
      expect(topPatterns).toHaveLength(2);
      expect(topPatterns[0].frequency).toBe(15);
      expect(topPatterns[1].frequency).toBe(10);
    });

    it("should preserve pattern examples", async () => {
      await userMemory.addPattern({
        name: "Pattern with examples",
        description: "Test",
        frequency: 0,
        examples: ["example1.ts", "example2.ts", "example3.ts"],
        learnedFrom: ["project-1"],
      });

      const patterns = await userMemory.getPatterns();
      expect(patterns[0].examples).toHaveLength(3);
      expect(patterns[0].examples).toContain("example1.ts");
    });
  });

  describe("Global Conventions", () => {
    it("should set and get convention", async () => {
      await userMemory.setConvention("testing", "Always use Vitest");
      const convention = await userMemory.getConvention("testing");
      expect(convention).toBe("Always use Vitest");
    });

    it("should update existing convention", async () => {
      await userMemory.setConvention("imports", "Use relative imports");
      await userMemory.setConvention("imports", "Use absolute imports");
      const convention = await userMemory.getConvention("imports");
      expect(convention).toBe("Use absolute imports");
    });

    it("should return undefined for non-existent convention", async () => {
      const result = await userMemory.getConvention("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should get all conventions", async () => {
      await userMemory.setConvention("testing", "Always use Vitest");
      await userMemory.setConvention("imports", "Use absolute imports");
      await userMemory.setConvention("formatting", "Use Prettier");

      const conventions = await userMemory.getAllConventions();
      expect(conventions.testing).toBe("Always use Vitest");
      expect(conventions.imports).toBe("Use absolute imports");
      expect(conventions.formatting).toBe("Use Prettier");
    });

    it("should handle multiple conventions", async () => {
      await userMemory.setConvention("convention1", "value1");
      await userMemory.setConvention("convention2", "value2");
      await userMemory.setConvention("convention3", "value3");

      const conventions = await userMemory.getAllConventions();
      expect(Object.keys(conventions)).toHaveLength(3);
    });
  });

  describe("Project History", () => {
    it("should track project", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      const projects = await userMemory.getRecentProjects(10);

      expect(projects).toHaveLength(1);
      expect(projects[0].projectId).toBe("proj-1");
      expect(projects[0].projectPath).toBe("/path/to/proj1");
    });

    it("should track multiple projects", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      await userMemory.trackProject("proj-2", "/path/to/proj2");
      await userMemory.trackProject("proj-3", "/path/to/proj3");

      const projects = await userMemory.getRecentProjects(10);
      expect(projects).toHaveLength(3);
    });

    it("should update last accessed time on retrack", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const firstAccess = (await userMemory.getRecentProjects(1))[0].lastAccessed;

      await userMemory.trackProject("proj-1", "/path/to/proj1");

      const secondAccess = (await userMemory.getRecentProjects(1))[0].lastAccessed;

      expect(secondAccess).toBeGreaterThan(firstAccess);
    });

    it("should limit recent projects", async () => {
      for (let i = 0; i < 10; i++) {
        await userMemory.trackProject(`proj-${i}`, `/path/to/proj${i}`);
      }

      const projects = await userMemory.getRecentProjects(5);
      expect(projects).toHaveLength(5);
    });

    it("should order projects by last accessed (most recent first)", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      await new Promise((resolve) => setTimeout(resolve, 10));

      await userMemory.trackProject("proj-2", "/path/to/proj2");
      await new Promise((resolve) => setTimeout(resolve, 10));

      await userMemory.trackProject("proj-3", "/path/to/proj3");

      const projects = await userMemory.getRecentProjects(10);
      expect(projects[0].projectId).toBe("proj-3");
      expect(projects[1].projectId).toBe("proj-2");
      expect(projects[2].projectId).toBe("proj-1");
    });

    it("should increment session count", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");

      await userMemory.incrementSessionCount("proj-1");
      await userMemory.incrementSessionCount("proj-1");

      const projects = await userMemory.getRecentProjects(1);
      expect(projects[0].totalSessions).toBe(3); // 1 from trackProject + 2 from increment
    });

    it("should initialize totalSessions to 1 when tracking new project", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      const projects = await userMemory.getRecentProjects(1);
      expect(projects[0].totalSessions).toBe(1);
    });

    it("should update last accessed when incrementing session count", async () => {
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const beforeIncrement = (await userMemory.getRecentProjects(1))[0].lastAccessed;

      await userMemory.incrementSessionCount("proj-1");

      const afterIncrement = (await userMemory.getRecentProjects(1))[0].lastAccessed;

      expect(afterIncrement).toBeGreaterThan(beforeIncrement);
    });
  });

  describe("Metadata", () => {
    it("should set and get metadata", async () => {
      await userMemory.setMetadata("key1", "value1");
      const value = await userMemory.getMetadata("key1");
      expect(value).toBe("value1");
    });

    it("should handle complex object metadata", async () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          string: "test",
          boolean: true,
        },
      };

      await userMemory.setMetadata("complex", complexObject);
      const retrieved = await userMemory.getMetadata("complex");

      expect(retrieved).toEqual(complexObject);
      expect(retrieved.nested.array).toEqual([1, 2, 3]);
    });

    it("should update existing metadata", async () => {
      await userMemory.setMetadata("key1", "value1");
      await userMemory.setMetadata("key1", "value2");
      const value = await userMemory.getMetadata("key1");
      expect(value).toBe("value2");
    });

    it("should return undefined for non-existent metadata", async () => {
      const result = await userMemory.getMetadata("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should handle array metadata", async () => {
      await userMemory.setMetadata("array", [1, 2, 3, 4, 5]);
      const value = await userMemory.getMetadata("array");
      expect(value).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("Statistics", () => {
    it("should return user statistics", async () => {
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.addPattern({
        name: "Pattern 1",
        description: "Test",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });
      await userMemory.setConvention("testing", "Use Vitest");
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      await userMemory.setMetadata("key1", "value1");

      const stats = await userMemory.getStats();

      expect(stats.userId).toBeDefined();
      expect(stats.preferencesCount).toBe(1);
      expect(stats.expertiseCount).toBe(1);
      expect(stats.patternsCount).toBe(1);
      expect(stats.globalConventionsCount).toBe(1);
      expect(stats.projectHistoryCount).toBe(1);
      expect(stats.metadataCount).toBe(1);
      expect(stats.dbPath).toBe(testDbPath);
    });

    it("should return zero counts for empty user", async () => {
      const stats = await userMemory.getStats();

      expect(stats.preferencesCount).toBe(0);
      expect(stats.expertiseCount).toBe(0);
      expect(stats.patternsCount).toBe(0);
      expect(stats.globalConventionsCount).toBe(0);
      expect(stats.projectHistoryCount).toBe(0);
      expect(stats.metadataCount).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should handle queries in less than 100ms", async () => {
      // Add some data
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.addPattern({
        name: "Pattern 1",
        description: "Test",
        frequency: 5,
        examples: [],
        learnedFrom: ["project-1"],
      });

      const start = Date.now();
      await userMemory.getAllPreferences();
      await userMemory.getAllExpertise();
      await userMemory.getPatterns();
      await userMemory.getAllConventions();
      await userMemory.getRecentProjects(10);
      await userMemory.getStats();
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe("Persistence", () => {
    it("should persist data across sessions", async () => {
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.setConvention("testing", "Use Vitest");

      userMemory.close();

      // Create new instance
      const userMemory2 = new UserMemory();
      await userMemory2.init();

      const language = await userMemory2.getPreference("language");
      const expertise = await userMemory2.getExpertise("frontend");
      const convention = await userMemory2.getConvention("testing");

      expect(language).toBe("TypeScript");
      expect(expertise).toBe("expert");
      expect(convention).toBe("Use Vitest");

      userMemory2.close();
    });

    it("should persist patterns across sessions", async () => {
      await userMemory.addPattern({
        id: "pat-persist",
        name: "Persistent pattern",
        description: "Test persistence",
        frequency: 10,
        examples: ["example1"],
        learnedFrom: ["project-1"],
      });

      userMemory.close();

      const userMemory2 = new UserMemory();
      await userMemory2.init();

      const patterns = await userMemory2.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("Persistent pattern");
      expect(patterns[0].frequency).toBe(10);

      userMemory2.close();
    });

    it("should persist project history across sessions", async () => {
      await userMemory.trackProject("proj-persist", "/path/to/persist");
      await userMemory.incrementSessionCount("proj-persist");

      userMemory.close();

      const userMemory2 = new UserMemory();
      await userMemory2.init();

      const projects = await userMemory2.getRecentProjects(10);
      expect(projects).toHaveLength(1);
      expect(projects[0].projectId).toBe("proj-persist");
      expect(projects[0].totalSessions).toBe(2);

      userMemory2.close();
    });
  });

  describe("Complex Workflows", () => {
    it("should handle complete user profile workflow", async () => {
      // Set up preferences
      await userMemory.setPreference("language", "TypeScript");
      await userMemory.setPreference("framework", "Next.js");
      await userMemory.setPreference("testing", "Vitest");

      // Set expertise
      await userMemory.setExpertise("frontend", "expert");
      await userMemory.setExpertise("backend", "intermediate");

      // Add patterns
      await userMemory.addPattern({
        id: "pat-1",
        name: "Prefers small PRs",
        description: "User consistently creates small PRs",
        frequency: 0,
        examples: [],
        learnedFrom: ["project-1"],
      });

      // Set conventions
      await userMemory.setConvention("imports", "Use absolute imports");
      await userMemory.setConvention("testing", "Write tests first");

      // Track projects
      await userMemory.trackProject("proj-1", "/path/to/proj1");
      await userMemory.trackProject("proj-2", "/path/to/proj2");

      // Increment pattern usage from another project
      await userMemory.incrementPatternUsage("pat-1", "project-2");

      // Verify all data
      const prefs = await userMemory.getAllPreferences();
      const expertise = await userMemory.getAllExpertise();
      const patterns = await userMemory.getPatterns();
      const conventions = await userMemory.getAllConventions();
      const projects = await userMemory.getRecentProjects(10);

      expect(Object.keys(prefs)).toHaveLength(3);
      expect(Object.keys(expertise)).toHaveLength(2);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe(1);
      expect(patterns[0].learnedFrom).toHaveLength(2);
      expect(Object.keys(conventions)).toHaveLength(2);
      expect(projects).toHaveLength(2);
    });
  });
});
