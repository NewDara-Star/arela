import * as vscode from 'vscode';
import * as path from 'path';
import type { ServerManager } from './server-manager';
import { SecretManager } from './secret-manager';

interface SettingsData {
  provider: string;
  model: string;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
  ollamaEnabled: boolean;
  ollamaBaseUrl: string;
}

export class SettingsProvider {
  private panel: vscode.WebviewPanel | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly serverManager: ServerManager | null,
    private readonly secretManager: SecretManager
  ) {}

  show() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'arelaSettings',
      'Arela Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview')),
        ],
      }
    );

    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage(this.handleMessage.bind(this));

    this.panel.onDidDispose(() => {
      this.panel = null;
    });

    // Send initial settings
    this.sendCurrentSettings();
  }

  private getHtml(): string {
    if (!this.panel) {
      throw new Error('Webview panel not initialized');
    }

    const webview = this.panel.webview;
    const bundleDir = path.join(this.context.extensionPath, 'out', 'webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(bundleDir, 'settings-bundle.js')));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(bundleDir, 'settings-bundle.css')));
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        script-src ${webview.cspSource} 'nonce-${nonce}';
        style-src ${webview.cspSource} 'unsafe-inline';
        font-src ${webview.cspSource};
        img-src ${webview.cspSource} data:;
      ">
      <link rel="stylesheet" href="${styleUri}">
      <title>Arela Settings</title>
    </head>
    <body>
      <div id="app"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
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

  private async sendCurrentSettings() {
    if (!this.panel) return;

    const config = vscode.workspace.getConfiguration('arela');

    const [hasOpenAIKey, hasAnthropicKey] = await Promise.all([
      this.secretManager.hasApiKey('openai'),
      this.secretManager.hasApiKey('anthropic'),
    ]);

    const settings: SettingsData = {
      provider: config.get('provider') || 'openai',
      model: config.get('model') || 'gpt-4-turbo-preview',
      hasOpenAIKey,
      hasAnthropicKey,
      ollamaEnabled: config.get('ollama.enabled') ?? false,
      ollamaBaseUrl: config.get('ollama.baseUrl') || 'http://localhost:11434',
    };

    this.panel.webview.postMessage({
      type: 'settingsLoaded',
      settings,
    });
  }

  private async fetchModels(provider: string) {
    if (!this.panel || !this.serverManager) return;

    try {
      const models = await this.serverManager.sendRequest('listModels', { provider }) as string[];
      this.panel.webview.postMessage({
        type: 'modelsLoaded',
        provider,
        models,
      });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      this.panel.webview.postMessage({
        type: 'error',
        message: `Failed to fetch models: ${error}`,
      });
    }
  }

  private async testConnection(provider: string, apiKey: string) {
    if (!this.panel || !this.serverManager) return;

    try {
      // Send a test request to the server
      await this.serverManager.sendRequest('testConnection', { provider, apiKey });

      this.panel.webview.postMessage({
        type: 'connectionTestResult',
        success: true,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        type: 'connectionTestResult',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async saveSettings(data: any) {
    const config = vscode.workspace.getConfiguration('arela');

    try {
      // Save provider and model
      await config.update('provider', data.provider, vscode.ConfigurationTarget.Global);
      await config.update('model', data.model, vscode.ConfigurationTarget.Global);

      // Save API keys to secret storage
      if (data.openaiKey) {
        await this.secretManager.setApiKey('openai', data.openaiKey);
      }
      if (data.anthropicKey) {
        await this.secretManager.setApiKey('anthropic', data.anthropicKey);
      }

      // Save Ollama settings
      await config.update('ollama.enabled', data.ollamaEnabled, vscode.ConfigurationTarget.Global);
      if (data.ollamaBaseUrl) {
        await config.update('ollama.baseUrl', data.ollamaBaseUrl, vscode.ConfigurationTarget.Global);
      }

      vscode.window.showInformationMessage('Settings saved successfully');

      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'settingsSaved',
        });
        // Refresh settings to update configured badges
        void this.sendCurrentSettings();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
    }
  }
}
