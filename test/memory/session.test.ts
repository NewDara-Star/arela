import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionMemory } from "../../src/memory/session.js";
import path from "node:path";
import fs from "fs-extra";
import os from "node:os";

describe("SessionMemory", () => {
  let sessionMemory: SessionMemory;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = path.join(os.tmpdir(), `arela-session-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    sessionMemory = new SessionMemory(testDir);
    await sessionMemory.init();
  });

  afterEach(async () => {
    // Clean up
    sessionMemory.close();
    await fs.remove(testDir);
  });

  describe("Initialization", () => {
    it("should initialize new session with unique ID", async () => {
      const sessionId = sessionMemory.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("should create database file", async () => {
      const dbPath = path.join(testDir, ".arela", "memory", "session.db");
      const exists = await fs.pathExists(dbPath);
      expect(exists).toBe(true);
    });

    it("should initialize with empty state", async () => {
      const task = await sessionMemory.getCurrentTask();
      const files = await sessionMemory.getOpenFiles();
      const messages = await sessionMemory.getAllMessages();
      const context = await sessionMemory.getAllContext();

      expect(task).toBeUndefined();
      expect(files).toEqual([]);
      expect(messages).toEqual([]);
      expect(context).toEqual({});
    });
  });

  describe("Task Management", () => {
    it("should set and get current task", async () => {
      await sessionMemory.setCurrentTask("Building feature X");
      const task = await sessionMemory.getCurrentTask();
      expect(task).toBe("Building feature X");
    });

    it("should update current task", async () => {
      await sessionMemory.setCurrentTask("Task 1");
      await sessionMemory.setCurrentTask("Task 2");
      const task = await sessionMemory.getCurrentTask();
      expect(task).toBe("Task 2");
    });
  });

  describe("File Tracking", () => {
    it("should track open file", async () => {
      await sessionMemory.trackOpenFile("src/test.ts");
      const files = await sessionMemory.getOpenFiles();
      expect(files).toContain("src/test.ts");
    });

    it("should track multiple files", async () => {
      await sessionMemory.trackOpenFile("src/test1.ts");
      await sessionMemory.trackOpenFile("src/test2.ts");
      await sessionMemory.trackOpenFile("src/test3.ts");

      const files = await sessionMemory.getOpenFiles();
      expect(files).toHaveLength(3);
      expect(files).toContain("src/test1.ts");
      expect(files).toContain("src/test2.ts");
      expect(files).toContain("src/test3.ts");
    });

    it("should not duplicate files", async () => {
      await sessionMemory.trackOpenFile("src/test.ts");
      await sessionMemory.trackOpenFile("src/test.ts");
      const files = await sessionMemory.getOpenFiles();
      expect(files).toHaveLength(1);
    });

    it("should untrack file", async () => {
      await sessionMemory.trackOpenFile("src/test1.ts");
      await sessionMemory.trackOpenFile("src/test2.ts");
      await sessionMemory.untrackFile("src/test1.ts");

      const files = await sessionMemory.getOpenFiles();
      expect(files).toHaveLength(1);
      expect(files).not.toContain("src/test1.ts");
      expect(files).toContain("src/test2.ts");
    });
  });

  describe("Message History", () => {
    it("should add message to history", async () => {
      await sessionMemory.addMessage({
        role: "user",
        content: "Hello",
      });

      const messages = await sessionMemory.getAllMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
      expect(messages[0].timestamp).toBeDefined();
    });

    it("should add multiple messages", async () => {
      await sessionMemory.addMessage({ role: "user", content: "Hello" });
      await sessionMemory.addMessage({ role: "assistant", content: "Hi there" });
      await sessionMemory.addMessage({ role: "user", content: "How are you?" });

      const messages = await sessionMemory.getAllMessages();
      expect(messages).toHaveLength(3);
    });

    it("should get recent messages", async () => {
      await sessionMemory.addMessage({ role: "user", content: "Message 1" });
      await sessionMemory.addMessage({ role: "user", content: "Message 2" });
      await sessionMemory.addMessage({ role: "user", content: "Message 3" });
      await sessionMemory.addMessage({ role: "user", content: "Message 4" });

      const recent = await sessionMemory.getRecentMessages(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe("Message 3");
      expect(recent[1].content).toBe("Message 4");
    });

    it("should preserve message timestamp", async () => {
      const timestamp = Date.now() - 1000;
      await sessionMemory.addMessage({
        role: "user",
        content: "Test",
        timestamp,
      });

      const messages = await sessionMemory.getAllMessages();
      expect(messages[0].timestamp).toBe(timestamp);
    });
  });

  describe("Ticket Tracking", () => {
    it("should set and get active ticket", async () => {
      await sessionMemory.setActiveTicket("HEXI-001");
      const ticket = await sessionMemory.getActiveTicket();
      expect(ticket).toBe("HEXI-001");
    });

    it("should update active ticket", async () => {
      await sessionMemory.setActiveTicket("HEXI-001");
      await sessionMemory.setActiveTicket("HEXI-002");
      const ticket = await sessionMemory.getActiveTicket();
      expect(ticket).toBe("HEXI-002");
    });
  });

  describe("Context Management", () => {
    it("should set and get context value", async () => {
      await sessionMemory.setContext("foo", "bar");
      const value = await sessionMemory.getContext("foo");
      expect(value).toBe("bar");
    });

    it("should store complex objects", async () => {
      const obj = { a: 1, b: [2, 3], c: { d: 4 } };
      await sessionMemory.setContext("complex", obj);
      const value = await sessionMemory.getContext("complex");
      expect(value).toEqual(obj);
    });

    it("should return undefined for missing keys", async () => {
      const value = await sessionMemory.getContext("nonexistent");
      expect(value).toBeUndefined();
    });

    it("should get all context", async () => {
      await sessionMemory.setContext("key1", "value1");
      await sessionMemory.setContext("key2", "value2");
      const context = await sessionMemory.getAllContext();

      expect(context).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    it("should delete context key", async () => {
      await sessionMemory.setContext("key1", "value1");
      await sessionMemory.setContext("key2", "value2");
      await sessionMemory.deleteContext("key1");

      const value = await sessionMemory.getContext("key1");
      const context = await sessionMemory.getAllContext();

      expect(value).toBeUndefined();
      expect(context).toEqual({ key2: "value2" });
    });
  });

  describe("Snapshot and Restore", () => {
    it("should snapshot current state", async () => {
      await sessionMemory.setCurrentTask("Test task");
      await sessionMemory.trackOpenFile("src/test.ts");
      await sessionMemory.addMessage({ role: "user", content: "Hello" });
      await sessionMemory.setContext("key", "value");

      // Should not throw
      await sessionMemory.snapshot();
    });

    it("should restore from snapshot", async () => {
      // Set up state
      await sessionMemory.setCurrentTask("Test task");
      await sessionMemory.trackOpenFile("src/test.ts");
      await sessionMemory.addMessage({ role: "user", content: "Hello" });
      await sessionMemory.setActiveTicket("HEXI-001");
      await sessionMemory.setContext("key", "value");
      await sessionMemory.snapshot();

      const sessionId = sessionMemory.getSessionId();

      // Close and create new session
      sessionMemory.close();
      const newSession = new SessionMemory(testDir);
      await newSession.init();

      // Verify state was restored
      expect(newSession.getSessionId()).toBe(sessionId);
      expect(await newSession.getCurrentTask()).toBe("Test task");
      expect(await newSession.getOpenFiles()).toEqual(["src/test.ts"]);
      expect(await newSession.getActiveTicket()).toBe("HEXI-001");
      expect(await newSession.getContext("key")).toBe("value");

      const messages = await newSession.getAllMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");

      newSession.close();
    });

    it("should handle restore with no previous session", async () => {
      // Should not throw
      await sessionMemory.restore();
    });

    it("should preserve all data types in snapshot", async () => {
      await sessionMemory.setContext("string", "value");
      await sessionMemory.setContext("number", 42);
      await sessionMemory.setContext("boolean", true);
      await sessionMemory.setContext("array", [1, 2, 3]);
      await sessionMemory.setContext("object", { a: 1, b: 2 });
      await sessionMemory.snapshot();

      sessionMemory.close();
      const newSession = new SessionMemory(testDir);
      await newSession.init();

      expect(await newSession.getContext("string")).toBe("value");
      expect(await newSession.getContext("number")).toBe(42);
      expect(await newSession.getContext("boolean")).toBe(true);
      expect(await newSession.getContext("array")).toEqual([1, 2, 3]);
      expect(await newSession.getContext("object")).toEqual({ a: 1, b: 2 });

      newSession.close();
    });
  });

  describe("Clear Session", () => {
    it("should clear all session data", async () => {
      await sessionMemory.setCurrentTask("Test task");
      await sessionMemory.trackOpenFile("src/test.ts");
      await sessionMemory.addMessage({ role: "user", content: "Hello" });
      await sessionMemory.setActiveTicket("HEXI-001");
      await sessionMemory.setContext("key", "value");

      const oldSessionId = sessionMemory.getSessionId();
      await sessionMemory.clear();

      // Should have new session ID
      expect(sessionMemory.getSessionId()).not.toBe(oldSessionId);

      // All data should be cleared
      expect(await sessionMemory.getCurrentTask()).toBeUndefined();
      expect(await sessionMemory.getOpenFiles()).toEqual([]);
      expect(await sessionMemory.getAllMessages()).toEqual([]);
      expect(await sessionMemory.getActiveTicket()).toBeUndefined();
      expect(await sessionMemory.getAllContext()).toEqual({});
    });
  });

  describe("Statistics", () => {
    it("should return session stats", async () => {
      await sessionMemory.setCurrentTask("Test task");
      await sessionMemory.trackOpenFile("src/test1.ts");
      await sessionMemory.trackOpenFile("src/test2.ts");
      await sessionMemory.addMessage({ role: "user", content: "Hello" });
      await sessionMemory.addMessage({ role: "assistant", content: "Hi" });
      await sessionMemory.setContext("key1", "value1");
      await sessionMemory.setContext("key2", "value2");

      const stats = await sessionMemory.getStats();

      expect(stats.sessionId).toBe(sessionMemory.getSessionId());
      expect(stats.startTime).toBeDefined();
      expect(stats.messagesCount).toBe(2);
      expect(stats.filesOpenCount).toBe(2);
      expect(stats.contextKeysCount).toBe(2);
      expect(stats.dbPath).toBe(path.join(testDir, ".arela", "memory", "session.db"));
    });
  });

  describe("Performance", () => {
    it("should load session in less than 50ms", async () => {
      // Set up some data
      await sessionMemory.setCurrentTask("Test task");
      for (let i = 0; i < 10; i++) {
        await sessionMemory.trackOpenFile(`src/test${i}.ts`);
      }
      for (let i = 0; i < 50; i++) {
        await sessionMemory.addMessage({ role: "user", content: `Message ${i}` });
      }
      await sessionMemory.snapshot();

      sessionMemory.close();

      // Measure restore time
      const newSession = new SessionMemory(testDir);
      const start = Date.now();
      await newSession.init();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);

      newSession.close();
    });

    it("should handle large conversation history", async () => {
      // Add 1000 messages
      for (let i = 0; i < 1000; i++) {
        await sessionMemory.addMessage({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
        });
      }

      const messages = await sessionMemory.getAllMessages();
      expect(messages).toHaveLength(1000);

      const recent = await sessionMemory.getRecentMessages(10);
      expect(recent).toHaveLength(10);
      expect(recent[9].content).toBe("Message 999");
    });
  });

  describe("Concurrency", () => {
    it("should handle concurrent operations", async () => {
      const operations = [
        sessionMemory.setCurrentTask("Task"),
        sessionMemory.trackOpenFile("file1.ts"),
        sessionMemory.trackOpenFile("file2.ts"),
        sessionMemory.addMessage({ role: "user", content: "Hi" }),
        sessionMemory.setContext("key", "value"),
      ];

      // Should not throw
      await Promise.all(operations);

      expect(await sessionMemory.getCurrentTask()).toBe("Task");
      expect((await sessionMemory.getOpenFiles()).length).toBeGreaterThanOrEqual(2);
      expect((await sessionMemory.getAllMessages()).length).toBeGreaterThanOrEqual(1);
      expect(await sessionMemory.getContext("key")).toBe("value");
    });
  });
});
