# EXTENSION-013: Settings UI (Custom Webview)

**Category:** UI  
**Priority:** P2  
**Estimated Time:** 6h  
**Agent:** @claude  
**Status:** 🔴 Not Started

---

## Context

Currently, users configure the extension through VS Code's settings UI, which is functional but not ideal for complex AI provider configuration. A custom settings webview would provide better UX for:
- Selecting providers and models dynamically
- Managing API keys securely
- Testing connections
- Viewing usage statistics

**Current state:**
- ✅ Settings work via VS Code settings
- ✅ "Arela: Select AI Model" command for dynamic selection
- ❌ No visual settings panel
- ❌ No connection testing
- ❌ No usage tracking

**Goal:** Build a beautiful custom settings UI with provider cards, dynamic model selection, and connection testing.

---

## Requirements

### Must Have
- [ ] Command: "Arela: Open Settings"
- [ ] Custom webview with Svelte
- [ ] Provider cards (OpenAI, Anthropic, Ollama)
- [ ] Dynamic model dropdowns (fetched from server)
- [ ] API key input fields
- [ ] Save button
- [ ] Test connection button

### Should Have
- [ ] Usage statistics (tokens, cost)
- [ ] Model comparison table
- [ ] Provider status indicators
- [ ] Settings import/export

### Nice to Have
- [ ] Cost calculator
- [ ] Model performance benchmarks
- [ ] Custom provider support
- [ ] Settings sync across machines

---

## Acceptance Criteria

- [ ] "Arela: Open Settings" command opens custom webview
- [ ] Provider cards show available providers
- [ ] Clicking provider card expands configuration
- [ ] Model dropdown fetches from server dynamically
- [ ] API key fields are password-masked
- [ ] "Test Connection" validates API key
- [ ] "Save" button persists settings
- [ ] Settings sync with VS Code settings
- [ ] Beautiful UI matching VS Code theme

---

## Technical Details

### 1. Settings Webview Component

```svelte
<!-- packages/extension/webview/components/Settings.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  
  let providers = $state([
    { id: 'openai', name: 'OpenAI', icon: '🤖', enabled: false },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠', enabled: false },
    { id: 'ollama', name: 'Ollama', icon: '🏠', enabled: false },
  ]);
  
  let selectedProvider = $state('openai');
  let models = $state<string[]>([]);
  let selectedModel = $state('');
  let apiKey = $state('');
  let testing = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  
  async function fetchModels(provider: string) {
    // Fetch from extension
    vscode.postMessage({
      type: 'fetchModels',
      provider,
    });
  }
  
  async function testConnection() {
    testing = true;
    testResult = null;
    
    vscode.postMessage({
      type: 'testConnection',
      provider: selectedProvider,
      apiKey,
    });
  }
  
  function saveSettings() {
    vscode.postMessage({
      type: 'saveSettings',
      provider: selectedProvider,
      model: selectedModel,
      apiKey,
    });
  }
  
  onMount(() => {
    // Load current settings
    vscode.postMessage({ type: 'loadSettings' });
  });
</script>

<div class="settings">
  <h1>Arela Settings</h1>
  
  <section class="providers">
    <h2>AI Providers</h2>
    <div class="provider-cards">
      {#each providers as provider}
        <button
          class="provider-card"
          class:selected={selectedProvider === provider.id}
          onclick={() => {
            selectedProvider = provider.id;
            fetchModels(provider.id);
          }}
        >
          <span class="icon">{provider.icon}</span>
          <span class="name">{provider.name}</span>
          {#if provider.enabled}
            <span class="badge">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  </section>
  
  <section class="config">
    <h2>Configuration</h2>
    
    <div class="form-group">
      <label for="model">Model</label>
      <select id="model" bind:value={selectedModel}>
        {#each models as model}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label for="apiKey">API Key</label>
      <input
        id="apiKey"
        type="password"
        bind:value={apiKey}
        placeholder="sk-..."
      />
    </div>
    
    <div class="actions">
      <button
        class="test-btn"
        onclick={testConnection}
        disabled={testing || !apiKey}
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      
      {#if testResult === 'success'}
        <span class="success">✓ Connection successful</span>
      {/if}
      {#if testResult === 'error'}
        <span class="error">✗ Connection failed</span>
      {/if}
      
      <button class="save-btn" onclick={saveSettings}>
        Save Settings
      </button>
    </div>
  </section>
</div>

<style>
  .settings {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    font-size: 24px;
    margin-bottom: 32px;
    color: var(--vscode-foreground);
  }
  
  h2 {
    font-size: 16px;
    margin-bottom: 16px;
    color: var(--vscode-descriptionForeground);
  }
  
  .provider-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  
  .provider-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px;
    background: var(--vscode-editor-background);
    border: 2px solid var(--vscode-panel-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .provider-card:hover {
    border-color: var(--vscode-focusBorder);
  }
  
  .provider-card.selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
  }
  
  .provider-card .icon {
    font-size: 32px;
  }
  
  .provider-card .name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }
  
  select,
  input {
    width: 100%;
    padding: 8px 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 13px;
  }
  
  .actions {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 24px;
  }
  
  button {
    padding: 8px 16px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .success {
    color: var(--vscode-testing-iconPassed);
  }
  
  .error {
    color: var(--vscode-testing-iconFailed);
  }
</style>
```

### 2. Extension: Settings Provider

```typescript
// packages/extension/src/settings-provider.ts

export class SettingsProvider {
  private panel: vscode.WebviewPanel | null = null;
  
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly serverManager: ServerManager | null
  ) {}
  
  show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    
    this.panel = vscode.window.createWebviewPanel(
      'arelaSettings',
      'Arela Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    
    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage(this.handleMessage.bind(this));
    
    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }
  
  private async handleMessage(message: any) {
    switch (message.type) {
      case 'loadSettings':
        await this.sendCurrentSettings();
        break;
      case 'fetchModels':
        await this.fetchModels(message.provider);
        break;
      case 'testConnection':
        await this.testConnection(message.provider, message.apiKey);
        break;
      case 'saveSettings':
        await this.saveSettings(message);
        break;
    }
  }
  
  private async fetchModels(provider: string) {
    if (!this.serverManager) return;
    
    try {
      const models = await this.serverManager.sendRequest('listModels', { provider });
      this.panel?.webview.postMessage({
        type: 'modelsLoaded',
        models,
      });
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }
}
```

---

## Testing

1. **Test settings UI:**
   - Run "Arela: Open Settings"
   - Settings panel opens
   - Provider cards visible

2. **Test model selection:**
   - Click provider card
   - Models load dynamically
   - Can select model

3. **Test connection:**
   - Enter API key
   - Click "Test Connection"
   - See success/error message

4. **Test save:**
   - Change settings
   - Click "Save"
   - Settings persist

---

**Build this for beautiful settings UX!** ⚙️
