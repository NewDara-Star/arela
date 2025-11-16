// Get VS Code API
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export interface VSCodeMessage {
  type: string;
  [key: string]: any;
}

export function postMessage(message: VSCodeMessage) {
  vscode.postMessage(message);
}

export function onMessage(handler: (message: VSCodeMessage) => void) {
  window.addEventListener('message', (event) => {
    handler(event.data);
  });
}
