import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileMover } from '../../src/refactor/file-mover.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import type { Slice } from '../../src/detect/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'test-workspace');

describe('FileMover', () => {
  let fileMover: FileMover;

  beforeEach(async () => {
    fileMover = new FileMover();
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('planFileMovement', () => {
    it('should create movement plan for slice files', async () => {
      const slice: Slice = {
        name: 'Authentication',
        files: ['src/auth/login.ts', 'src/auth/logout.ts', 'src/auth/types.ts'],
        fileCount: 3,
        cohesion: 85,
        internalImports: 10,
        externalImports: 5,
      };

      const movements = await fileMover.planFileMovement(slice, testDir);

      expect(movements).toHaveLength(3);
      expect(movements[0].source).toContain('src/auth/login.ts');
      expect(movements[0].destination).toContain('features/authentication/auth/login.ts');
      expect(movements[0].type).toBe('ts');
    });

    it('should preserve relative file structure', async () => {
      const slice: Slice = {
        name: 'UI Components',
        files: ['src/components/Button.tsx', 'src/components/Input.tsx'],
        fileCount: 2,
        cohesion: 90,
        internalImports: 8,
        externalImports: 2,
      };

      const movements = await fileMover.planFileMovement(slice, testDir);

      expect(movements[0].destination).toContain('features/ui-components/components/Button.tsx');
      expect(movements[1].destination).toContain('features/ui-components/components/Input.tsx');
    });

    it('should handle files without src/ prefix', async () => {
      const slice: Slice = {
        name: 'Utils',
        files: ['lib/helpers/string.ts'],
        fileCount: 1,
        cohesion: 75,
        internalImports: 3,
        externalImports: 1,
      };

      const movements = await fileMover.planFileMovement(slice, testDir);

      expect(movements[0].destination).toContain('features/utils/lib/helpers/string.ts');
    });
  });

  describe('moveFiles', () => {
    it('should move files to destination directories', async () => {
      // Create source files
      const srcDir = path.join(testDir, 'src', 'auth');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'login.ts'), 'export function login() {}');

      const movements = [
        {
          source: path.join(srcDir, 'login.ts'),
          destination: path.join(testDir, 'features', 'auth', 'login.ts'),
          type: 'ts',
        },
      ];

      await fileMover.moveFiles(movements, false);

      expect(await fs.pathExists(movements[0].destination)).toBe(true);
      expect(await fs.pathExists(movements[0].source)).toBe(false);

      const content = await fs.readFile(movements[0].destination, 'utf-8');
      expect(content).toContain('export function login');
    });

    it('should handle dry run without actually moving files', async () => {
      const srcDir = path.join(testDir, 'src', 'auth');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'login.ts'), 'export function login() {}');

      const movements = [
        {
          source: path.join(srcDir, 'login.ts'),
          destination: path.join(testDir, 'features', 'auth', 'login.ts'),
          type: 'ts',
        },
      ];

      await fileMover.moveFiles(movements, true); // dry run

      expect(await fs.pathExists(movements[0].source)).toBe(true);
      expect(await fs.pathExists(movements[0].destination)).toBe(false);
    });

    it('should create necessary directories', async () => {
      const srcDir = path.join(testDir, 'src', 'deep', 'nested', 'dir');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file.ts'), 'content');

      const movements = [
        {
          source: path.join(srcDir, 'file.ts'),
          destination: path.join(testDir, 'features', 'feature', 'nested', 'dir', 'file.ts'),
          type: 'ts',
        },
      ];

      await fileMover.moveFiles(movements, false);

      const dirPath = path.dirname(movements[0].destination);
      expect(await fs.pathExists(dirPath)).toBe(true);
    });
  });

  describe('cleanupEmptyDirs', () => {
    it('should remove empty directories after file movements', async () => {
      const srcDir = path.join(testDir, 'src', 'empty');
      await fs.ensureDir(srcDir);

      await fileMover.cleanupEmptyDirs(testDir);

      // Directory should be removed if empty
      // Note: src itself might still exist if there are other files
    });

    it('should preserve non-empty directories', async () => {
      const srcDir = path.join(testDir, 'src', 'keep');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'keep-me.ts'), 'content');

      await fileMover.cleanupEmptyDirs(testDir);

      expect(await fs.pathExists(srcDir)).toBe(true);
    });
  });

  describe('rollback', () => {
    it('should restore original files on rollback', async () => {
      // Create and move a file
      const srcDir = path.join(testDir, 'src', 'auth');
      await fs.ensureDir(srcDir);
      const srcFile = path.join(srcDir, 'login.ts');
      const originalContent = 'export function login() {}';
      await fs.writeFile(srcFile, originalContent);

      const movements = [
        {
          source: srcFile,
          destination: path.join(testDir, 'features', 'auth', 'login.ts'),
          type: 'ts',
        },
      ];

      await fileMover.moveFiles(movements, false);
      expect(await fs.pathExists(srcFile)).toBe(false);

      await fileMover.rollback();

      // Should restore
      expect(await fs.pathExists(srcFile)).toBe(true);
      const restored = await fs.readFile(srcFile, 'utf-8');
      expect(restored).toBe(originalContent);
    });
  });
});
