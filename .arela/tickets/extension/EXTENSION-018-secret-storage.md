# EXTENSION-018: Secure API Key Storage

**Category:** Security  
**Priority:** P1  
**Estimated Time:** 3h  
**Agent:** @codex  
**Status:** 🔴 Not Started

---

## Context

Currently, API keys are stored in VS Code settings as plain text, which is a security risk. VS Code provides a `SecretStorage` API for secure credential storage that:
- Encrypts secrets
- Uses OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Never exposes secrets in settings files
- Survives settings sync

**Current state:**
- ❌ API keys in plain text settings
- ❌ Keys visible in settings.json
- ❌ Keys sync across machines (security risk)

**Goal:** Migrate to VS Code SecretStorage API for secure key management.

---

## Requirements

### Must Have
- [ ] Migrate API keys to SecretStorage
- [ ] Remove keys from settings.json
- [ ] Prompt user to re-enter keys on first run
- [ ] Graceful migration from old storage
- [ ] Test connection with stored keys

### Should Have
- [ ] Key validation on save
- [ ] Clear all keys command
- [ ] Show key status (set/not set)
- [ ] Migration guide for users

### Nice to Have
- [ ] Key rotation reminders
- [ ] Multiple key profiles
- [ ] Team key sharing (via external service)

---

## Acceptance Criteria

- [ ] API keys stored in SecretStorage
- [ ] Keys not visible in settings.json
- [ ] Existing keys migrated automatically
- [ ] Connection works with stored keys
- [ ] Keys persist across VS Code restarts
- [ ] "Clear Keys" command works
- [ ] No security warnings

---

## Technical Details

### 1. SecretStorage API

```typescript
// packages/extension/src/secret-manager.ts

export class SecretManager {
  private static readonly KEYS = {
    OPENAI: 'arela.openai.apiKey',
    ANTHROPIC: 'arela.anthropic.apiKey',
  };
  
  constructor(private readonly context: vscode.ExtensionContext) {}
  
  async getOpenAIKey(): Promise<string | undefined> {
    return await this.context.secrets.get(SecretManager.KEYS.OPENAI);
  }
  
  async setOpenAIKey(key: string): Promise<void> {
    await this.context.secrets.store(SecretManager.KEYS.OPENAI, key);
  }
  
  async getAnthropicKey(): Promise<string | undefined> {
    return await this.context.secrets.get(SecretManager.KEYS.ANTHROPIC);
  }
  
  async setAnthropicKey(key: string): Promise<void> {
    await this.context.secrets.store(SecretManager.KEYS.ANTHROPIC, key);
  }
  
  async clearAllKeys(): Promise<void> {
    await this.context.secrets.delete(SecretManager.KEYS.OPENAI);
    await this.context.secrets.delete(SecretManager.KEYS.ANTHROPIC);
  }
  
  async hasOpenAIKey(): Promise<boolean> {
    const key = await this.getOpenAIKey();
    return !!key && key.length > 0;
  }
  
  async hasAnthropicKey(): Promise<boolean> {
    const key = await this.getAnthropicKey();
    return !!key && key.length > 0;
  }
}
```

### 2. Migration from Settings

```typescript
// packages/extension/src/extension.ts

async function migrateAPIKeys(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('arela');
  const secretManager = new SecretManager(context);
  
  // Migrate OpenAI key
  const openaiKey = config.get<string>('openai.apiKey');
  if (openaiKey && openaiKey.length > 0) {
    await secretManager.setOpenAIKey(openaiKey);
    await config.update('openai.apiKey', '', vscode.ConfigurationTarget.Global);
    console.log('[Arela] Migrated OpenAI key to SecretStorage');
  }
  
  // Migrate Anthropic key
  const anthropicKey = config.get<string>('anthropic.apiKey');
  if (anthropicKey && anthropicKey.length > 0) {
    await secretManager.setAnthropicKey(anthropicKey);
    await config.update('anthropic.apiKey', '', vscode.ConfigurationTarget.Global);
    console.log('[Arela] Migrated Anthropic key to SecretStorage');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Migrate keys on activation
  await migrateAPIKeys(context);
  
  // ... rest of activation
}
```

### 3. Update ServerManager to Use Secrets

```typescript
// packages/extension/src/server-manager.ts

private async getAIConfig() {
  const config = vscode.workspace.getConfiguration('arela');
  const secretManager = new SecretManager(this.context);
  
  return {
    defaultProvider: config.get<string>('provider') || undefined,
    defaultModel: config.get<string>('model') || undefined,
    openai: {
      apiKey: await secretManager.getOpenAIKey(),
    },
    anthropic: {
      apiKey: await secretManager.getAnthropicKey(),
    },
    ollama: {
      enabled: config.get<boolean>('ollama.enabled') ?? false,
      baseUrl: config.get<string>('ollama.baseUrl') || undefined,
    },
  };
}
```

### 4. Update Settings UI

```typescript
// packages/extension/src/settings-provider.ts

private async handleSaveSettings(message: any) {
  const secretManager = new SecretManager(this.context);
  
  // Save API keys to SecretStorage
  if (message.openaiKey) {
    await secretManager.setOpenAIKey(message.openaiKey);
  }
  
  if (message.anthropicKey) {
    await secretManager.setAnthropicKey(message.anthropicKey);
  }
  
  // Save other settings to config
  const config = vscode.workspace.getConfiguration('arela');
  await config.update('provider', message.provider, vscode.ConfigurationTarget.Global);
  await config.update('model', message.model, vscode.ConfigurationTarget.Global);
  
  vscode.window.showInformationMessage('Settings saved securely');
}

private async sendCurrentSettings() {
  const config = vscode.workspace.getConfiguration('arela');
  const secretManager = new SecretManager(this.context);
  
  this.panel?.webview.postMessage({
    type: 'settingsLoaded',
    settings: {
      provider: config.get('provider'),
      model: config.get('model'),
      hasOpenAIKey: await secretManager.hasOpenAIKey(),
      hasAnthropicKey: await secretManager.hasAnthropicKey(),
      // Don't send actual keys to webview!
    },
  });
}
```

### 5. Commands

```typescript
// packages/extension/src/extension.ts

const clearKeysCommand = vscode.commands.registerCommand('arela.clearKeys', async () => {
  const secretManager = new SecretManager(context);
  
  const confirm = await vscode.window.showWarningMessage(
    'Clear all stored API keys?',
    { modal: true },
    'Clear'
  );
  
  if (confirm === 'Clear') {
    await secretManager.clearAllKeys();
    vscode.window.showInformationMessage('All API keys cleared');
  }
});

context.subscriptions.push(clearKeysCommand);
```

### 6. Remove from package.json

```json
// packages/extension/package.json

{
  "contributes": {
    "configuration": {
      "properties": {
        // Remove these:
        // "arela.openai.apiKey": { ... },
        // "arela.anthropic.apiKey": { ... },
        
        // Keep these:
        "arela.provider": { ... },
        "arela.model": { ... },
        "arela.ollama.enabled": { ... },
        "arela.ollama.baseUrl": { ... }
      }
    },
    "commands": [
      {
        "command": "arela.clearKeys",
        "title": "Clear API Keys",
        "category": "Arela"
      }
    ]
  }
}
```

---

## Testing

### Manual Test

1. **Test migration:**
   - Set API key in old settings
   - Reload extension
   - Verify key migrated to SecretStorage
   - Verify key removed from settings.json

2. **Test storage:**
   - Set new API key via settings UI
   - Reload VS Code
   - Verify key persists
   - Verify connection works

3. **Test clear:**
   - Run "Arela: Clear API Keys"
   - Verify keys deleted
   - Verify connection fails gracefully

4. **Test security:**
   - Check settings.json
   - Verify no keys visible
   - Check settings sync
   - Verify keys don't sync

---

## Migration Guide for Users

```markdown
## API Key Storage Update

Arela now stores API keys securely using VS Code's SecretStorage.

### What Changed
- API keys are no longer stored in settings.json
- Keys are encrypted using your OS keychain
- Keys no longer sync across machines (for security)

### Action Required
If you had API keys configured:
1. Your keys were automatically migrated
2. No action needed!

If you need to update your keys:
1. Open Arela Settings
2. Enter your API key
3. Keys are now stored securely

### Clear Keys
Run "Arela: Clear API Keys" to remove all stored keys.
```

---

## Security Benefits

**Before:**
- ❌ Keys in plain text
- ❌ Visible in settings.json
- ❌ Synced across machines
- ❌ Exposed in git if committed

**After:**
- ✅ Keys encrypted
- ✅ Stored in OS keychain
- ✅ Never synced
- ✅ Never in files

---

**Build this for secure key management!** 🔐
