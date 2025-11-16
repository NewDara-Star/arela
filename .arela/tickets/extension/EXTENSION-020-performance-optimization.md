# EXTENSION-020: Performance Optimization

**Category:** Performance  
**Priority:** P2  
**Estimated Time:** 4h  
**Agent:** @claude  
**Status:** 🔴 Not Started

---

## Context

As the extension grows, we need to ensure it remains fast and efficient. This includes:
- Bundle size optimization
- Lazy loading
- Caching strategies
- Memory management
- Startup time optimization

**Current state:**
- ✅ Webview bundle: 44.24 KB gzipped
- ✅ Extension builds fast
- ❌ No lazy loading
- ❌ No caching
- ❌ No performance monitoring

**Goal:** Optimize for speed, memory, and bundle size.

---

## Requirements

### Must Have
- [ ] Lazy load heavy dependencies
- [ ] Cache AI responses
- [ ] Optimize webview bundle
- [ ] Reduce extension activation time
- [ ] Memory leak prevention

### Should Have
- [ ] Code splitting for webview
- [ ] Virtual scrolling for long conversations
- [ ] Debounced operations
- [ ] Performance monitoring

### Nice to Have
- [ ] Service worker for offline
- [ ] IndexedDB for large data
- [ ] Web Workers for heavy computation
- [ ] Performance budgets in CI

---

## Acceptance Criteria

- [ ] Webview bundle < 50 KB gzipped
- [ ] Extension activation < 500ms
- [ ] Chat opens < 200ms
- [ ] No memory leaks
- [ ] Smooth 60fps scrolling
- [ ] AI response cache hit rate > 50%

---

## Technical Details

### 1. Lazy Loading

```typescript
// packages/extension/src/extension.ts

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Arela] Extension activating...');
  
  // Register commands immediately (fast)
  const openChatCommand = vscode.commands.registerCommand('arela.openChat', async () => {
    // Lazy load ChatProvider only when needed
    const { ChatProvider } = await import('./chat-provider');
    const chatProvider = new ChatProvider(context);
    chatProvider.show();
  });
  
  context.subscriptions.push(openChatCommand);
  
  // Don't start server until chat is opened
  // This makes activation instant
}
```

### 2. Response Caching

```typescript
// packages/extension/src/cache/response-cache.ts

export class ResponseCache {
  private cache = new Map<string, CachedResponse>();
  private readonly MAX_SIZE = 100;
  private readonly TTL = 1000 * 60 * 60; // 1 hour
  
  private getCacheKey(messages: Message[]): string {
    return JSON.stringify(messages);
  }
  
  get(messages: Message[]): string | null {
    const key = this.getCacheKey(messages);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.response;
  }
  
  set(messages: Message[], response: string) {
    const key = this.getCacheKey(messages);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

interface CachedResponse {
  response: string;
  timestamp: number;
}
```

### 3. Webview Code Splitting

```typescript
// packages/extension/webview/main.ts

import { mount } from 'svelte';

// Lazy load components
async function initChat() {
  const { default: App } = await import('./App.svelte');
  mount(App, { target: document.body });
}

// Only load when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}
```

### 4. Virtual Scrolling

```svelte
<!-- packages/extension/webview/components/VirtualMessageList.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChatMessage } from '../types';
  
  let { messages = [] }: { messages: ChatMessage[] } = $props();
  
  let containerHeight = $state(600);
  let scrollTop = $state(0);
  let itemHeight = 100; // Average message height
  
  // Calculate visible range
  let visibleStart = $derived(Math.floor(scrollTop / itemHeight));
  let visibleEnd = $derived(Math.ceil((scrollTop + containerHeight) / itemHeight));
  let visibleMessages = $derived(messages.slice(visibleStart, visibleEnd + 1));
  
  // Padding for smooth scrolling
  let paddingTop = $derived(visibleStart * itemHeight);
  let paddingBottom = $derived((messages.length - visibleEnd - 1) * itemHeight);
  
  function handleScroll(e: Event) {
    scrollTop = (e.target as HTMLElement).scrollTop;
  }
</script>

<div
  class="virtual-list"
  style="height: {containerHeight}px; overflow-y: auto;"
  onscroll={handleScroll}
>
  <div style="padding-top: {paddingTop}px; padding-bottom: {paddingBottom}px;">
    {#each visibleMessages as message}
      <Message {message} />
    {/each}
  </div>
</div>
```

### 5. Debouncing

```typescript
// packages/extension/src/utils/debounce.ts

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage
const debouncedSendSelection = debounce((selection: SelectionContext) => {
  this.panel?.webview.postMessage({
    type: 'selectionChanged',
    selection,
  });
}, 300);
```

### 6. Memory Management

```typescript
// packages/extension/src/chat-provider.ts

export class ChatProvider {
  private disposables: vscode.Disposable[] = [];
  
  dispose() {
    // Clean up all subscriptions
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    // Close panel
    this.panel?.dispose();
    this.panel = null;
    
    // Clear caches
    this.responseCache?.clear();
  }
  
  show() {
    // ... create panel ...
    
    // Track disposables
    this.panel.onDidDispose(() => {
      this.dispose();
    });
    
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(this.handleSelectionChange),
      vscode.window.onDidChangeActiveTextEditor(this.handleEditorChange)
    );
  }
}
```

### 7. Bundle Analysis

```json
// packages/extension/webview/package.json

{
  "scripts": {
    "build": "vite build",
    "analyze": "vite build --mode analyze",
    "size": "size-limit"
  },
  "devDependencies": {
    "rollup-plugin-visualizer": "^5.12.0",
    "size-limit": "^11.0.0",
    "@size-limit/preset-small-lib": "^11.0.0"
  },
  "size-limit": [
    {
      "path": "../out/webview/bundle.js",
      "limit": "50 KB",
      "gzip": true
    }
  ]
}
```

### 8. Performance Monitoring

```typescript
// packages/extension/src/telemetry/performance.ts

export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  start(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.record(label, duration);
    };
  }
  
  record(label: string, duration: number) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const measurements = this.metrics.get(label)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  getStats(label: string) {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) return null;
    
    const sorted = [...measurements].sort((a, b) => a - b);
    
    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  report() {
    console.log('[Arela] Performance Report:');
    
    for (const [label, _] of this.metrics) {
      const stats = this.getStats(label);
      if (stats) {
        console.log(`  ${label}:`, {
          avg: `${stats.avg.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          count: stats.count,
        });
      }
    }
  }
}

// Usage
const perfMon = new PerformanceMonitor();

const end = perfMon.start('chat.open');
// ... do work ...
end();
```

### 9. Optimization Checklist

```typescript
// Performance best practices

// ✅ DO:
- Lazy load heavy dependencies
- Cache expensive operations
- Debounce rapid events
- Use virtual scrolling for long lists
- Clean up subscriptions
- Monitor bundle size
- Profile memory usage

// ❌ DON'T:
- Load everything on activation
- Re-compute on every render
- Create new objects in loops
- Keep references to disposed objects
- Ignore bundle size warnings
- Skip performance testing
```

---

## Testing

### Performance Tests

```typescript
// packages/extension/src/__tests__/performance.test.ts

describe('Performance', () => {
  it('should activate in < 500ms', async () => {
    const start = performance.now();
    await activate(mockContext);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
  
  it('should open chat in < 200ms', async () => {
    const start = performance.now();
    await chatProvider.show();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
  
  it('should not leak memory', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and dispose 100 chat panels
    for (let i = 0; i < 100; i++) {
      const provider = new ChatProvider(mockContext);
      provider.show();
      provider.dispose();
    }
    
    // Force GC
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const leakMB = (finalMemory - initialMemory) / 1024 / 1024;
    
    expect(leakMB).toBeLessThan(10); // < 10MB leak
  });
});
```

---

## Metrics to Track

**Bundle Size:**
- Webview JS: < 50 KB gzipped
- Webview CSS: < 5 KB gzipped
- Total: < 55 KB gzipped

**Timing:**
- Extension activation: < 500ms
- Chat open: < 200ms
- Message send: < 100ms
- AI response start: < 1s

**Memory:**
- Extension baseline: < 50 MB
- Per chat panel: < 10 MB
- No leaks after 100 open/close cycles

**Cache:**
- Response cache hit rate: > 50%
- Cache size: < 100 entries
- Cache TTL: 1 hour

---

**Build this for blazing fast performance!** ⚡
