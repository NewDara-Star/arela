# EXTENSION-012: Workspace Context

**Category:** Context  
**Priority:** P1  
**Estimated Time:** 4h  
**Agent:** @codex  
**Status:** 🔴 Not Started

---

## Context

Users need to ask questions about their entire workspace, not just individual files. The extension should provide workspace-wide context including file structure, recent files, and workspace search capabilities.

**Current state:**
- ✅ File attachments work (manual)
- ✅ @ mentions work (manual)
- ✅ Code selection works (automatic)
- ❌ No workspace-wide context

**Goal:** Add workspace context commands and automatic workspace awareness.

---

## Requirements

### Must Have
- [ ] Command: "Arela: Add Workspace Context"
- [ ] Shows workspace file tree (up to 100 files)
- [ ] Lists recently opened files
- [ ] Includes workspace root path
- [ ] Excludes node_modules, .git, build folders
- [ ] Add workspace context pill in chat

### Should Have
- [ ] Filter by file type (e.g., only .ts files)
- [ ] Show file sizes
- [ ] Configurable exclusions
- [ ] Workspace search integration

### Nice to Have
- [ ] Dependency graph visualization
- [ ] Git status integration
- [ ] Project structure analysis

---

## Acceptance Criteria

- [ ] Command "Arela: Add Workspace Context" exists
- [ ] Running command adds workspace pill to chat
- [ ] Workspace context includes file tree
- [ ] Excludes common ignore patterns
- [ ] AI receives workspace structure in system prompt
- [ ] Workspace context can be removed
- [ ] Works with multi-root workspaces
- [ ] Performance: <1s for workspaces with <1000 files

---

## Technical Details

### 1. Workspace Context Type

```typescript
// packages/extension/src/types/chat.ts

export interface WorkspaceContext {
  rootPath: string;
  files: WorkspaceFile[];
  recentFiles: string[];
  totalFiles: number;
  truncated: boolean;
}

export interface WorkspaceFile {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface MessageContext {
  files?: FileAttachment[];
  selection?: SelectionContext;
  workspace?: WorkspaceContext;  // ← Add this
  mentions?: FileMention[];
}
```

### 2. Workspace Scanner

```typescript
// packages/extension/src/chat-provider.ts

private async getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return null;
  
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
  ];
  
  const fileUris = await vscode.workspace.findFiles(
    '**/*',
    `{${excludePatterns.join(',')}}`,
    MAX_FILES
  );
  
  for (const uri of fileUris) {
    const stat = await vscode.workspace.fs.stat(uri);
    const relativePath = vscode.workspace.asRelativePath(uri);
    
    files.push({
      path: relativePath,
      type: stat.type === vscode.FileType.Directory ? 'directory' : 'file',
      size: stat.size,
    });
  }
  
  // Get recently opened files
  const recentFiles = vscode.workspace.textDocuments
    .filter(doc => !doc.isUntitled)
    .slice(0, 10)
    .map(doc => vscode.workspace.asRelativePath(doc.uri));
  
  return {
    rootPath: workspaceFolder.uri.fsPath,
    files,
    recentFiles,
    totalFiles: files.length,
    truncated: fileUris.length >= MAX_FILES,
  };
}
```

### 3. Add Command

```typescript
// packages/extension/src/extension.ts

const addWorkspaceContextCommand = vscode.commands.registerCommand(
  'arela.addWorkspaceContext',
  async () => {
    if (!chatProvider) return;
    
    const workspace = await chatProvider.getWorkspaceContext();
    if (workspace) {
      chatProvider.sendWorkspaceContext(workspace);
    }
  }
);

context.subscriptions.push(addWorkspaceContextCommand);
```

### 4. WebView: Show Workspace Pill

```svelte
<!-- packages/extension/webview/components/ChatLayout.svelte -->

{#if workspace}
  <div class="context-pills">
    <div class="pill workspace-pill">
      <span class="icon">📁</span>
      <span class="text">
        Workspace ({workspace.totalFiles} files)
      </span>
      <button class="remove" onclick={removeWorkspace}>×</button>
    </div>
  </div>
{/if}
```

### 5. Include in System Prompt

```typescript
// packages/extension/src/chat-provider.ts

if (context.workspace) {
  const ws = context.workspace;
  systemContent += `Workspace: ${ws.rootPath}\n`;
  systemContent += `Files (${ws.totalFiles} total):\n`;
  
  // Group by directory
  const tree = buildFileTree(ws.files);
  systemContent += formatFileTree(tree);
  
  if (ws.recentFiles.length > 0) {
    systemContent += `\nRecently opened:\n`;
    ws.recentFiles.forEach(f => {
      systemContent += `- ${f}\n`;
    });
  }
  
  if (ws.truncated) {
    systemContent += `\n(List truncated to ${ws.files.length} files)\n`;
  }
  
  systemContent += '\n';
}
```

---

## Testing

1. **Test workspace context:**
   - Run "Arela: Add Workspace Context"
   - Workspace pill appears
   - Send message
   - AI receives file tree

2. **Test exclusions:**
   - Verify node_modules excluded
   - Verify .git excluded
   - Verify build folders excluded

3. **Test large workspace:**
   - Open workspace with >100 files
   - Verify truncation
   - Verify performance

---

**Build this to give AI workspace awareness!** 🗂️
