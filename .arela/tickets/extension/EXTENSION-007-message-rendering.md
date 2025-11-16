# EXTENSION-007: Message Rendering with Markdown

**Agent:** @codex  
**Priority:** High  
**Estimated Time:** 3-4 hours  
**Dependencies:** EXTENSION-006 (Chat Interface)

---

## Context

Render chat messages with rich formatting: markdown, code blocks with syntax highlighting, inline code, links, and lists. This makes AI responses readable and professional.

---

## Requirements

### 1. Message Component

**Create:** `packages/extension/webview/components/Message.svelte`

**Props:**
```typescript
interface Props {
  message: Message;
  isStreaming?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

**Features:**
- Different styling for user vs assistant messages
- Markdown rendering for assistant messages
- Plain text for user messages (with line breaks)
- Timestamp (relative: "just now", "2m ago", "1h ago")
- Streaming cursor animation (if `isStreaming=true`)

### 2. Markdown Rendering

**Install:** `marked` (markdown parser)

```bash
npm install --save marked
npm install --save-dev @types/marked
```

**Features to support:**
- **Headings:** `# H1`, `## H2`, etc.
- **Bold:** `**bold**`
- **Italic:** `*italic*`
- **Inline code:** `` `code` ``
- **Code blocks:** ` ```lang\ncode\n``` `
- **Links:** `[text](url)` (open in external browser)
- **Lists:** `- item` or `1. item`
- **Blockquotes:** `> quote`
- **Horizontal rules:** `---`

**Sanitization:**
- Disable HTML rendering (security)
- Allow only safe markdown
- Escape user input

### 3. Code Syntax Highlighting

**Install:** `highlight.js` (syntax highlighter)

```bash
npm install --save highlight.js
npm install --save-dev @types/highlight.js
```

**Supported languages:**
- JavaScript/TypeScript
- Python
- Go
- Rust
- Java
- C/C++
- Shell/Bash
- JSON
- YAML
- Markdown
- SQL
- HTML/CSS

**Features:**
- Auto-detect language if not specified
- Copy button on code blocks
- Line numbers (optional, for blocks >10 lines)
- VS Code theme colors for syntax

### 4. Message Styling

**User messages:**
```css
.message-user {
  background: var(--vscode-input-background);
  border-left: 3px solid var(--vscode-textLink-foreground);
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
}
```

**Assistant messages:**
```css
.message-assistant {
  background: transparent;
  padding: 12px 0;
  margin: 8px 0;
}

.message-assistant p {
  margin: 8px 0;
  line-height: 1.6;
}

.message-assistant code {
  background: var(--vscode-textCodeBlock-background);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.9em;
}

.message-assistant pre {
  background: var(--vscode-textCodeBlock-background);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 12px 0;
}
```

**Timestamp:**
```css
.message-timestamp {
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 4px;
}
```

### 5. Copy Code Button

**Add to code blocks:**

```svelte
<div class="code-block">
  <button class="copy-btn" on:click={() => copyCode(code)}>
    {copied ? 'Copied!' : 'Copy'}
  </button>
  <pre><code>{@html highlightedCode}</code></pre>
</div>
```

**Copy function:**
```typescript
async function copyCode(code: string) {
  await navigator.clipboard.writeText(code);
  copied = true;
  setTimeout(() => copied = false, 2000);
}
```

### 6. Streaming Cursor

**For streaming messages:**

```svelte
{#if isStreaming}
  <span class="cursor">▊</span>
{/if}
```

```css
.cursor {
  animation: blink 1s infinite;
  color: var(--vscode-textLink-foreground);
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
```

---

## Technical Details

### Markdown Parser Setup

**Create:** `packages/extension/webview/lib/markdown.ts`

```typescript
import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

// Disable HTML rendering for security
const renderer = new marked.Renderer();
renderer.html = () => '';

export function renderMarkdown(content: string): string {
  return marked(content, { renderer });
}
```

### Relative Timestamp

**Create:** `packages/extension/webview/lib/time.ts`

```typescript
export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
```

### Message Component Implementation

```svelte
<script lang="ts">
  import { renderMarkdown } from '../lib/markdown';
  import { relativeTime } from '../lib/time';
  import type { Message } from '../stores/messages';
  
  interface Props {
    message: Message;
    isStreaming?: boolean;
  }
  
  let { message, isStreaming = false }: Props = $props();
  
  const isUser = message.role === 'user';
  const renderedContent = $derived(
    isUser ? message.content : renderMarkdown(message.content)
  );
  const timestamp = $derived(relativeTime(message.timestamp));
</script>

<div class="message message-{message.role}">
  {#if isUser}
    <div class="message-content">{message.content}</div>
  {:else}
    <div class="message-content">
      {@html renderedContent}
      {#if isStreaming}
        <span class="cursor">▊</span>
      {/if}
    </div>
  {/if}
  <div class="message-timestamp">{timestamp}</div>
</div>

<style>
  /* Styles here */
</style>
```

---

## Acceptance Criteria

- [ ] Message component renders user and assistant messages differently
- [ ] Markdown renders correctly (headings, bold, italic, lists, etc.)
- [ ] Code blocks have syntax highlighting
- [ ] Inline code has background color
- [ ] Copy button appears on code blocks
- [ ] Copy button works (copies code to clipboard)
- [ ] Links open in external browser
- [ ] Timestamps show relative time ("2m ago")
- [ ] Streaming cursor animates when `isStreaming=true`
- [ ] No XSS vulnerabilities (HTML disabled)
- [ ] All styles use VS Code theme colors
- [ ] Code blocks use editor font
- [ ] Line breaks preserved in user messages
- [ ] Bundle size < 50KB gzipped (including highlight.js)

---

## Testing

### Manual Test

1. **Send user message:**
   ```
   Hello, can you help me with TypeScript?
   ```
   - Should show as plain text with border

2. **Mock assistant response:**
   ```markdown
   Sure! Here's a TypeScript example:
   
   ```typescript
   interface User {
     name: string;
     age: number;
   }
   
   const user: User = {
     name: "Alice",
     age: 30
   };
   ```
   
   You can also use **type** instead of **interface**.
   ```
   
   - Markdown should render
   - Code block should have syntax highlighting
   - Bold text should be bold
   - Copy button should appear

3. **Test copy button:**
   - Click "Copy" on code block
   - Should show "Copied!"
   - Paste in editor - code should match

4. **Test links:**
   ```markdown
   Check out [VS Code](https://code.visualstudio.com)
   ```
   - Link should be clickable
   - Should open in external browser

5. **Test streaming:**
   - Set `isStreaming=true` on a message
   - Cursor should blink

### Visual Test

- [ ] User messages have left border
- [ ] Assistant messages have no background
- [ ] Code blocks have background
- [ ] Syntax colors match VS Code theme
- [ ] Timestamps are subtle (gray)
- [ ] Copy button is visible on hover

---

## Files to Create

- `packages/extension/webview/components/Message.svelte`
- `packages/extension/webview/lib/markdown.ts`
- `packages/extension/webview/lib/time.ts`

## Files to Modify

- `packages/extension/webview/components/MessageList.svelte` (use Message component)
- `packages/extension/package.json` (add marked, highlight.js)

---

## Security Considerations

- **Disable HTML rendering** - Prevent XSS attacks
- **Sanitize links** - Only allow http/https
- **Escape user input** - Never render user content as HTML
- **CSP compliance** - Ensure highlight.js works with CSP

---

## Performance

- **Lazy load highlight.js** - Only load when first code block appears
- **Memoize markdown rendering** - Cache rendered content
- **Limit highlight.js languages** - Only bundle needed languages (~30KB)

---

## Next Ticket

**EXTENSION-008:** Input handling with file attachments and context selection
