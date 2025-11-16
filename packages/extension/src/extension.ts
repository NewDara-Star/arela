import * as vscode from 'vscode';
import { ensureServer } from './downloader';
import { ChatProvider } from './chat-provider';
import { ServerManager } from './server-manager';

let serverManager: ServerManager | null = null;
let chatProvider: ChatProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Arela] Extension activating...');
  
  // Always register the chat command, even if server fails
  chatProvider = new ChatProvider(context);
  console.log('[Arela] ChatProvider created');
  
  const openChatCommand = vscode.commands.registerCommand('arela.openChat', () => {
    console.log('[Arela] Open chat command executed!');
    chatProvider?.show();
  });
  
  console.log('[Arela] Command registered: arela.openChat');
  context.subscriptions.push(openChatCommand);

  // Try to start server, but don't fail activation if it doesn't work
  try {
    const binaryPath = await ensureServer(context);
    console.log(`[Arela] Server binary ready: ${binaryPath}`);

    serverManager = new ServerManager(binaryPath, context);
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
}
