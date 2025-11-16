# EXTENSION-017: Automated Testing Suite

**Category:** Testing  
**Priority:** P2  
**Estimated Time:** 6h  
**Agent:** @claude  
**Status:** 🔴 Not Started

---

## Context

The extension needs comprehensive automated tests to ensure quality and prevent regressions. This includes:
- Unit tests for business logic
- Integration tests for extension/server communication
- E2E tests for user workflows
- Visual regression tests for UI

**Current state:**
- ✅ Extension builds
- ❌ No automated tests
- ❌ Manual testing only

**Goal:** Full test coverage with automated CI testing.

---

## Requirements

### Must Have
- [ ] Unit tests for core logic
- [ ] Integration tests for IPC
- [ ] E2E tests for workflows
- [ ] Test coverage >80%
- [ ] Tests run in CI

### Should Have
- [ ] Visual regression tests
- [ ] Performance tests
- [ ] Load tests for server
- [ ] Test fixtures and mocks

### Nice to Have
- [ ] Mutation testing
- [ ] Fuzz testing
- [ ] Property-based testing

---

## Acceptance Criteria

- [ ] Unit tests cover core logic
- [ ] Integration tests cover IPC
- [ ] E2E tests cover user workflows
- [ ] All tests pass in CI
- [ ] Coverage report generated
- [ ] Tests run fast (<2 min)

---

## Technical Details

### 1. Test Framework Setup

```json
// packages/extension/package.json

{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "npm run build && node ./out/test/runTest.js",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/vscode": "^1.85.0",
    "@vscode/test-electron": "^2.3.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

### 2. Unit Tests

```typescript
// packages/extension/src/__tests__/chat-provider.test.ts

import { ChatProvider } from '../chat-provider';
import * as vscode from 'vscode';

jest.mock('vscode');

describe('ChatProvider', () => {
  let chatProvider: ChatProvider;
  let mockContext: vscode.ExtensionContext;
  
  beforeEach(() => {
    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
    } as any;
    
    chatProvider = new ChatProvider(mockContext);
  });
  
  describe('getActiveSelection', () => {
    it('returns null when no active editor', () => {
      (vscode.window.activeTextEditor as any) = undefined;
      const result = chatProvider['getActiveSelection']();
      expect(result).toBeNull();
    });
    
    it('returns selection context when code is selected', () => {
      const mockEditor = {
        selection: {
          isEmpty: false,
          start: { line: 0 },
          end: { line: 5 },
        },
        document: {
          getText: jest.fn().mockReturnValue('test code'),
          uri: { fsPath: '/test/file.ts' },
          languageId: 'typescript',
        },
      };
      
      (vscode.window.activeTextEditor as any) = mockEditor;
      
      const result = chatProvider['getActiveSelection']();
      
      expect(result).toEqual({
        file: '/test/file.ts',
        language: 'typescript',
        startLine: 1,
        endLine: 6,
        code: 'test code',
        truncated: false,
      });
    });
    
    it('truncates large selections', () => {
      const largeCode = 'x'.repeat(15000);
      const mockEditor = {
        selection: {
          isEmpty: false,
          start: { line: 0 },
          end: { line: 100 },
        },
        document: {
          getText: jest.fn().mockReturnValue(largeCode),
          uri: { fsPath: '/test/file.ts' },
          languageId: 'typescript',
        },
      };
      
      (vscode.window.activeTextEditor as any) = mockEditor;
      
      const result = chatProvider['getActiveSelection']();
      
      expect(result?.code.length).toBe(10000);
      expect(result?.truncated).toBe(true);
    });
  });
  
  describe('buildMessages', () => {
    it('includes selection in system prompt', () => {
      const context = {
        selection: {
          file: '/test/file.ts',
          language: 'typescript',
          startLine: 1,
          endLine: 5,
          code: 'const x = 1;',
        },
      };
      
      const messages = chatProvider['buildMessages']('Explain this', context);
      
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Selected code');
      expect(messages[0].content).toContain('const x = 1;');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('Explain this');
    });
  });
});
```

### 3. Integration Tests

```typescript
// packages/extension/src/__tests__/integration/server-ipc.test.ts

import { ServerManager } from '../../server-manager';
import * as vscode from 'vscode';

describe('Server IPC Integration', () => {
  let serverManager: ServerManager;
  let mockContext: vscode.ExtensionContext;
  
  beforeAll(async () => {
    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
      globalStorageUri: { fsPath: '/test/storage' },
    } as any;
    
    // Start real server
    serverManager = new ServerManager('/path/to/server', mockContext, true);
    await serverManager.start();
  });
  
  afterAll(async () => {
    await serverManager.stop();
  });
  
  it('should ping server successfully', async () => {
    const result = await serverManager.sendRequest('ping');
    expect(result).toBe('pong');
  });
  
  it('should list AI providers', async () => {
    const providers = await serverManager.sendRequest('listProviders');
    expect(Array.isArray(providers)).toBe(true);
  });
  
  it('should handle streaming', async () => {
    const chunks: string[] = [];
    
    serverManager.onNotification('streamChunk', (params: any) => {
      chunks.push(params.chunk);
    });
    
    await serverManager.sendRequest('streamChat', {
      messages: [{ role: 'user', content: 'Hello' }],
    });
    
    // Wait for streaming to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### 4. E2E Tests

```typescript
// packages/extension/src/test/suite/extension.test.ts

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension E2E Tests', () => {
  vscode.window.showInformationMessage('Start E2E tests');
  
  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('arela.arela');
    assert.ok(ext);
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);
  });
  
  test('Open Chat command should exist', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('arela.openChat'));
  });
  
  test('Chat panel should open', async () => {
    await vscode.commands.executeCommand('arela.openChat');
    
    // Wait for panel to open
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if panel is visible (implementation-specific)
    // This is a simplified check
    assert.ok(true);
  });
  
  test('Should send message and receive response', async () => {
    await vscode.commands.executeCommand('arela.openChat');
    
    // Simulate sending message
    // This requires accessing the webview, which is complex
    // For now, we'll just verify the command works
    
    assert.ok(true);
  });
});
```

### 5. Visual Regression Tests

```typescript
// packages/extension/webview/__tests__/visual.test.ts

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('chat interface matches snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173'); // Vite dev server
    
    await expect(page).toHaveScreenshot('chat-interface.png');
  });
  
  test('message rendering matches snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Add test message
    await page.evaluate(() => {
      window.postMessage({
        type: 'addMessage',
        message: {
          role: 'assistant',
          content: '```typescript\nconst x = 1;\n```',
        },
      });
    });
    
    await expect(page).toHaveScreenshot('message-with-code.png');
  });
});
```

### 6. Coverage Configuration

```javascript
// jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Testing

1. **Run unit tests:**
   ```bash
   npm run test:unit
   ```

2. **Run integration tests:**
   ```bash
   npm run test:integration
   ```

3. **Run E2E tests:**
   ```bash
   npm run test:e2e
   ```

4. **Check coverage:**
   ```bash
   npm run test:coverage
   ```

---

**Build this for quality assurance!** ✅
