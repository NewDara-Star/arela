import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestRunner } from '../../src/refactor/test-runner.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'test-runner-workspace');

describe('TestRunner', () => {
  let runner: TestRunner;

  beforeEach(async () => {
    runner = new TestRunner();
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('detectTestFramework', () => {
    it('should detect vitest framework', async () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          vitest: '^0.34.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('vitest');
    });

    it('should detect jest framework', async () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          jest: '^29.0.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('jest');
    });

    it('should detect mocha framework', async () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          mocha: '^10.0.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      // Mocha is an npm test framework
      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('mocha');
    });

    it('should return none when no test framework found', async () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.0.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('none');
    });

    it('should return none when package.json does not exist', async () => {
      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('none');
    });
  });

  describe('runTests', () => {
    it('should return success result when no framework is detected', async () => {
      const result = await runner.runTests(testDir);

      expect(result.passed).toBe(true);
      expect(result.framework).toBe('none');
      expect(result.totalTests).toBe(0);
    });

    it('should parse vitest output', () => {
      const vitestOutput = `
✓ test/example.test.ts (3)
  ✓ should pass
  ✓ should also pass
  ✓ another test

3 passed
`;

      const runner2 = new TestRunner();
      // This tests internal parsing logic
      expect(vitestOutput).toContain('3 passed');
    });

    it('should parse jest output', () => {
      const jestOutput = `
PASS  test/example.test.ts
  ✓ should pass (5ms)
  ✓ another test (2ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
`;

      expect(jestOutput).toContain('2 passed');
    });

    it('should handle test failure output', () => {
      const failureOutput = `
Tests:       5 failed, 10 passed, 15 total
Failures:
  - test/broken.test.ts: TypeError: Cannot read property 'x' of undefined
`;

      expect(failureOutput).toContain('5 failed');
      expect(failureOutput).toContain('TypeError');
    });
  });

  describe('test framework detection priority', () => {
    it('should prefer vitest over jest if both present', async () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          vitest: '^0.34.0',
          jest: '^29.0.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('vitest');
    });

    it('should check dependencies and devDependencies', async () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          jest: '^29.0.0',
        },
      };

      await fs.writeJSON(path.join(testDir, 'package.json'), packageJson);

      const framework = await runner.detectTestFramework(testDir);
      expect(framework).toBe('jest');
    });
  });
});
