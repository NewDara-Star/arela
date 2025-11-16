# EXTENSION-008: Input Handling & Context Selection

**Agent:** @codex  
**Priority:** High  
**Estimated Time:** 3-4 hours  
**Dependencies:** EXTENSION-006 (Chat Interface)

---

## Context

Enhance the chat input with file attachments, code selection context, and @ mentions for workspace files. This allows users to provide context to the AI.

---

## Requirements

### 1. Enhanced Input Component

**Update:** `packages/extension/webview/components/ChatInput.svelte`

**New features:**
- Attach files button
- Show attached files as chips
- @ mention autocomplete for workspace files
- Context pills (selected code, open files)
- Character count (show when >1000 chars)

**Props:**
```typescript
interface Props {
  onSend: (message: string, context: MessageContext) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface MessageContext {
  files?: AttachedFile[];
  selection?: CodeSelection;
  mentions?: FileMention[];
}

interface AttachedFile {
  path: string;
  content: string;
  language: string;
}

interface CodeSelection {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
}

interface FileMention {
  path: string;
  type: 'file' | 'folder';
}
```

### 2. File Attachment

**Add attach button:**
```svelte
<button class="attach-btn" on:click={handleAttach} title="Attach file">
  📎
</button>
```

**Attach handler:**
```typescript
async function handleAttach() {
  // Send message to extension to open file picker
  vscode.postMessage({
    type: 'attachFile',
  });
}

// Listen for attached file from extension
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'fileAttached') {
    attachedFiles = [...attachedFiles, message.file];
  }
});
```

**Show attached files:**
```svelte
{#if attachedFiles.length > 0}
  <div class="attached-files">
    {#each attachedFiles as file}
      <div class="file-chip">
        <span class="file-name">{file.path}</span>
        <button on:click={() => removeFile(file)}>×</button>
      </div>
    {/each}
  </div>
{/if}
```

### 3. @ Mention Autocomplete

**Trigger on @ character:**

```typescript
let showMentions = $state(false);
let mentionQuery = $state('');
let mentionResults = $state<FileMention[]>([]);

function handleInput(e: InputEvent) {
  const value = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Check if @ was just typed
  const beforeCursor = value.slice(0, cursorPos);
  const match = beforeCursor.match(/@(\w*)$/);
  
  if (match) {
    showMentions = true;
    mentionQuery = match[1];
    searchFiles(mentionQuery);
  } else {
    showMentions = false;
  }
}

async function searchFiles(query: string) {
  // Send message to extension to search workspace files
  vscode.postMessage({
    type: 'searchFiles',
    query,
  });
}

// Listen for search results
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'fileSearchResults') {
    mentionResults = message.results;
  }
});
```

**Show autocomplete dropdown:**
```svelte
{#if showMentions}
  <div class="mention-dropdown">
    {#each mentionResults as result}
      <button 
        class="mention-item"
        on:click={() => selectMention(result)}
      >
        <span class="icon">{result.type === 'file' ? '📄' : '📁'}</span>
        <span class="path">{result.path}</span>
      </button>
    {/each}
  </div>
{/if}
```

### 4. Context Pills

**Show current context:**

```svelte
<div class="context-pills">
  {#if selection}
    <div class="pill pill-selection">
      <span>📍 {selection.file}:{selection.startLine}-{selection.endLine}</span>
      <button on:click={() => selection = null}>×</button>
    </div>
  {/if}
  
  {#each mentions as mention}
    <div class="pill pill-mention">
      <span>📄 {mention.path}</span>
      <button on:click={() => removeMention(mention)}>×</button>
    </div>
  {/each}
</div>
```

### 5. Extension Message Handlers

**Update:** `packages/extension/src/chat-provider.ts`

**Add message handlers:**

```typescript
private setupMessageHandlers() {
  this.panel!.webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'attachFile':
        await this.handleAttachFile();
        break;
      case 'searchFiles':
        await this.handleSearchFiles(message.query);
        break;
      case 'sendMessage':
        await this.handleSendMessage(message.content, message.context);
        break;
    }
  });
}

private async handleAttachFile() {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Attach',
    filters: {
      'Code files': ['ts', 'js', 'py', 'go', 'rs', 'java', 'cpp', 'c'],
      'All files': ['*'],
    },
  });
  
  if (uris && uris.length > 0) {
    const uri = uris[0];
    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString('utf8');
    const language = this.detectLanguage(uri.fsPath);
    
    this.panel!.webview.postMessage({
      type: 'fileAttached',
      file: {
        path: vscode.workspace.asRelativePath(uri),
        content: text,
        language,
      },
    });
  }
}

private async handleSearchFiles(query: string) {
  const files = await vscode.workspace.findFiles(
    `**/*${query}*`,
    '**/node_modules/**',
    20
  );
  
  const results = files.map(uri => ({
    path: vscode.workspace.asRelativePath(uri),
    type: 'file' as const,
  }));
  
  this.panel!.webview.postMessage({
    type: 'fileSearchResults',
    results,
  });
}
```

### 6. Send with Context

**Update send handler:**

```typescript
function handleSend() {
  if (!input.trim() && attachedFiles.length === 0) return;
  
  const context: MessageContext = {
    files: attachedFiles.length > 0 ? attachedFiles : undefined,
    selection: selection || undefined,
    mentions: mentions.length > 0 ? mentions : undefined,
  };
  
  vscode.postMessage({
    type: 'sendMessage',
    content: input,
    context,
  });
  
  // Clear input and context
  input = '';
  attachedFiles = [];
  selection = null;
  mentions = [];
}
```

---

## Technical Details

### VS Code API Integration

**WebView → Extension communication:**

```typescript
// In webview
const vscode = acquireVsCodeApi();

vscode.postMessage({
  type: 'attachFile',
});

window.addEventListener('message', (event) => {
  const message = event.data;
  // Handle messages from extension
});
```

**Extension → WebView communication:**

```typescript
// In extension
this.panel.webview.postMessage({
  type: 'fileAttached',
  file: { ... },
});
```

### File Search

Use VS Code's `findFiles` API:

```typescript
const files = await vscode.workspace.findFiles(
  pattern,    // glob pattern
  exclude,    // exclude pattern
  maxResults  // limit results
);
```

### Language Detection

```typescript
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  const langMap: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    // ... more mappings
  };
  return langMap[ext] || ext;
}
```

---

## Acceptance Criteria

- [ ] Attach button opens file picker
- [ ] Selected file shows as chip with remove button
- [ ] Multiple files can be attached
- [ ] @ character triggers file search autocomplete
- [ ] Autocomplete shows matching workspace files
- [ ] Selecting autocomplete inserts file mention
- [ ] File mentions show as pills
- [ ] Context pills can be removed individually
- [ ] Send button includes all context
- [ ] Character count shows when >1000 chars
- [ ] Input clears after send
- [ ] Context clears after send
- [ ] Keyboard navigation in autocomplete (up/down/enter)
- [ ] Escape closes autocomplete

---

## Testing

### Manual Test

1. **Test file attachment:**
   - Click attach button
   - Select a file
   - File chip appears
   - Click × to remove
   - File chip disappears

2. **Test @ mentions:**
   - Type `@` in input
   - Autocomplete appears
   - Type `test`
   - Results filter
   - Click a result
   - Mention inserted

3. **Test send with context:**
   - Attach a file
   - Add a mention
   - Type message
   - Click send
   - Check console for context object

4. **Test keyboard shortcuts:**
   - In autocomplete, press ↓
   - Selection moves down
   - Press Enter
   - Mention inserted
   - Press Escape
   - Autocomplete closes

### Edge Cases

- [ ] Empty input with no context → Send disabled
- [ ] Empty input with context → Send enabled
- [ ] Very long file name → Truncated in chip
- [ ] No search results → Show "No files found"
- [ ] @ at end of word → No autocomplete

---

## Files to Create

- None (updates only)

## Files to Modify

- `packages/extension/webview/components/ChatInput.svelte`
- `packages/extension/src/chat-provider.ts`

---

## Styling

```css
.attached-files {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.mention-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
}

.mention-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.context-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.pill-selection {
  background: var(--vscode-textLink-foreground);
  color: var(--vscode-editor-background);
}

.pill-mention {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}
```

---

## Next Ticket

**EXTENSION-009:** Streaming responses with token-by-token rendering
