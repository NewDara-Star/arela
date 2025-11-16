import * as cp from 'child_process';
import * as readline from 'readline';
import * as vscode from 'vscode';
import { getPlatformTarget } from './platform';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

const STARTUP_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const HEALTHCHECK_INTERVAL_MS = 30_000;
const RESTART_DELAY_MS = 2000;
const MAX_RESTARTS = 3;

export class ServerManager {
  private process: cp.ChildProcess | null = null;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private restartCount = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private requestCounter = 0;
  private readlineInterface: readline.Interface | null = null;
  private stopping = false;
  private notificationHandlers = new Map<string, Set<(params: unknown) => void>>();

  constructor(private readonly binaryPath: string, private readonly context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('Arela Server');
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = undefined;
    this.context.subscriptions.push(this.outputChannel, this.statusBarItem);
  }

  async start(): Promise<void> {
    if (this.process) {
      return;
    }

    this.updateStatus('$(loading~spin) Arela: Starting…', 'Starting Arela server');
    await this.spawnProcess();
    await this.waitForReady();
    await this.initializeServer();
    this.startHealthChecks();
    this.updateStatus('$(check) Arela: Ready', 'Server is running');
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.clearHealthChecks();

    if (!this.process) {
      this.updateStatus('$(circle-slash) Arela: Stopped', 'Server is not running');
      return;
    }

    const proc = this.process;
    this.process = null;
    this.readlineInterface?.close();
    this.readlineInterface = null;

    await this.shutdownProcess(proc);
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Server stopped'));
    });
    this.pendingRequests.clear();
    this.updateStatus('$(circle-slash) Arela: Stopped', 'Server is not running');
    this.stopping = false;
  }

  async sendRequest(method: string, params: unknown = {}): Promise<unknown> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server process is not running');
    }

    const id = `req-${Date.now()}-${this.requestCounter++}`;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const message = `${JSON.stringify(payload)}\n`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.process?.stdin?.write(message);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  private async spawnProcess() {
    return new Promise<void>((resolve, reject) => {
      const child = cp.spawn(this.binaryPath, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process = child;
      this.restartCount = 0;
      this.stopping = false;

      child.once('error', (error) => {
        this.outputChannel.appendLine(`[error] Failed to start server: ${error.message}`);
        reject(error);
      });

      child.once('exit', (code, signal) => {
        this.process = null;
        this.readlineInterface?.close();
        this.readlineInterface = null;
        this.outputChannel.appendLine(`[info] Server exited (code=${code}, signal=${signal})`);
        if (!this.stopping) {
          void this.handleCrash();
        }
      });

      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          this.outputChannel.append(data.toString());
        });
      }

      if (child.stdout) {
        const rl = readline.createInterface({
          input: child.stdout,
          terminal: false,
        });
        this.readlineInterface = rl;
        rl.on('line', (line) => this.handleResponse(line));
      }

      resolve();
    });
  }

  private handleResponse(line: string) {
    let response: { id?: string | number; result?: unknown; error?: { message?: string } };
    try {
      response = JSON.parse(line);
    } catch (error) {
      this.outputChannel.appendLine(`[error] Failed to parse server response: ${String(error)}`);
      return;
    }

    const payload = response as Record<string, unknown>;

    if (!Object.prototype.hasOwnProperty.call(payload, 'id')) {
      if (typeof payload.method === 'string') {
        this.emitNotification(payload.method, payload.params);
      }
      return;
    }

    const pending = this.pendingRequests.get(response.id!);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(response.id!);
    clearTimeout(pending.timeout);

    if (response.error) {
      pending.reject(new Error(response.error.message || 'Server error'));
    } else {
      pending.resolve(response.result);
    }
  }

  private async waitForReady() {
    const start = Date.now();

    while (Date.now() - start < STARTUP_TIMEOUT_MS) {
      try {
        await this.sendRequest('ping');
        return;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Server did not become ready in time');
  }

  onNotification(method: string, handler: (params: unknown) => void): vscode.Disposable {
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, new Set());
    }
    const handlers = this.notificationHandlers.get(method)!;
    handlers.add(handler);
    return {
      dispose: () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.notificationHandlers.delete(method);
        }
      },
    };
  }

  private startHealthChecks() {
    this.clearHealthChecks();
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.sendRequest('ping');
      } catch (error) {
        this.outputChannel.appendLine(`[warn] Health check failed: ${String(error)}`);
        await this.handleCrash();
      }
    }, HEALTHCHECK_INTERVAL_MS);
  }

  private clearHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async handleCrash() {
    if (this.stopping) {
      return;
    }

    this.restartCount += 1;
    if (this.restartCount > MAX_RESTARTS) {
      this.updateStatus('$(error) Arela: Failed', 'Server failed to restart');
      vscode.window.showErrorMessage('Arela server crashed too many times. Please reload VS Code.');
      await this.stop();
      return;
    }

    this.updateStatus('$(loading~spin) Arela: Restarting…', 'Restarting Arela server');
    this.outputChannel.appendLine('[warn] Server crashed, attempting restart…');
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));

    try {
      await this.start();
    } catch (error) {
      this.outputChannel.appendLine(`[error] Failed to restart server: ${String(error)}`);
      await this.handleCrash();
    }
  }

  private async shutdownProcess(proc: cp.ChildProcess) {
    if (!proc.pid) {
      return;
    }

    proc.kill('SIGTERM');

    const exited = await Promise.race([
      this.waitForExit(proc),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);

    if (!exited) {
      proc.kill('SIGKILL');
      await this.waitForExit(proc);
    }
  }

  private waitForExit(proc: cp.ChildProcess) {
    return new Promise<boolean>((resolve) => {
      proc.once('exit', () => resolve(true));
      proc.once('close', () => resolve(true));
    });
  }

  private updateStatus(text: string, tooltip: string) {
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = `${tooltip}\nTarget: ${getPlatformTarget()}`;
    this.statusBarItem.show();
  }

  private emitNotification(method: string, params: unknown) {
    const handlers = this.notificationHandlers.get(method);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(params);
      } catch (error) {
        this.outputChannel.appendLine(`[warn] Notification handler error for ${method}: ${String(error)}`);
      }
    });
  }

  private async initializeServer() {
    try {
      await this.sendRequest('initialize', {
        ai: this.getAIConfig(),
      });
    } catch (error) {
      this.outputChannel.appendLine(`[warn] Failed to initialize AI config: ${String(error)}`);
    }
  }

  private getAIConfig() {
    const config = vscode.workspace.getConfiguration('arela');
    return {
      defaultProvider: config.get<string>('provider') || undefined,
      defaultModel: config.get<string>('model') || undefined,
      openai: {
        apiKey: config.get<string>('openai.apiKey') || undefined,
      },
      anthropic: {
        apiKey: config.get<string>('anthropic.apiKey') || undefined,
      },
      ollama: {
        enabled: config.get<boolean>('ollama.enabled') ?? false,
        baseUrl: config.get<string>('ollama.baseUrl') || undefined,
      },
    };
  }
}
