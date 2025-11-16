# EXTENSION-014: Conversation History & Persistence

**Category:** Context  
**Priority:** P2  
**Estimated Time:** 4h  
**Agent:** @codex  
**Status:** 🔴 Not Started

---

## Context

Currently, chat conversations are lost when the webview is closed or VS Code is restarted. Users need conversation history to:
- Resume previous conversations
- Reference past answers
- Build on previous context
- Search conversation history

**Current state:**
- ✅ Chat works within session
- ❌ No persistence across sessions
- ❌ No conversation history
- ❌ No search

**Goal:** Persist conversations and provide history UI.

---

## Requirements

### Must Have
- [ ] Save conversations to workspace storage
- [ ] Load conversation history on startup
- [ ] Show conversation list in sidebar
- [ ] Create new conversation
- [ ] Delete conversations
- [ ] Restore conversation on click

### Should Have
- [ ] Search conversations
- [ ] Export conversation as markdown
- [ ] Conversation titles (auto-generated)
- [ ] Conversation timestamps

### Nice to Have
- [ ] Pin important conversations
- [ ] Share conversations
- [ ] Conversation folders/tags
- [ ] Cloud sync

---

## Acceptance Criteria

- [ ] Conversations persist across VS Code restarts
- [ ] Conversation list shows in sidebar
- [ ] Can create new conversation
- [ ] Can switch between conversations
- [ ] Can delete conversations
- [ ] Conversation titles auto-generated from first message
- [ ] Timestamps shown
- [ ] Search works

---

## Technical Details

### 1. Conversation Storage

```typescript
// packages/extension/src/types/chat.ts

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMetadata {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}
```

### 2. Conversation Manager

```typescript
// packages/extension/src/conversation-manager.ts

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private currentConversationId: string | null = null;
  
  constructor(private readonly context: vscode.ExtensionContext) {
    this.load();
  }
  
  private async load() {
    const stored = this.context.workspaceState.get<Conversation[]>('conversations', []);
    stored.forEach(conv => {
      this.conversations.set(conv.id, conv);
    });
  }
  
  private async save() {
    const conversations = Array.from(this.conversations.values());
    await this.context.workspaceState.update('conversations', conversations);
  }
  
  createConversation(): string {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.conversations.set(id, conversation);
    this.currentConversationId = id;
    this.save();
    
    return id;
  }
  
  addMessage(message: ChatMessage) {
    const conv = this.getCurrentConversation();
    if (!conv) return;
    
    conv.messages.push(message);
    conv.updatedAt = Date.now();
    
    // Auto-generate title from first user message
    if (conv.title === 'New Conversation' && message.role === 'user') {
      conv.title = this.generateTitle(message.content);
    }
    
    this.save();
  }
  
  private generateTitle(content: string): string {
    // Take first 50 chars
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }
  
  getCurrentConversation(): Conversation | null {
    if (!this.currentConversationId) return null;
    return this.conversations.get(this.currentConversationId) || null;
  }
  
  listConversations(): ConversationMetadata[] {
    return Array.from(this.conversations.values())
      .map(conv => ({
        id: conv.id,
        title: conv.title,
        preview: conv.messages[conv.messages.length - 1]?.content.substring(0, 100) || '',
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  deleteConversation(id: string) {
    this.conversations.delete(id);
    if (this.currentConversationId === id) {
      this.currentConversationId = null;
    }
    this.save();
  }
  
  switchConversation(id: string) {
    if (this.conversations.has(id)) {
      this.currentConversationId = id;
    }
  }
}
```

### 3. Sidebar View

```typescript
// packages/extension/src/conversation-tree-provider.ts

export class ConversationTreeProvider implements vscode.TreeDataProvider<ConversationItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ConversationItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  constructor(private conversationManager: ConversationManager) {}
  
  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }
  
  getTreeItem(element: ConversationItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(): ConversationItem[] {
    const conversations = this.conversationManager.listConversations();
    return conversations.map(conv => new ConversationItem(conv));
  }
}

class ConversationItem extends vscode.TreeItem {
  constructor(public readonly conversation: ConversationMetadata) {
    super(conversation.title, vscode.TreeItemCollapsibleState.None);
    
    this.description = `${conversation.messageCount} messages`;
    this.tooltip = conversation.preview;
    this.contextValue = 'conversation';
    this.command = {
      command: 'arela.openConversation',
      title: 'Open Conversation',
      arguments: [conversation.id],
    };
  }
}
```

### 4. Register Sidebar

```typescript
// packages/extension/package.json

"contributes": {
  "viewsContainers": {
    "activitybar": [
      {
        "id": "arela",
        "title": "Arela",
        "icon": "resources/icon.svg"
      }
    ]
  },
  "views": {
    "arela": [
      {
        "id": "arelaConversations",
        "name": "Conversations"
      }
    ]
  }
}
```

---

## Testing

1. **Test persistence:**
   - Create conversation
   - Add messages
   - Reload VS Code
   - Verify conversation restored

2. **Test list:**
   - Create multiple conversations
   - See them in sidebar
   - Sorted by recent

3. **Test switching:**
   - Click conversation in sidebar
   - Chat loads that conversation

4. **Test delete:**
   - Delete conversation
   - Verify removed from list
   - Verify storage updated

---

**Build this for conversation persistence!** 💾
