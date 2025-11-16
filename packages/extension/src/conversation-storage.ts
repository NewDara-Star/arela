import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export class ConversationStorage {
  private storageDir: string | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private async getWorkspaceDir(): Promise<string> {
    if (this.storageDir) {
      return this.storageDir;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('Workspace folder not found');
    }

    const dir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'arela-conversations');
    await fs.mkdir(dir, { recursive: true });
    this.storageDir = dir;
    return dir;
  }

  private async getConversationPath(id: string): Promise<string> {
    const dir = await this.getWorkspaceDir();
    return path.join(dir, `${id}.json`);
  }

  async createConversation(): Promise<StoredConversation> {
    const now = Date.now();
    const conversation: StoredConversation = {
      id: randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.saveConversation(conversation);
    return conversation;
  }

  async saveConversation(conversation: StoredConversation): Promise<void> {
    const filePath = await this.getConversationPath(conversation.id);
    const data = JSON.stringify(conversation, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
  }

  async loadConversation(id: string): Promise<StoredConversation | null> {
    try {
      const filePath = await this.getConversationPath(id);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as StoredConversation;
    } catch (error) {
      console.warn('[Arela] Failed to load conversation', error);
      return null;
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      const filePath = await this.getConversationPath(id);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('[Arela] Failed to delete conversation', error);
    }
  }

  async listConversations(): Promise<ConversationSummary[]> {
    try {
      const dir = await this.getWorkspaceDir();
      const entries = await fs.readdir(dir);
      const summaries: ConversationSummary[] = [];

      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const id = entry.replace(/\.json$/, '');
        try {
          const data = await fs.readFile(path.join(dir, entry), 'utf8');
          const conversation = JSON.parse(data) as StoredConversation;
          summaries.push({
            id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          });
        } catch (error) {
          console.warn('[Arela] Failed to parse conversation file', entry, error);
        }
      }

      summaries.sort((a, b) => b.updatedAt - a.updatedAt);
      return summaries;
    } catch (error) {
      console.warn('[Arela] Failed to list conversations', error);
      return [];
    }
  }

  generateTitle(message: string): string {
    if (!message) {
      return 'New Chat';
    }
    const cleaned = message.trim().replace(/\s+/g, ' ');
    if (!cleaned) {
      return 'New Chat';
    }
    return cleaned.length > 50 ? `${cleaned.slice(0, 47)}...` : cleaned;
  }
}
