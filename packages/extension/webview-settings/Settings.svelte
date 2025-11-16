<script lang="ts">
  import { onMount } from 'svelte';

  interface Provider {
    id: string;
    name: string;
    icon: string;
    enabled: boolean;
  }

  let providers = $state<Provider[]>([
    { id: 'openai', name: 'OpenAI', icon: '🤖', enabled: false },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠', enabled: false },
    { id: 'ollama', name: 'Ollama', icon: '🏠', enabled: false },
  ]);

  let selectedProvider = $state('openai');
  let models = $state<string[]>([]);
  let selectedModel = $state('');
  let openaiKey = $state('');
  let anthropicKey = $state('');
  let openaiConfigured = $state(false);
  let anthropicConfigured = $state(false);
  let ollamaEnabled = $state(false);
  let ollamaBaseUrl = $state('http://localhost:11434');

  let testing = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  let testError = $state('');
  let saving = $state(false);

  const vscode = acquireVsCodeApi();

  onMount(() => {
    // Load current settings
    vscode.postMessage({ type: 'loadSettings' });

    // Listen for messages from extension
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  });

  function handleMessage(event: MessageEvent) {
    const message = event.data;

    switch (message.type) {
      case 'settingsLoaded':
        selectedProvider = message.settings.provider;
        selectedModel = message.settings.model;
        ollamaEnabled = message.settings.ollamaEnabled;
        ollamaBaseUrl = message.settings.ollamaBaseUrl;
        openaiConfigured = message.settings.hasOpenAIKey;
        anthropicConfigured = message.settings.hasAnthropicKey;

        // Update provider enabled status
        providers = providers.map(p => ({
          ...p,
          enabled:
            (p.id === 'openai' && message.settings.hasOpenAIKey) ||
            (p.id === 'anthropic' && message.settings.hasAnthropicKey) ||
            (p.id === 'ollama' && message.settings.ollamaEnabled)
        }));

        // Fetch models for selected provider
        fetchModels(selectedProvider);
        break;

      case 'modelsLoaded':
        if (message.provider === selectedProvider) {
          models = message.models;
          if (!selectedModel && models.length > 0) {
            selectedModel = models[0];
          }
        }
        break;

      case 'connectionTestResult':
        testing = false;
        testResult = message.success ? 'success' : 'error';
        testError = message.error || '';
        setTimeout(() => {
          testResult = null;
          testError = '';
        }, 3000);
        break;

      case 'settingsSaved':
        saving = false;
        openaiKey = '';
        anthropicKey = '';
        break;

      case 'error':
        console.error(message.message);
        break;
    }
  }

  function selectProvider(providerId: string) {
    selectedProvider = providerId;
    fetchModels(providerId);
  }

  function fetchModels(provider: string) {
    vscode.postMessage({
      type: 'fetchModels',
      provider,
    });
  }

  async function testConnection() {
    testing = true;
    testResult = null;
    testError = '';

    const enteredKey = selectedProvider === 'openai' ? openaiKey : anthropicKey;
    const apiKey = enteredKey.trim();

    vscode.postMessage({
      type: 'testConnection',
      provider: selectedProvider,
      apiKey,
    });
  }

  function saveSettings() {
    saving = true;

    const payload: Record<string, unknown> = {
      type: 'saveSettings',
      provider: selectedProvider,
      model: selectedModel,
      ollamaEnabled,
      ollamaBaseUrl,
    };

    const trimmedOpenaiKey = openaiKey.trim();
    if (trimmedOpenaiKey) {
      payload.openaiKey = trimmedOpenaiKey;
    }

    const trimmedAnthropicKey = anthropicKey.trim();
    if (trimmedAnthropicKey) {
      payload.anthropicKey = trimmedAnthropicKey;
    }

    vscode.postMessage(payload);
  }
</script>

<div class="settings">
  <header>
    <h1>Arela Settings</h1>
    <p>Configure your AI providers and models</p>
  </header>

  <section class="providers">
    <h2>AI Providers</h2>
    <div class="provider-cards">
      {#each providers as provider}
        <button
          class="provider-card"
          class:selected={selectedProvider === provider.id}
          class:enabled={provider.enabled}
          onclick={() => selectProvider(provider.id)}
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

    {#if selectedProvider === 'openai'}
      <div class="form-group">
        <div class="label-row">
          <label for="openai-key">OpenAI API Key</label>
          {#if openaiConfigured}
            <span class="configured-badge">✓ Configured</span>
          {/if}
        </div>
        <input
          id="openai-key"
          type="password"
          bind:value={openaiKey}
          placeholder="Enter new API key or leave blank to keep existing"
        />
        <span class="hint">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></span>
      </div>
    {/if}

    {#if selectedProvider === 'anthropic'}
      <div class="form-group">
        <div class="label-row">
          <label for="anthropic-key">Anthropic API Key</label>
          {#if anthropicConfigured}
            <span class="configured-badge">✓ Configured</span>
          {/if}
        </div>
        <input
          id="anthropic-key"
          type="password"
          bind:value={anthropicKey}
          placeholder="Enter new API key or leave blank to keep existing"
        />
        <span class="hint">Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></span>
      </div>
    {/if}

    {#if selectedProvider === 'ollama'}
      <div class="form-group">
        <label for="ollama-url">Ollama Base URL</label>
        <input
          id="ollama-url"
          type="text"
          bind:value={ollamaBaseUrl}
          placeholder="http://localhost:11434"
        />
        <span class="hint">Make sure Ollama is running locally</span>
      </div>

      <div class="form-group checkbox">
        <label>
          <input type="checkbox" bind:checked={ollamaEnabled} />
          Enable Ollama
        </label>
      </div>
    {/if}

    <div class="form-group">
      <label for="model">Model</label>
      <select id="model" bind:value={selectedModel}>
        {#if models.length === 0}
          <option>Loading models...</option>
        {:else}
          {#each models as model}
            <option value={model}>{model}</option>
          {/each}
        {/if}
      </select>
    </div>

    <div class="actions">
      {#if selectedProvider !== 'ollama'}
        <button
          class="test-btn"
          onclick={testConnection}
          disabled={
            testing ||
            (selectedProvider === 'openai' && !openaiKey.trim()) ||
            (selectedProvider === 'anthropic' && !anthropicKey.trim())
          }
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      {/if}

      {#if testResult === 'success'}
        <span class="success">✓ Connection successful</span>
      {/if}
      {#if testResult === 'error'}
        <span class="error">✗ {testError || 'Connection failed'}</span>
      {/if}

      <button class="save-btn" onclick={saveSettings} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </section>
</div>

<style>
  .settings {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    color: var(--vscode-foreground);
  }

  header {
    margin-bottom: 32px;
  }

  h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  header p {
    color: var(--vscode-descriptionForeground);
    margin: 0;
  }

  h2 {
    font-size: 16px;
    font-weight: 500;
    margin: 0 0 16px 0;
    color: var(--vscode-foreground);
  }

  section {
    margin-bottom: 32px;
  }

  .provider-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
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
    position: relative;
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

  .provider-card .badge {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--vscode-testing-iconPassed);
    font-size: 16px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group.checkbox {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .label-row label {
    margin-bottom: 0;
  }

  .configured-badge {
    font-size: 12px;
    color: var(--vscode-testing-iconPassed);
  }

  input[type="text"],
  input[type="password"],
  select {
    width: 100%;
    padding: 8px 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }

  input[type="text"]:focus,
  input[type="password"]:focus,
  select:focus {
    outline: 1px solid var(--vscode-focusBorder);
  }

  .hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .hint a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }

  .hint a:hover {
    text-decoration: underline;
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
    font-family: inherit;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .test-btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }

  .test-btn:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .success {
    color: var(--vscode-testing-iconPassed);
    font-size: 13px;
  }

  .error {
    color: var(--vscode-testing-iconFailed);
    font-size: 13px;
  }
</style>
