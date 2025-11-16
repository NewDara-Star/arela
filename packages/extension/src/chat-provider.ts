import * as vscode from 'vscode';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { MessageContext } from './types/chat';
import type { ServerManager } from './server-manager';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatProvider {
  private panel: vscode.WebviewPanel | null = null;
  private serverManager: ServerManager | null = null;
  private notificationDisposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  show() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'arelaChat',
      'Arela Chat',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview')),
        ],
      },
    );

    this.panel.webview.html = this.getHtml();
    this.setupMessageHandlers();
    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }

  private getHtml(): string {
    if (!this.panel) {
      throw new Error('Webview panel not initialized');
    }

    const webview = this.panel.webview;
    const bundleDir = path.join(this.context.extensionPath, 'out', 'webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(bundleDir, 'bundle.js')));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(bundleDir, 'bundle.css')));
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        script-src ${webview.cspSource} 'nonce-${nonce}';
        style-src ${webview.cspSource} 'unsafe-inline';
        font-src ${webview.cspSource};
        img-src ${webview.cspSource} data:;
      ">
      <link rel="stylesheet" href="${styleUri}">
      <title>Arela Chat</title>
    </head>
    <body>
      <div id="app"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  setServerManager(manager: ServerManager | null) {
    this.notificationDisposables.forEach((disposable) => disposable.dispose());
    this.notificationDisposables = [];
    this.serverManager = manager;

    if (manager) {
      this.notificationDisposables.push(
        manager.onNotification('streamChunk', (params) => this.handleServerStreamEvent('streamChunk', params)),
        manager.onNotification('streamEnd', (params) => this.handleServerStreamEvent('streamEnd', params)),
        manager.onNotification('streamError', (params) => this.handleServerStreamEvent('streamError', params)),
      );
    }
  }

  private setupMessageHandlers() {
    if (!this.panel) return;
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'attachFile':
          await this.handleAttachFile();
          break;
        case 'searchFiles':
          await this.handleSearchFiles(message.query ?? '');
          break;
        case 'sendMessage':
          await this.handleSendMessage(message.content, message.context);
          break;
        case 'stopStreaming':
          await this.handleStopStreaming(message.messageId);
          break;
        default:
          break;
      }
    });
  }

  private async handleAttachFile() {
    if (!this.panel) return;

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Attach',
      filters: {
        'Code files': ['ts', 'js', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'h'],
        'All files': ['*'],
      },
    });

    if (!uris || uris.length === 0) {
      return;
    }

    const uri = uris[0];
    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString('utf8');
    const language = this.detectLanguage(uri.fsPath);

    this.panel.webview.postMessage({
      type: 'fileAttached',
      file: {
        path: vscode.workspace.asRelativePath(uri),
        content: text,
        language,
      },
    });
  }

  private async handleSearchFiles(query: string) {
    if (!this.panel) return;

    if (!query) {
      this.panel.webview.postMessage({
        type: 'fileSearchResults',
        results: [],
      });
      return;
    }

    const files = await vscode.workspace.findFiles(
      `**/*${query}*`,
      '**/node_modules/**',
      20,
    );

    const results = files.map((uri) => ({
      path: vscode.workspace.asRelativePath(uri),
      type: 'file' as const,
    }));

    this.panel.webview.postMessage({
      type: 'fileSearchResults',
      results,
    });
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1);
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
    };
    return langMap[ext] || ext;
  }

  private async handleSendMessage(content: string, context: MessageContext | undefined) {
    if (!this.panel) return;

    const messageId = randomUUID();
    this.panel.webview.postMessage({
      type: 'streamStart',
      messageId,
    });

    if (!this.serverManager) {
      this.emitStreamError(messageId, 'AI server is not running.');
      return;
    }

    const messages = this.buildMessages(content, context);

    try {
      await this.serverManager.sendRequest('streamChat', {
        messageId,
        messages,
      });
    } catch (error: unknown) {
      this.emitStreamError(
        messageId,
        error instanceof Error ? error.message : 'Failed to start streaming response.',
      );
    }
  }

  private async handleStopStreaming(messageId: string) {
    if (!this.serverManager) return;
    try {
      await this.serverManager.sendRequest('stopStream', { messageId });
    } catch (error) {
      console.warn('Failed to stop stream', error);
    }
  }

  private handleServerStreamEvent(type: string, payload: unknown) {
    if (!this.panel || !payload || typeof payload !== 'object') {
      return;
    }
    this.panel.webview.postMessage({
      type,
      ...(payload as Record<string, unknown>),
    });
  }

  private buildMessages(content: string, context?: MessageContext): AIMessage[] {
    const messages: AIMessage[] = [];

    if (context && (context.files?.length || context.selection || context.mentions?.length)) {
      let systemContent = 'You are Arela, an AI coding assistant.\n\n';

      if (context.files?.length) {
        systemContent += 'Attached files:\n';
        for (const file of context.files) {
          systemContent += `\n${file.path}:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
        }
      }

      if (context.selection) {
        systemContent += `\nSelected code from ${context.selection.file}:\n\`\`\`\n${context.selection.code}\n\`\`\`\n`;
      }

      if (context.mentions?.length) {
        systemContent += '\nMentioned files:\n';
        for (const mention of context.mentions) {
          systemContent += `- ${mention.path}\n`;
        }
      }

      messages.push({
        role: 'system',
        content: systemContent,
      });
    }

    messages.push({
      role: 'user',
      content,
    });

    return messages;
  }

  private emitStreamError(messageId: string, error: string) {
    if (!this.panel) return;
    this.panel.webview.postMessage({
      type: 'streamError',
      messageId,
      error,
    });
    this.panel.webview.postMessage({
      type: 'streamEnd',
      messageId,
    });
  }
}
