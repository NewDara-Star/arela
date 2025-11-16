# EXTENSION-006: Chat Interface Layout

**Agent:** @codex  
**Priority:** High  
**Estimated Time:** 2-3 hours  
**Dependencies:** EXTENSION-005 (Svelte + WebView)

---

## Context

Build the core chat interface layout with message list, input area, and header. This provides the visual structure for the Arela chat experience.

---

## Requirements

### 1. Chat Layout Component

**Create:** `packages/extension/webview/components/ChatLayout.svelte`

**Structure:**
```
┌─────────────────────────────┐
│ Header (title, settings)    │
├─────────────────────────────┤
│                             │
│ Message List (scrollable)   │
│                             │
│                             │
├─────────────────────────────┤
│ Input Area (textarea + btn) │
└─────────────────────────────┘
```

**Features:**
- Header with "Arela" title and settings icon
- Scrollable message container (auto-scroll to bottom)
- Fixed input area at bottom
- Responsive layout (min-width: 300px)

### 2. Message List Component

**Create:** `packages/extension/webview/components/MessageList.svelte`

**Props:**
```typescript
interface Props {
  messages: Message[];
  isLoading?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

**Features:**
- Render list of messages
- Auto-scroll to bottom on new message
- Show loading indicator when `isLoading=true`
- Empty state: "Start a conversation..."

### 3. Input Component

**Create:** `packages/extension/webview/components/ChatInput.svelte`

**Props:**
```typescript
interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features:**
- Multi-line textarea (auto-resize, max 5 lines)
- Send button (disabled when empty or disabled prop)
- Keyboard shortcuts:
  - `Enter` → Send (if not empty)
  - `Shift+Enter` → New line
- Character count (optional, show if >500 chars)

### 4. Update App.svelte

**Replace placeholder with ChatLayout:**

```svelte
<script lang="ts">
  import ChatLayout from './components/ChatLayout.svelte';
  import { writable } from 'svelte/store';
  
  const messages = writable<Message[]>([]);
  
  function handleSend(content: string) {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    messages.update(m => [...m, newMessage]);
    
    // TODO: Send to server (EXTENSION-011)
  }
</script>

<ChatLayout {messages} onSend={handleSend} />
```

### 5. Styling

**Use VS Code CSS variables:**
```css
/* Colors */
--vscode-editor-background
--vscode-editor-foreground
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-list-hoverBackground

/* Typography */
--vscode-font-family
--vscode-font-size
--vscode-editor-font-family (for code)
```

**Layout:**
- Header: 48px height, border-bottom
- Message list: flex-grow, overflow-y: auto
- Input area: padding 12px, border-top
- Textarea: min-height 40px, max-height 120px

---

## Technical Details

### Component Structure

```
webview/
├── App.svelte (main entry)
├── components/
│   ├── ChatLayout.svelte (container)
│   ├── MessageList.svelte (message display)
│   ├── ChatInput.svelte (input + send)
│   └── Message.svelte (single message - EXTENSION-007)
└── stores/
    └── messages.ts (message state)
```

### Message Store

**Create:** `packages/extension/webview/stores/messages.ts`

```typescript
import { writable } from 'svelte/store';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export const messages = writable<Message[]>([]);

export function addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
  const newMessage: Message = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  messages.update(m => [...m, newMessage]);
  return newMessage;
}

export function clearMessages() {
  messages.set([]);
}
```

### Auto-scroll Logic

```typescript
import { onMount, afterUpdate } from 'svelte';

let messageContainer: HTMLDivElement;
let shouldAutoScroll = true;

function scrollToBottom() {
  if (shouldAutoScroll && messageContainer) {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }
}

function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = messageContainer;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
  shouldAutoScroll = isAtBottom;
}

afterUpdate(scrollToBottom);
```

---

## Acceptance Criteria

- [ ] ChatLayout component renders with header, message list, and input
- [ ] MessageList displays messages in order (oldest to newest)
- [ ] Auto-scroll works when new message added
- [ ] Auto-scroll stops when user scrolls up manually
- [ ] ChatInput textarea auto-resizes (1-5 lines)
- [ ] Send button disabled when input empty
- [ ] Enter key sends message, Shift+Enter adds new line
- [ ] Empty state shows "Start a conversation..."
- [ ] All components use VS Code theme colors
- [ ] Layout is responsive (works at 300px width)
- [ ] No console errors or warnings
- [ ] Bundle size < 15KB gzipped

---

## Testing

### Manual Test

1. **Launch Extension Development Host**
2. **Open Arela Chat** (`Cmd+Shift+A`)
3. **Verify Layout:**
   - Header shows "Arela"
   - Empty state shows
   - Input area at bottom
4. **Type message and send:**
   - Message appears in list
   - Input clears
   - Auto-scrolls to bottom
5. **Send multiple messages:**
   - All messages visible
   - Scroll works
6. **Test keyboard shortcuts:**
   - Enter sends
   - Shift+Enter adds line
7. **Test auto-scroll:**
   - Scroll up manually
   - Send new message
   - Should NOT auto-scroll
   - Scroll to bottom
   - Send message
   - Should auto-scroll

### Visual Test

- [ ] Matches VS Code theme (dark/light)
- [ ] No layout shifts
- [ ] Smooth scrolling
- [ ] Input resizes smoothly

---

## Files to Create

- `packages/extension/webview/components/ChatLayout.svelte`
- `packages/extension/webview/components/MessageList.svelte`
- `packages/extension/webview/components/ChatInput.svelte`
- `packages/extension/webview/stores/messages.ts`

## Files to Modify

- `packages/extension/webview/App.svelte` (use ChatLayout)

---

## Notes

- Keep components simple and focused
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- No external UI libraries (use native HTML/CSS)
- Accessibility: proper ARIA labels, keyboard navigation
- This ticket focuses on LAYOUT only, not message rendering (that's EXTENSION-007)

---

## Next Ticket

**EXTENSION-007:** Message rendering with markdown, code blocks, and syntax highlighting
