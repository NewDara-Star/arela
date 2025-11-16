import * as vscode from 'vscode';
import * as path from 'path';
import { ensureServer } from './downloader';
import { ChatProvider } from './chat-provider';
import { ServerManager } from './server-manager';
import { SettingsProvider } from './settings-provider';
import { SecretManager } from './secret-manager';

let serverManager: ServerManager | null = null;
let chatProvider: ChatProvider | null = null;
let settingsProvider: SettingsProvider | null = null;
let secretManager: SecretManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Arela] Extension activating...');

  secretManager = new SecretManager(context.secrets);
  await migrateLegacyApiKeys(secretManager);
  
  // Always register the chat command, even if server fails
  chatProvider = new ChatProvider(context, secretManager);
  console.log('[Arela] ChatProvider created');
  
  const openChatCommand = vscode.commands.registerCommand('arela.openChat', () => {
    console.log('[Arela] Open chat command executed!');
    chatProvider?.show();
  });
  
  const addWorkspaceContextCommand = vscode.commands.registerCommand(
    'arela.addWorkspaceContext',
    async () => {
      if (!chatProvider || !chatProvider.hasActivePanel()) {
        vscode.window.showWarningMessage('Please open Arela Chat first');
        return;
      }

      try {
        const workspace = await chatProvider.getWorkspaceContext();
        if (workspace) {
          chatProvider.sendWorkspaceContext(workspace);
          vscode.window.showInformationMessage(
            `Added workspace context (${workspace.totalFiles}${workspace.truncated ? '+' : ''} files)`,
          );
        } else {
          vscode.window.showWarningMessage('No workspace folder open');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to add workspace context: ${message}`);
      }
    },
  );
  
  const newConversationCommand = vscode.commands.registerCommand('arela.newConversation', async () => {
    if (!chatProvider) {
      vscode.window.showWarningMessage('Arela chat is not available');
      return;
    }
    chatProvider.show();
    await chatProvider.newConversation();
  });

  const deleteConversationCommand = vscode.commands.registerCommand('arela.deleteConversation', async () => {
    if (!chatProvider) {
      vscode.window.showWarningMessage('Arela chat is not available');
      return;
    }
    if (!chatProvider.hasActivePanel()) {
      vscode.window.showWarningMessage('Please open Arela Chat first');
      return;
    }

    const confirmation = await vscode.window.showWarningMessage(
      'Delete the current Arela conversation?',
      { modal: true },
      'Delete',
    );
    if (confirmation === 'Delete') {
      await chatProvider.deleteCurrentConversation();
    }
  });
  
  const selectModelCommand = vscode.commands.registerCommand('arela.selectModel', async () => {
    if (!serverManager) {
      vscode.window.showErrorMessage('Server is not running');
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('arela');
      const currentProvider = config.get<string>('provider') || 'openai';

      // Fetch available models from server
      const models = await serverManager.sendRequest('listModels', { provider: currentProvider }) as string[];

      if (!models || models.length === 0) {
        vscode.window.showWarningMessage(`No models available for provider: ${currentProvider}`);
        return;
      }

      // Show quick pick
      const selected = await vscode.window.showQuickPick(models, {
        placeHolder: `Select a model for ${currentProvider}`,
        title: 'Arela: Select AI Model',
      });

      if (selected) {
        await config.update('model', selected, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Model set to: ${selected}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch models: ${error}`);
    }
  });

  const openSettingsCommand = vscode.commands.registerCommand('arela.openSettings', () => {
    if (!settingsProvider) {
      if (!secretManager) {
        throw new Error('Secret manager not initialized');
      }
      settingsProvider = new SettingsProvider(context, serverManager, secretManager);
    }
    settingsProvider.show();
  });

  console.log('[Arela] Commands registered: arela.openChat, arela.addWorkspaceContext, arela.newConversation, arela.deleteConversation, arela.selectModel, arela.openSettings');
  context.subscriptions.push(
    openChatCommand,
    addWorkspaceContextCommand,
    newConversationCommand,
    deleteConversationCommand,
    selectModelCommand,
    openSettingsCommand,
  );

  // Try to start server, but don't fail activation if it doesn't work
  try {
    // Development mode: use local Node.js server
    const isDev = context.extensionMode === vscode.ExtensionMode.Development;
    let serverPath: string;
    
    if (isDev) {
      // Use local server in development
      serverPath = path.join(context.extensionPath, '..', 'server', 'out', 'index.js');
      console.log(`[Arela] Development mode: using local server at ${serverPath}`);
    } else {
      // Use downloaded binary in production
      serverPath = await ensureServer(context);
      console.log(`[Arela] Production mode: server binary ready at ${serverPath}`);
    }

    if (!secretManager) {
      throw new Error('Secret manager not initialized');
    }
    serverManager = new ServerManager(serverPath, context, secretManager, isDev);
    await serverManager.start();
    chatProvider.setServerManager(serverManager);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Arela] Server startup failed: ${message}`);
    vscode.window.showWarningMessage(
      `Arela UI is available, but server failed to start: ${message}`
    );
    // Don't throw - allow extension to activate without server
  }
}

export async function deactivate() {
  await serverManager?.stop();
  serverManager = null;
  chatProvider?.setServerManager(null);
  chatProvider = null;
  settingsProvider = null;
  secretManager = null;
}

async function migrateLegacyApiKeys(secrets: SecretManager) {
  const config = vscode.workspace.getConfiguration('arela');
  const openaiKey = config.get<string>('openai.apiKey');
  const anthropicKey = config.get<string>('anthropic.apiKey');
  let migrated = false;

  if (openaiKey) {
    await secrets.setApiKey('openai', openaiKey);
    await config.update('openai.apiKey', undefined, vscode.ConfigurationTarget.Global);
    migrated = true;
  }

  if (anthropicKey) {
    await secrets.setApiKey('anthropic', anthropicKey);
    await config.update('anthropic.apiKey', undefined, vscode.ConfigurationTarget.Global);
    migrated = true;
  }

  if (migrated) {
    void vscode.window.showInformationMessage('Migrated API keys to secure storage');
  }
}
