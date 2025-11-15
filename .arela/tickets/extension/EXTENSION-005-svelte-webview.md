# EXTENSION-005: Setup Svelte + WebView

**Category:** UI  
**Priority:** P0 (Blocking)  
**Estimated Time:** 6 hours  
**Assignee:** TBD  
**Status:** 🔴 Not Started

---

## Context

Setup Svelte for the WebView chat UI. Configure build pipeline to compile Svelte components into a single bundle that can be loaded in VS Code's WebView.

## Requirements

### Must Have
- [ ] Install Svelte and build tools
- [ ] Configure Rollup/Vite for WebView bundling
- [ ] Create WebView panel in extension
- [ ] Load compiled Svelte bundle in WebView
- [ ] Setup Content Security Policy (CSP)
- [ ] Handle WebView lifecycle (show/hide/dispose)
- [ ] Hot reload during development

### Should Have
- [ ] TypeScript support for Svelte
- [ ] Source maps for debugging
- [ ] CSS scoping
- [ ] Icon/asset loading via webview.asWebviewUri

### Nice to Have
- [ ] Svelte DevTools integration
- [ ] Component library (shadcn-svelte)
- [ ] Theme matching (VS Code theme → Svelte)

## Acceptance Criteria

- [ ] Svelte compiles without errors
- [ ] WebView panel opens with "Hello from Svelte"
- [ ] CSP is strict (no inline scripts/styles)
- [ ] Assets load correctly (icons, CSS)
- [ ] Hot reload works during development
- [ ] Bundle size < 50KB (gzipped)
- [ ] Works on all platforms

## Technical Details

### Svelte Setup

```bash
cd packages/extension
npm install --save-dev svelte @sveltejs/vite-plugin-svelte vite
npm install --save-dev @tsconfig/svelte typescript
```

### Vite Config

```typescript
// packages/extension/webview/vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: '../out/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.css',
      },
    },
  },
});
```

### WebView Provider

```typescript
// src/chat-provider.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class ChatProvider {
  private panel: vscode.WebviewPanel | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  show() {
    if (this.panel) {
      this.panel.reveal();
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
      }
    );

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }

  private getHtml(): string {
    const webview = this.panel!.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview', 'bundle.js'))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview', 'bundle.css'))
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
```

### Svelte App

```svelte
<!-- webview/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let message = 'Hello from Svelte!';

  onMount(() => {
    console.log('Svelte app mounted');
  });
</script>

<main>
  <h1>{message}</h1>
  <p>Arela chat UI will go here.</p>
</main>

<style>
  main {
    padding: 1rem;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
  }

  h1 {
    color: var(--vscode-textLink-foreground);
  }
</style>
```

## Files to Create

- `packages/extension/webview/vite.config.ts`
- `packages/extension/webview/tsconfig.json`
- `packages/extension/webview/index.html`
- `packages/extension/webview/main.ts`
- `packages/extension/webview/App.svelte`
- `packages/extension/src/chat-provider.ts`

## Dependencies

- **Blocks:** EXTENSION-006 (chat UI components)
- **Blocked by:** EXTENSION-001 (monorepo setup)

## Testing

### Manual Test
1. Run `npm run build` in extension package
2. Activate extension
3. Run command "Arela: Open Chat"
4. Verify WebView opens with "Hello from Svelte"
5. Check browser console (no CSP violations)
6. Verify VS Code theme colors applied

### Unit Tests
- [ ] Test WebView creation
- [ ] Test HTML generation
- [ ] Test CSP nonce generation
- [ ] Test asset URI conversion

## Documentation

- Document Svelte setup in README
- Add development workflow (hot reload)
- Document CSP requirements

## Notes

- Use `var(--vscode-*)` CSS variables for theming
- CSP must be strict (no `unsafe-eval`, no inline scripts without nonce)
- Bundle size matters - keep it small
- Use `webview.asWebviewUri()` for all local resources
- Svelte compiles to vanilla JS - no runtime overhead

## Related

- Architecture Decision: Section 4.1.4 "Svelte Sweet Spot"
- Validation: "WebView Security" gotcha
