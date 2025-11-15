# EXTENSION-004: Server Lifecycle Management

**Category:** Foundation  
**Priority:** P0 (Blocking)  
**Estimated Time:** 6 hours  
**Assignee:** TBD  
**Status:** 🔴 Not Started

---

## Context

Implement child_process management to spawn, monitor, and kill the `arela-server` binary. The extension must manage the server's lifecycle, handle crashes, and ensure clean shutdown.

## Requirements

### Must Have
- [ ] Spawn server process on extension activation
- [ ] Kill server process on extension deactivation
- [ ] Monitor server health (ping every 30s)
- [ ] Restart server on crash
- [ ] Handle server startup failures
- [ ] Timeout server startup (10s max)
- [ ] Log server stderr to Output Channel

### Should Have
- [ ] Debounce restart (avoid restart loops)
- [ ] Track restart count (max 3 attempts)
- [ ] Show status bar item (server status)
- [ ] Graceful shutdown (SIGTERM before SIGKILL)

### Nice to Have
- [ ] Server performance metrics
- [ ] Memory usage monitoring
- [ ] Automatic restart on high memory usage

## Acceptance Criteria

- [ ] Server starts successfully on activation
- [ ] Server stops cleanly on deactivation
- [ ] Server restarts automatically on crash
- [ ] Startup failures show clear error message
- [ ] Server logs visible in Output Channel
- [ ] No zombie processes left behind
- [ ] Works on all platforms (Windows, macOS, Linux)

## Technical Details

### Server Manager

```typescript
// src/server-manager.ts
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as readline from 'readline';

export class ServerManager {
  private process: cp.ChildProcess | null = null;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private restartCount = 0;
  private maxRestarts = 3;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private binaryPath: string,
    private context: vscode.ExtensionContext
  ) {
    this.outputChannel = vscode.window.createOutputChannel('Arela Server');
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.text = '$(loading~spin) Arela: Starting...';
    this.statusBarItem.show();
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server already running');
    }

    this.log('Starting server...');
    this.updateStatus('$(loading~spin) Arela: Starting...', 'Starting server...');

    try {
      this.process = cp.spawn(this.binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.setupStdio();
      this.setupEventHandlers();

      // Wait for server to be ready (ping)
      await this.waitForReady();

      this.log('Server started successfully');
      this.updateStatus('$(check) Arela: Ready', 'Server is running');
      this.restartCount = 0;

      // Start health checks
      this.startHealthChecks();
    } catch (error) {
      this.log(`Failed to start server: ${error.message}`);
      this.updateStatus('$(error) Arela: Failed', error.message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    this.log('Stopping server...');
    this.updateStatus('$(loading~spin) Arela: Stopping...', 'Stopping server...');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Graceful shutdown (SIGTERM)
    this.process.kill('SIGTERM');

    // Wait for exit (max 5s)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if not exited
        if (this.process) {
          this.log('Server did not exit gracefully, forcing kill...');
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      this.process!.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.process = null;
    this.log('Server stopped');
    this.updateStatus('$(circle-slash) Arela: Stopped', 'Server is not running');
  }

  async restart(): Promise<void> {
    this.log('Restarting server...');
    await this.stop();
    await this.start();
  }

  async sendRequest(request: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server not running');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      // Send request
      this.process!.stdin!.write(JSON.stringify(request) + '\n');

      // Wait for response (one-time listener)
      const listener = (line: string) => {
        try {
          const response = JSON.parse(line);
          if (response.id === request.id) {
            clearTimeout(timeout);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parse errors (may be logs)
        }
      };

      // Attach listener (will be cleaned up after response)
      this.process!.stdout!.once('data', listener);
    });
  }

  private setupStdio() {
    if (!this.process) return;

    // Read stdout line-by-line (JSON-RPC responses)
    const rl = readline.createInterface({
      input: this.process.stdout!,
      terminal: false,
    });

    rl.on('line', (line) => {
      // Responses are handled by sendRequest()
      // This is just for logging unexpected output
      if (!line.startsWith('{')) {
        this.log(`[stdout] ${line}`);
      }
    });

    // Read stderr (logs)
    this.process.stderr!.on('data', (data) => {
      this.log(`[stderr] ${data.toString()}`);
    });
  }

  private setupEventHandlers() {
    if (!this.process) return;

    this.process.on('error', (error) => {
      this.log(`Server error: ${error.message}`);
      this.handleCrash();
    });

    this.process.on('exit', (code, signal) => {
      this.log(`Server exited with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        this.handleCrash();
      }
    });
  }

  private async waitForReady(): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.sendRequest({
          jsonrpc: '2.0',
          id: 'ping-startup',
          method: 'ping',
          params: {},
        });

        if (result === 'pong') {
          return; // Server is ready
        }
      } catch (error) {
        // Retry
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Server failed to start within 10 seconds');
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.sendRequest({
          jsonrpc: '2.0',
          id: `ping-${Date.now()}`,
          method: 'ping',
          params: {},
        });
      } catch (error) {
        this.log(`Health check failed: ${error.message}`);
        this.handleCrash();
      }
    }, 30000); // Every 30 seconds
  }

  private async handleCrash() {
    this.log('Server crashed');
    this.process = null;

    if (this.restartCount >= this.maxRestarts) {
      this.log(`Max restart attempts (${this.maxRestarts}) reached. Giving up.`);
      this.updateStatus('$(error) Arela: Failed', 'Server crashed too many times');
      vscode.window.showErrorMessage(
        'Arela server crashed multiple times. Please check the Output Channel for errors.'
      );
      return;
    }

    this.restartCount++;
    this.log(`Attempting restart (${this.restartCount}/${this.maxRestarts})...`);

    // Debounce restart (wait 2s)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await this.start();
    } catch (error) {
      this.log(`Restart failed: ${error.message}`);
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  private updateStatus(text: string, tooltip: string) {
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
  }

  dispose() {
    this.stop();
    this.outputChannel.dispose();
    this.statusBarItem.dispose();
  }
}
```

### Extension Activation

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { ensureServer } from './downloader';
import { ServerManager } from './server-manager';

let serverManager: ServerManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Arela extension activating...');

  try {
    // Download server binary if needed
    const binaryPath = await ensureServer(context);

    // Start server
    serverManager = new ServerManager(binaryPath, context);
    await serverManager.start();

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('arela.restartServer', async () => {
        await serverManager?.restart();
      })
    );

    console.log('Arela extension activated');
  } catch (error) {
    vscode.window.showErrorMessage(`Arela activation failed: ${error.message}`);
    throw error;
  }
}

export async function deactivate() {
  console.log('Arela extension deactivating...');
  await serverManager?.stop();
  serverManager = null;
}
```

## Files to Create

- `packages/extension/src/server-manager.ts`
- `packages/extension/src/extension.ts` (update)

## Dependencies

- **Blocks:** EXTENSION-005 (UI needs server)
- **Blocked by:** EXTENSION-003 (downloader)

## Testing

### Manual Test
1. Activate extension
2. Check Output Channel for "Server started"
3. Check status bar shows "Arela: Ready"
4. Kill server process manually
5. Verify auto-restart
6. Deactivate extension
7. Verify server stops cleanly

### Unit Tests
- [ ] Test server spawn
- [ ] Test server stop
- [ ] Test server restart
- [ ] Test crash handling
- [ ] Test health checks
- [ ] Test request/response

### Integration Tests
- [ ] Test full lifecycle (start → stop)
- [ ] Test crash recovery
- [ ] Test max restart limit

## Documentation

- Document server lifecycle in README
- Add troubleshooting guide for server failures
- Document Output Channel usage

## Notes

- Use `$(icon)` syntax for status bar icons (VS Code icons)
- Log everything to Output Channel for debugging
- Graceful shutdown is critical (SIGTERM before SIGKILL)
- Health checks prevent silent failures
- Debounce restarts to avoid restart loops

## Related

- Architecture Decision: Section 5.1
- Validation: "Extension Host Performance"
