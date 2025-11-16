import * as vscode from 'vscode';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ConversationStorage,
  type StoredConversation,
  type StoredMessage,
} from './conversation-storage';
import type {
  MessageContext,
  SelectionContext,
  WorkspaceContext,
  WorkspaceFile,
} from './types/chat';
import type { ServerManager } from './server-manager';
import { SecretManager } from './secret-manager';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatProvider {
  private panel: vscode.WebviewPanel | null = null;
  private serverManager: ServerManager | null = null;
  private notificationDisposables: vscode.Disposable[] = [];
  private selectionWatcherDisposables: vscode.Disposable[] = [];
  private selectionUpdateTimeout: NodeJS.Timeout | null = null;
  private conversationStorage: ConversationStorage;
  private currentConversation: StoredConversation | null = null;
  private currentConversationId: string | null = null;
  private readonly ACTIVE_CONVERSATION_KEY = 'arela.activeConversationId';
  private conversationsInitPromise: Promise<void> | null = null;
  private pendingAssistantMessages = new Map<string, StoredMessage>();
  private lastSelection: SelectionContext | null = null;
  private lastActiveEditor: vscode.TextEditor | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly secretManager: SecretManager
  ) {
    this.conversationStorage = new ConversationStorage(context);
  }

  show() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.sendSelectionUpdate();
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
    this.setupSelectionWatcher();
    this.panel.onDidDispose(() => {
      this.disposeSelectionWatcher();
      this.panel = null;
    });

    void this.ensureConversationReady().then(() => {
      void this.emitConversationSnapshot(true);
    });
  }

  hasActivePanel(): boolean {
    return Boolean(this.panel);
  }

  private ensureConversationReady(): Promise<void> {
    if (!this.conversationsInitPromise) {
      this.conversationsInitPromise = this.initializeConversationState();
    }
    return this.conversationsInitPromise;
  }

  private async initializeConversationState() {
    try {
      const summaries = await this.conversationStorage.listConversations();
      const storedId = this.context.workspaceState.get<string>(this.ACTIVE_CONVERSATION_KEY);
      let conversation: StoredConversation | null = null;

      if (storedId) {
        conversation = await this.conversationStorage.loadConversation(storedId);
      }

      if (!conversation && summaries.length > 0) {
        conversation = await this.conversationStorage.loadConversation(summaries[0].id);
      }

      if (!conversation) {
        conversation = await this.conversationStorage.createConversation();
      }

      this.currentConversation = conversation;
      this.currentConversationId = conversation.id;
      await this.context.workspaceState.update(this.ACTIVE_CONVERSATION_KEY, conversation.id);
    } catch (error) {
      console.warn('[Arela] Failed to initialize conversations', error);
    }
  }

  private async postConversationList(initial = false) {
    if (!this.panel) {
      return;
    }

    try {
      const conversations = await this.conversationStorage.listConversations();
      this.panel.webview.postMessage({
        type: initial ? 'conversationsLoaded' : 'conversationList',
        conversations,
        activeConversationId: this.currentConversationId,
      });
    } catch (error) {
      console.warn('[Arela] Failed to send conversation list', error);
    }
  }

  private async emitConversationSnapshot(initial = false) {
    await this.postConversationList(initial);
    await this.sendActiveConversationMessages();
  }

  private async sendActiveConversationMessages() {
    if (!this.panel) {
      return;
    }

    const messages = this.serializeMessages(this.currentConversation?.messages ?? []);
    this.panel.webview.postMessage({
      type: 'conversationLoaded',
      conversationId: this.currentConversationId,
      messages,
    });
  }

  private serializeMessages(messages: StoredMessage[]) {
    return messages.map((message) => ({
      ...message,
      isStreaming: false,
    }));
  }

  async newConversation() {
    await this.ensureConversationReady();
    const conversation = await this.conversationStorage.createConversation();
    this.currentConversation = conversation;
    this.currentConversationId = conversation.id;
    this.pendingAssistantMessages.clear();
    await this.context.workspaceState.update(this.ACTIVE_CONVERSATION_KEY, conversation.id);
    await this.emitConversationSnapshot();
  }

  async loadConversation(conversationId: string) {
    await this.ensureConversationReady();
    const conversation = await this.conversationStorage.loadConversation(conversationId);
    if (!conversation) {
      vscode.window.showWarningMessage('Conversation not found');
      return;
    }
    this.currentConversation = conversation;
    this.currentConversationId = conversation.id;
    this.pendingAssistantMessages.clear();
    await this.context.workspaceState.update(this.ACTIVE_CONVERSATION_KEY, conversation.id);
    await this.emitConversationSnapshot();
  }

  async deleteConversation(conversationId: string) {
    await this.ensureConversationReady();
    await this.conversationStorage.deleteConversation(conversationId);

    if (this.currentConversationId === conversationId) {
      const summaries = await this.conversationStorage.listConversations();
      if (summaries.length > 0) {
        const conversation = await this.conversationStorage.loadConversation(summaries[0].id);
        if (conversation) {
          this.currentConversation = conversation;
          this.currentConversationId = conversation.id;
        }
      } else {
        const conversation = await this.conversationStorage.createConversation();
        this.currentConversation = conversation;
        this.currentConversationId = conversation.id;
      }
      this.pendingAssistantMessages.clear();
      await this.context.workspaceState.update(this.ACTIVE_CONVERSATION_KEY, this.currentConversationId);
    }

    await this.emitConversationSnapshot();
  }

  async deleteCurrentConversation() {
    if (!this.currentConversationId) {
      return;
    }
    await this.deleteConversation(this.currentConversationId);
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
        manager.onNotification('streamChunk', (params) => {
          void this.handleServerStreamEvent('streamChunk', params);
        }),
        manager.onNotification('streamEnd', (params) => {
          void this.handleServerStreamEvent('streamEnd', params);
        }),
        manager.onNotification('streamError', (params) => {
          void this.handleServerStreamEvent('streamError', params);
        }),
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
        case 'newConversation':
          await this.newConversation();
          break;
        case 'loadConversation':
          if (message.conversationId) {
            await this.loadConversation(message.conversationId);
          }
          break;
        case 'deleteConversation':
          if (message.conversationId) {
            await this.deleteConversation(message.conversationId);
          }
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

    await this.ensureConversationReady();
    const messageId = randomUUID();
    await this.appendUserMessage(content);
    await this.addAssistantPlaceholder(messageId);

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

  private async appendUserMessage(content: string) {
    const message: StoredMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    await this.addMessageToConversation(message);
  }

  private async addAssistantPlaceholder(messageId: string) {
    const message: StoredMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    await this.addMessageToConversation(message, { save: false });
    this.pendingAssistantMessages.set(messageId, message);
  }

  private async addMessageToConversation(message: StoredMessage, options?: { save?: boolean }) {
    await this.ensureConversationReady();
    if (!this.currentConversation) {
      return;
    }

    const hadUserMessage = this.currentConversation.messages.some((msg) => msg.role === 'user');
    this.currentConversation.messages.push(message);

    if (!hadUserMessage && message.role === 'user') {
      this.currentConversation.title = this.conversationStorage.generateTitle(message.content);
    }

    this.currentConversation.updatedAt = message.timestamp;

    if (options?.save !== false) {
      await this.saveCurrentConversation();
    }
  }

  private async saveCurrentConversation(refreshList = true) {
    if (!this.currentConversation) return;
    await this.conversationStorage.saveConversation(this.currentConversation);
    if (refreshList) {
      await this.postConversationList();
    }
  }

  private handleAssistantChunk(messageId: string | undefined, chunk: string) {
    if (!messageId) return;
    const message = this.pendingAssistantMessages.get(messageId);
    if (message) {
      message.content += chunk;
      message.timestamp = Date.now();
    }
  }

  private async finalizeAssistantMessage(messageId: string | undefined) {
    if (!messageId) return;
    const message = this.pendingAssistantMessages.get(messageId);
    if (!message) return;
    this.pendingAssistantMessages.delete(messageId);
    await this.saveCurrentConversation();
  }

  private async handleAssistantError(messageId: string | undefined, errorText: string | undefined) {
    if (!messageId) return;
    const message = this.pendingAssistantMessages.get(messageId);
    if (!message) return;
    const text = errorText ?? 'Unknown error';
    message.content += `\n\n**Error:** ${text}`;
    message.timestamp = Date.now();
    await this.saveCurrentConversation();
  }

  private async handleServerStreamEvent(type: string, payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const data = payload as { messageId?: string; chunk?: string; error?: string };

    switch (type) {
      case 'streamChunk':
        this.handleAssistantChunk(data.messageId, data.chunk ?? '');
        break;
      case 'streamEnd':
        await this.finalizeAssistantMessage(data.messageId);
        break;
      case 'streamError':
        await this.handleAssistantError(data.messageId, data.error);
        break;
      default:
        break;
    }

    if (this.panel) {
      this.panel.webview.postMessage({
        type,
        ...data,
      });
    }
  }

  private buildMessages(content: string, context?: MessageContext): AIMessage[] {
    const messages: AIMessage[] = [];
    let hasContext = false;
    let systemContent = 'You are Arela, an AI coding assistant.\n\n';
    const ctx = context ?? {};

    if (ctx.workspace) {
      const ws = ctx.workspace;
      const workspaceName = path.basename(ws.rootPath) || ws.rootPath;
      systemContent += `Workspace: ${workspaceName}\n`;
      systemContent += `Root path: ${ws.rootPath}\n`;
      systemContent += `Total files: ${ws.totalFiles}${ws.truncated ? ' (truncated to 100)' : ''}\n\n`;
      systemContent += 'File structure:\n';
      systemContent += this.buildFileTree(ws.files);
      systemContent += '\n';
      if (ws.recentFiles.length > 0) {
        systemContent += 'Recently opened files:\n';
        ws.recentFiles.forEach((file) => {
          systemContent += `- ${file}\n`;
        });
        systemContent += '\n';
      }
      hasContext = true;
    }

    if (ctx.selection) {
      const sel = ctx.selection;
      const filename = path.basename(sel.file);
      systemContent += `Selected code from ${filename} (lines ${sel.startLine}-${sel.endLine}):\n`;
      systemContent += `\`\`\`${sel.language}\n${sel.code}\n\`\`\`\n\n`;
      if (sel.truncated) {
        systemContent += '(Selection was truncated to 10,000 characters)\n\n';
      }
      hasContext = true;
    }

    if (ctx.files?.length) {
      systemContent += 'Attached files:\n';
      for (const file of ctx.files) {
        systemContent += `\n${file.path}:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
      }
      hasContext = true;
    }

    if (ctx.mentions?.length) {
      systemContent += '\nMentioned files:\n';
      for (const mention of ctx.mentions) {
        systemContent += `- ${mention.path}\n`;
      }
      hasContext = true;
    }

    if (hasContext) {
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

  async getWorkspaceContext(): Promise<WorkspaceContext | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    const files: WorkspaceFile[] = [];
    const MAX_FILES = 100;
    const excludePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.arela/**',
    ];
    const excludeGlob = `{${excludePatterns.join(',')}}`;

    const fileUris = await vscode.workspace.findFiles('**/*', excludeGlob, MAX_FILES);
    for (const uri of fileUris) {
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        const relativePath = vscode.workspace.asRelativePath(uri);
        files.push({
          path: relativePath,
          type:
            (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory
              ? 'directory'
              : 'file',
          size: stat.size,
        });
      } catch (error) {
        console.warn('[Arela] Failed to stat workspace file', error);
      }
    }

    const recentFiles: string[] = [];
    const seen = new Set<string>();
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.isUntitled || doc.uri.scheme !== 'file') continue;
      const relative = vscode.workspace.asRelativePath(doc.uri);
      if (!relative) continue;
      if (relative.includes('node_modules')) continue;
      if (seen.has(relative)) continue;
      seen.add(relative);
      recentFiles.push(relative);
      if (recentFiles.length >= 10) {
        break;
      }
    }

    return {
      rootPath: workspaceFolder.uri.fsPath,
      files,
      recentFiles,
      totalFiles: files.length,
      truncated: fileUris.length === MAX_FILES,
    };
  }

  sendWorkspaceContext(workspace: WorkspaceContext) {
    if (!this.panel) return;
    this.panel.webview.postMessage({
      type: 'workspaceContextAdded',
      workspace,
    });
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

  private setupSelectionWatcher() {
    if (!this.panel) {
      return;
    }
    this.disposeSelectionWatcher();
    this.sendSelectionUpdate();

    const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(() => {
      if (this.selectionUpdateTimeout) {
        clearTimeout(this.selectionUpdateTimeout);
      }
      this.selectionUpdateTimeout = setTimeout(() => {
        this.sendSelectionUpdate();
      }, 300);
    });

    const editorDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
      this.sendSelectionUpdate();
    });

    this.selectionWatcherDisposables.push(selectionDisposable, editorDisposable);
  }

  private disposeSelectionWatcher() {
    if (this.selectionUpdateTimeout) {
      clearTimeout(this.selectionUpdateTimeout);
      this.selectionUpdateTimeout = null;
    }
    this.selectionWatcherDisposables.forEach((disposable) => disposable.dispose());
    this.selectionWatcherDisposables = [];
  }

  private sendSelectionUpdate() {
    if (!this.panel) {
      return;
    }
    const selection = this.getActiveSelection();
    
    // Only update if selection actually changed
    // This prevents clearing selection when webview takes focus
    if (JSON.stringify(selection) !== JSON.stringify(this.lastSelection)) {
      this.lastSelection = selection;
      this.panel.webview.postMessage({
        type: 'selectionChanged',
        selection,
      });
    }
  }

  private getActiveSelection(): SelectionContext | null {
    let editor = vscode.window.activeTextEditor;

    // If no active editor (e.g., webview has focus), use last known editor
    if (!editor && this.lastActiveEditor) {
      editor = this.lastActiveEditor;
    }

    // Update last active editor if we have one
    if (editor) {
      this.lastActiveEditor = editor;
    }

    if (!editor) return null;

    const selection = editor.selection;
    if (selection.isEmpty) return null;

    let selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) return null;

    const MAX_CHARS = 10_000;
    let truncated = false;
    if (selectedText.length > MAX_CHARS) {
      selectedText = selectedText.slice(0, MAX_CHARS);
      truncated = true;
    }

    return {
      file: editor.document.uri.fsPath,
      language: editor.document.languageId,
      startLine: selection.start.line + 1,
      endLine: selection.end.line + 1,
      code: selectedText,
      truncated,
    };
  }

  private buildFileTree(files: WorkspaceFile[]): string {
    type TreeNode = {
      name: string;
      children: Map<string, TreeNode>;
      isDir: boolean;
    };

    const root: TreeNode = { name: '', children: new Map(), isDir: true };

    const insertPath = (filePath: string, isDirectory: boolean) => {
      const normalized = filePath.replace(/\\/g, '/');
      const segments = normalized.split('/').filter(Boolean);
      if (segments.length === 0) {
        return;
      }
      let node = root;
      segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        if (!node.children.has(segment)) {
          node.children.set(segment, {
            name: segment,
            children: new Map(),
            isDir: !isLast || isDirectory,
          });
        }
        const child = node.children.get(segment)!;
        if (isLast && isDirectory) {
          child.isDir = true;
        }
        node = child;
      });
    };

    files.forEach((file) => {
      insertPath(file.path, file.type === 'directory');
    });

    const lines: string[] = [];
    const traverse = (node: TreeNode, depth: number) => {
      const entries = Array.from(node.children.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const child of entries) {
        const indent = '  '.repeat(depth);
        lines.push(`${indent}${child.name}${child.isDir ? '/' : ''}`);
        if (child.isDir) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(root, 0);
    if (lines.length === 0) {
      return '(no files)\n';
    }
    return `${lines.join('\n')}\n`;
  }
}
