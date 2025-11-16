# EXTENSION-009: Streaming Responses

**Agent:** @codex  
**Priority:** High  
**Estimated Time:** 2-3 hours  
**Dependencies:** EXTENSION-007 (Message Rendering)

---

## Context

Implement token-by-token streaming for AI responses, providing real-time feedback as the AI generates text. This creates a better UX than waiting for the complete response.

---

## Requirements

### 1. Streaming Message Store

**Update:** `packages/extension/webview/stores/messages.ts`

**Add streaming state:**

```typescript
import { writable, derived } from 'svelte/store';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export const messages = writable<Message[]>([]);
export const streamingMessageId = writable<string | null>(null);

export function startStreaming(messageId: string) {
  streamingMessageId.set(messageId);
  messages.update(msgs => 
    msgs.map(m => 
      m.id === messageId ? { ...m, isStreaming: true } : m
    )
  );
}

export function appendToMessage(messageId: string, chunk: string) {
  messages.update(msgs =>
    msgs.map(m =>
      m.id === messageId
        ? { ...m, content: m.content + chunk }
        : m
    )
  );
}

export function stopStreaming(messageId: string) {
  streamingMessageId.set(null);
  messages.update(msgs =>
    msgs.map(m =>
      m.id === messageId ? { ...m, isStreaming: false } : m
    )
  );
}
```

### 2. WebView Message Handler

**Update:** `packages/extension/webview/App.svelte`

**Listen for streaming chunks:**

```typescript
import { messages, startStreaming, appendToMessage, stopStreaming } from './stores/messages';

onMount(() => {
  window.addEventListener('message', handleExtensionMessage);
  return () => window.removeEventListener('message', handleExtensionMessage);
});

function handleExtensionMessage(event: MessageEvent) {
  const message = event.data;
  
  switch (message.type) {
    case 'streamStart':
      handleStreamStart(message.messageId);
      break;
    case 'streamChunk':
      handleStreamChunk(message.messageId, message.chunk);
      break;
    case 'streamEnd':
      handleStreamEnd(message.messageId);
      break;
    case 'streamError':
      handleStreamError(message.messageId, message.error);
      break;
  }
}

function handleStreamStart(messageId: string) {
  // Add empty assistant message
  const newMessage: Message = {
    id: messageId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
  };
  messages.update(m => [...m, newMessage]);
  startStreaming(messageId);
}

function handleStreamChunk(messageId: string, chunk: string) {
  appendToMessage(messageId, chunk);
}

function handleStreamEnd(messageId: string) {
  stopStreaming(messageId);
}

function handleStreamError(messageId: string, error: string) {
  stopStreaming(messageId);
  appendToMessage(messageId, `\n\n**Error:** ${error}`);
}
```

### 3. Extension Streaming Handler

**Update:** `packages/extension/src/chat-provider.ts`

**Add streaming method:**

```typescript
private async handleSendMessage(content: string, context: MessageContext) {
  const messageId = crypto.randomUUID();
  
  // Notify webview that streaming is starting
  this.panel!.webview.postMessage({
    type: 'streamStart',
    messageId,
  });
  
  try {
    // TODO: Replace with actual AI provider call (EXTENSION-011)
    await this.mockStreamResponse(messageId, content);
  } catch (error) {
    this.panel!.webview.postMessage({
      type: 'streamError',
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

private async mockStreamResponse(messageId: string, prompt: string) {
  // Mock streaming response for testing
  const response = `This is a mock streaming response to: "${prompt}"\n\nHere's some **markdown** and a code block:\n\n\`\`\`typescript\nconst greeting = "Hello, world!";\nconsole.log(greeting);\n\`\`\`\n\nAnd some more text.`;
  
  // Stream character by character (for demo)
  for (let i = 0; i < response.length; i++) {
    this.panel!.webview.postMessage({
      type: 'streamChunk',
      messageId,
      chunk: response[i],
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  // End streaming
  this.panel!.webview.postMessage({
    type: 'streamEnd',
    messageId,
  });
}
```

### 4. Streaming Cursor Animation

**Update:** `packages/extension/webview/components/Message.svelte`

**Add cursor to streaming messages:**

```svelte
<script lang="ts">
  import { renderMarkdown } from '../lib/markdown';
  import type { Message } from '../stores/messages';
  
  interface Props {
    message: Message;
  }
  
  let { message }: Props = $props();
  
  const isUser = message.role === 'user';
  const isStreaming = $derived(message.isStreaming || false);
  
  // For streaming messages, render markdown incrementally
  const renderedContent = $derived(
    isUser 
      ? message.content 
      : isStreaming
        ? message.content // Show raw content while streaming
        : renderMarkdown(message.content) // Render markdown when done
  );
</script>

<div class="message message-{message.role}">
  {#if isUser}
    <div class="message-content">{message.content}</div>
  {:else}
    <div class="message-content">
      {#if isStreaming}
        {renderedContent}<span class="cursor">▊</span>
      {:else}
        {@html renderedContent}
      {/if}
    </div>
  {/if}
  <div class="message-timestamp">{relativeTime(message.timestamp)}</div>
</div>

<style>
  .cursor {
    display: inline-block;
    width: 8px;
    height: 1em;
    background: var(--vscode-textLink-foreground);
    animation: blink 1s infinite;
    margin-left: 2px;
  }
  
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
</style>
```

### 5. Auto-scroll During Streaming

**Update:** `packages/extension/webview/components/MessageList.svelte`

**Auto-scroll as content streams:**

```typescript
import { onMount, afterUpdate } from 'svelte';
import { streamingMessageId } from '../stores/messages';

let messageContainer: HTMLDivElement;
let shouldAutoScroll = true;

// Auto-scroll when streaming
$effect(() => {
  if ($streamingMessageId && shouldAutoScroll) {
    scrollToBottom();
  }
});

function scrollToBottom() {
  if (messageContainer) {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }
}

function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = messageContainer;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
  shouldAutoScroll = isAtBottom;
}
```

### 6. Stop Streaming Button

**Add to MessageList:**

```svelte
{#if $streamingMessageId}
  <div class="streaming-indicator">
    <span>AI is responding...</span>
    <button on:click={handleStopStreaming}>Stop</button>
  </div>
{/if}
```

**Stop handler:**

```typescript
function handleStopStreaming() {
  vscode.postMessage({
    type: 'stopStreaming',
    messageId: $streamingMessageId,
  });
}
```

**Extension handler:**

```typescript
private currentStreamController: AbortController | null = null;

private async handleSendMessage(content: string, context: MessageContext) {
  this.currentStreamController = new AbortController();
  const messageId = crypto.randomUUID();
  
  try {
    await this.streamResponse(messageId, content, this.currentStreamController.signal);
  } catch (error) {
    if (error.name === 'AbortError') {
      // Streaming was stopped by user
      this.panel!.webview.postMessage({
        type: 'streamEnd',
        messageId,
      });
    } else {
      // Actual error
      this.panel!.webview.postMessage({
        type: 'streamError',
        messageId,
        error: error.message,
      });
    }
  } finally {
    this.currentStreamController = null;
  }
}

private async handleStopStreaming(messageId: string) {
  if (this.currentStreamController) {
    this.currentStreamController.abort();
  }
}
```

---

## Technical Details

### Message Flow

```
User sends message
    ↓
Extension receives message
    ↓
Extension sends "streamStart" to webview
    ↓
Webview creates empty assistant message
    ↓
Extension streams chunks to webview
    ↓
Webview appends each chunk to message
    ↓
Extension sends "streamEnd"
    ↓
Webview stops streaming animation
    ↓
Webview renders final markdown
```

### Streaming Protocol

**Messages from Extension → WebView:**

```typescript
// Start streaming
{
  type: 'streamStart',
  messageId: string
}

// Stream chunk
{
  type: 'streamChunk',
  messageId: string,
  chunk: string
}

// End streaming
{
  type: 'streamEnd',
  messageId: string
}

// Error during streaming
{
  type: 'streamError',
  messageId: string,
  error: string
}
```

**Messages from WebView → Extension:**

```typescript
// Stop streaming
{
  type: 'stopStreaming',
  messageId: string
}
```

### Performance Optimization

**Batch small chunks:**

```typescript
private chunkBuffer = '';
private chunkTimer: NodeJS.Timeout | null = null;

private sendChunk(messageId: string, chunk: string) {
  this.chunkBuffer += chunk;
  
  if (this.chunkTimer) {
    clearTimeout(this.chunkTimer);
  }
  
  this.chunkTimer = setTimeout(() => {
    if (this.chunkBuffer) {
      this.panel!.webview.postMessage({
        type: 'streamChunk',
        messageId,
        chunk: this.chunkBuffer,
      });
      this.chunkBuffer = '';
    }
  }, 50); // Batch chunks every 50ms
}
```

---

## Acceptance Criteria

- [ ] Streaming starts when user sends message
- [ ] Empty assistant message appears immediately
- [ ] Chunks append to message in real-time
- [ ] Cursor blinks at end of streaming message
- [ ] Auto-scroll works during streaming
- [ ] Streaming stops when complete
- [ ] Final markdown renders after streaming ends
- [ ] Stop button appears during streaming
- [ ] Stop button cancels streaming
- [ ] Error messages display if streaming fails
- [ ] Multiple rapid messages queue correctly
- [ ] No memory leaks from streaming
- [ ] Smooth performance (no jank)

---

## Testing

### Manual Test

1. **Send a message:**
   - Type "Hello"
   - Click send
   - Empty assistant message appears
   - Text streams in character by character
   - Cursor blinks at end
   - Auto-scrolls as text appears

2. **Test stop button:**
   - Send a message
   - Click "Stop" mid-stream
   - Streaming stops
   - Partial message remains
   - No cursor

3. **Test markdown streaming:**
   - Send message that triggers markdown response
   - Raw markdown streams in
   - After streaming ends, markdown renders

4. **Test rapid messages:**
   - Send 3 messages quickly
   - All queue and stream in order
   - No overlap or corruption

5. **Test error handling:**
   - Simulate network error
   - Error message appears
   - Can send new message

### Performance Test

- [ ] Stream 10KB of text → Smooth, no lag
- [ ] Stream with auto-scroll → No jank
- [ ] Multiple concurrent streams → All work
- [ ] Memory usage stable during long stream

---

## Files to Create

- None (updates only)

## Files to Modify

- `packages/extension/webview/stores/messages.ts`
- `packages/extension/webview/App.svelte`
- `packages/extension/webview/components/Message.svelte`
- `packages/extension/webview/components/MessageList.svelte`
- `packages/extension/src/chat-provider.ts`

---

## Styling

```css
.streaming-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--vscode-inputValidation-infoBackground);
  border-left: 3px solid var(--vscode-inputValidation-infoBorder);
  margin: 8px 0;
  border-radius: 4px;
}

.streaming-indicator button {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  padding: 4px 12px;
  border-radius: 2px;
  cursor: pointer;
}

.streaming-indicator button:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}
```

---

## Next Ticket

**EXTENSION-010:** AI Provider Integration (OpenAI, Anthropic, Ollama)
