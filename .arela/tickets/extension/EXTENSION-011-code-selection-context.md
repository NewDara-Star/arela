# EXTENSION-011: Code Selection Context

**Category:** Context  
**Priority:** P1  
**Estimated Time:** 4h  
**Agent:** @codex  
**Status:** 🔴 Not Started

---

## Context

Users often want to ask questions about code they're currently viewing or have selected. The extension should automatically include the active editor's selection (or full file if nothing is selected) as context in AI requests.

**Current state:**
- ✅ File attachments work (manual)
- ✅ @ mentions work (manual)
- ❌ No automatic context from active editor

**Goal:** Automatically include selected code or active file in AI context.

---

## Requirements

### Must Have
- [ ] Detect when user has code selected in active editor
- [ ] Include selection in AI context automatically
- [ ] Show selection context in chat UI (as a pill/badge)
- [ ] Include file path, language, and line numbers
- [ ] Handle no selection (use full file with size limit)
- [ ] Add "Use Selection" toggle in input area

### Should Have
- [ ] Show selection preview in chat input
- [ ] Allow removing selection context before sending
- [ ] Handle multiple cursors/selections
- [ ] Limit selection size (max 10,000 chars)

### Nice to Have
- [ ] Syntax highlighting in selection preview
- [ ] Smart selection expansion (expand to function/class)
- [ ] Selection history (last 5 selections)

---

## Acceptance Criteria

- [ ] When code is selected, "Use Selection" toggle appears
- [ ] Toggle is ON by default if selection exists
- [ ] Selection context shown as pill in input area
- [ ] AI receives selection in system prompt
- [ ] Selection includes file path, language, line numbers
- [ ] Works with TypeScript, JavaScript, Python, etc.
- [ ] No selection = no automatic context (or full file if toggle ON)
- [ ] Selection can be removed before sending
- [ ] Large selections are truncated with warning

---

## Technical Details

### 1. Detect Active Selection

**Extension side:**

```typescript
// packages/extension/src/chat-provider.ts

private getActiveSelection(): SelectionContext | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  
  const selection = editor.selection;
  if (selection.isEmpty) return null;
  
  const selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) return null;
  
  return {
    file: editor.document.uri.fsPath,
    language: editor.document.languageId,
    startLine: selection.start.line + 1,
    endLine: selection.end.line + 1,
    code: selectedText,
  };
}
```

### 2. Update Message Context Type

**Add to shared types:**

```typescript
// packages/extension/src/types/chat.ts

export interface SelectionContext {
  file: string;
  language: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface MessageContext {
  files?: FileAttachment[];
  selection?: SelectionContext;  // ← Add this
  mentions?: FileMention[];
}
```

### 3. WebView: Show Selection Badge

**Update ChatLayout to show selection:**

```svelte
<!-- packages/extension/webview/components/ChatLayout.svelte -->

<script lang="ts">
  import type { SelectionContext } from '../types';
  
  let selection = $state<SelectionContext | null>(null);
  let useSelection = $state(true);
  
  // Listen for selection updates from extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'selectionChanged') {
      selection = message.selection;
      useSelection = !!selection; // Auto-enable if selection exists
    }
  });
  
  function removeSelection() {
    useSelection = false;
  }
</script>

<div class="input-area">
  {#if selection && useSelection}
    <div class="context-pills">
      <div class="pill selection-pill">
        <span class="icon">📝</span>
        <span class="text">
          {selection.file.split('/').pop()} 
          (lines {selection.startLine}-{selection.endLine})
        </span>
        <button class="remove" onclick={removeSelection}>×</button>
      </div>
    </div>
  {/if}
  
  <textarea bind:value={content} placeholder="Ask about your code..." />
  
  {#if selection}
    <label class="toggle">
      <input type="checkbox" bind:checked={useSelection} />
      Use Selection
    </label>
  {/if}
</div>

<style>
  .context-pills {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  
  .pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 12px;
    font-size: 12px;
  }
  
  .selection-pill {
    background: var(--vscode-inputValidation-infoBorder);
  }
  
  .pill .remove {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0 4px;
    font-size: 16px;
    line-height: 1;
  }
  
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
  }
</style>
```

### 4. Extension: Send Selection Updates

**Watch for selection changes:**

```typescript
// packages/extension/src/chat-provider.ts

private setupSelectionWatcher() {
  // Send initial selection
  this.sendSelectionUpdate();
  
  // Watch for selection changes
  vscode.window.onDidChangeTextEditorSelection(() => {
    this.sendSelectionUpdate();
  });
  
  // Watch for active editor changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    this.sendSelectionUpdate();
  });
}

private sendSelectionUpdate() {
  if (!this.panel) return;
  
  const selection = this.getActiveSelection();
  this.panel.webview.postMessage({
    type: 'selectionChanged',
    selection,
  });
}
```

### 5. Include Selection in AI Request

**Update buildMessages to include selection:**

```typescript
// packages/extension/src/chat-provider.ts

private buildMessages(content: string, context: MessageContext): Message[] {
  const messages: Message[] = [];
  
  let systemContent = 'You are Arela, an AI coding assistant.\n\n';
  
  // Add selection context
  if (context.selection) {
    const sel = context.selection;
    systemContent += `Selected code from ${sel.file} (lines ${sel.startLine}-${sel.endLine}):\n`;
    systemContent += `\`\`\`${sel.language}\n${sel.code}\n\`\`\`\n\n`;
  }
  
  // Add file attachments
  if (context.files) {
    systemContent += 'Attached files:\n';
    for (const file of context.files) {
      systemContent += `\n${file.path}:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
    }
  }
  
  // Add mentions
  if (context.mentions) {
    systemContent += `\nMentioned files:\n`;
    for (const mention of context.mentions) {
      systemContent += `- ${mention.path}\n`;
    }
  }
  
  messages.push({
    role: 'system',
    content: systemContent,
  });
  
  messages.push({
    role: 'user',
    content,
  });
  
  return messages;
}
```

### 6. Handle Large Selections

**Truncate if too large:**

```typescript
private getActiveSelection(): SelectionContext | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  
  const selection = editor.selection;
  if (selection.isEmpty) return null;
  
  let selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) return null;
  
  const MAX_CHARS = 10000;
  let truncated = false;
  
  if (selectedText.length > MAX_CHARS) {
    selectedText = selectedText.substring(0, MAX_CHARS);
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
```

---

## Files to Modify

1. `packages/extension/src/types/chat.ts`
   - Add `SelectionContext` interface
   - Update `MessageContext` to include `selection`

2. `packages/extension/src/chat-provider.ts`
   - Add `getActiveSelection()` method
   - Add `setupSelectionWatcher()` method
   - Add `sendSelectionUpdate()` method
   - Update `buildMessages()` to include selection
   - Call `setupSelectionWatcher()` in constructor

3. `packages/extension/webview/components/ChatLayout.svelte`
   - Add selection state
   - Add `useSelection` toggle
   - Show selection pill
   - Listen for `selectionChanged` messages
   - Include selection in `sendMessage` context

4. `packages/extension/webview/App.svelte`
   - Pass selection context to `ChatLayout`

---

## Testing

### Manual Test

1. **Build:**
   ```bash
   npm run build --workspace arela-extension
   ```

2. **Launch Extension Development Host**

3. **Test basic selection:**
   - [ ] Open a TypeScript file
   - [ ] Select 5-10 lines of code
   - [ ] Open Arela Chat (`Cmd+Shift+A`)
   - [ ] See selection pill appear
   - [ ] Pill shows filename and line numbers
   - [ ] Toggle "Use Selection" is ON

4. **Test sending with selection:**
   - [ ] Type: "Explain this code"
   - [ ] Send message
   - [ ] AI response references the selected code
   - [ ] Response is relevant to selection

5. **Test removing selection:**
   - [ ] Click × on selection pill
   - [ ] Pill disappears
   - [ ] Send message
   - [ ] AI doesn't receive selection context

6. **Test toggle:**
   - [ ] Select code
   - [ ] Uncheck "Use Selection" toggle
   - [ ] Selection pill grays out or hides
   - [ ] Send message
   - [ ] AI doesn't receive selection

7. **Test no selection:**
   - [ ] Clear selection (click elsewhere)
   - [ ] Open chat
   - [ ] No selection pill
   - [ ] No toggle
   - [ ] Chat works normally

8. **Test selection changes:**
   - [ ] Open chat with selection
   - [ ] Change selection in editor
   - [ ] Pill updates automatically
   - [ ] Shows new filename/lines

9. **Test large selection:**
   - [ ] Select entire large file (>10,000 chars)
   - [ ] See truncation warning
   - [ ] AI receives truncated version

10. **Test multiple file types:**
    - [ ] Test with .ts, .js, .py, .md files
    - [ ] Language detected correctly
    - [ ] Syntax in system prompt correct

---

## Acceptance Checklist

- [ ] Selection automatically detected
- [ ] Selection pill shows in chat input
- [ ] Pill shows filename and line range
- [ ] "Use Selection" toggle works
- [ ] Selection can be removed
- [ ] AI receives selection in system prompt
- [ ] Selection updates when editor selection changes
- [ ] Works with all file types
- [ ] Large selections truncated
- [ ] No selection = no pill/toggle

---

## Notes

**Size limits:**
- Max selection: 10,000 characters
- If exceeded, truncate and show warning

**Performance:**
- Don't send selection on every keystroke
- Debounce selection updates (300ms)

**UX:**
- Auto-enable toggle if selection exists
- Make it easy to disable
- Clear visual feedback

**Future enhancements (not in this ticket):**
- Smart expansion (select function/class)
- Selection history
- Multiple selections
- Diff view for before/after

---

## Related

- EXTENSION-008: Input Handling (file attachments, mentions)
- EXTENSION-010: AI Provider Integration (system prompts)
- EXTENSION-012: Workspace Context (next ticket)

---

**Ready to implement!** 🚀
