import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('arela.openChat', () => {
    vscode.window.showInformationMessage('Arela extension is running.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  // VS Code calls this when the extension is deactivated. Keep for parity with API.
}
