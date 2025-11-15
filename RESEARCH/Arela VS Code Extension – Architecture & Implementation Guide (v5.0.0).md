Arela VS Code Extension – Architecture & Implementation Guide (v5.0.0)

Architecture Overview

To build Arela’s VS Code extension (v5.0.0), we will use VS Code’s extension host (Node.js) for core logic and Webview-based UIs for rich interactions. The extension will run in the VS Code extension host process, interacting with VS Code via its API, and will integrate Arela’s existing Node/TypeScript code either directly or via a background service. A Language Server Protocol (LSP) is not strictly required for this use-case (since we’re not implementing a standard language server for code editing), so we’ll implement features directly in the extension host for simplicity and performance ￼ ￼. The extension will leverage VS Code’s UI APIs (Webviews, TreeViews, HoverProvider, StatusBar, etc.) to deliver the AI assistant features.

Below is a high-level architecture diagram of the extension’s components and data flow:

flowchart LR
    subgraph VSCode Editor
        direction TB
        A[Extension Host (Node.js)] -- VS Code API calls --> VSCodeUI[VS Code UI]
        VSCodeUI -- User actions --> A
    end
    subgraph Arela Extension (Extension Host)
        direction TB
        A1[Chat Panel<br/>(WebviewView)] -- messages --> A
        A2[Hover Provider] -- queries Arela API --> A
        A3[Search Panel<br/>(Tree/Webview)] -- queries Arela API --> A
        A4[Inline Completion Provider] -- requests suggestion --> A
        A5[Commands (Context Menu,<br/>Command Palette)] -- trigger actions --> A
        A6[Status Bar Item] -- status updates --> A
    end
    subgraph Arela Core (AI Backend)
        B1[Arela MCP Server<br/>(Node.js process)]
        B2[Arela Library<br/>(TypeScript modules)]
        B3[External AI APIs<br/>(OpenAI, Anthropic)]
        B4[Local AI Engine<br/>(Ollama, etc.)]
        B5[Semantic DB/Cache<br/>(SQLite, Vector Index)]
    end
    %% Data flow arrows:
    A -- spawn or call --> B1
    A -- import calls --> B2
    B1 -- LLM queries --> B3
    B1 -- local inference --> B4
    B1 -- AST parse & DB ops --> B5
    B2 -- may call --> B3
    B2 -- may call --> B4
    B2 -- uses --> B5
    A1 <-- user prompt/response --> A
    A2 -- on hover --> A (calls summarizer)
    A3 -- search query/response --> A
    A4 -- AI suggestions --> A
    A5 -- file analysis --> A

Key architecture decisions:
	•	Extension Host vs LSP: We implement features in the extension host directly via vscode.languages and vscode.window APIs. This direct approach is simpler than creating a separate LSP server, and it keeps Arela’s logic in-process for faster communication ￼. An LSP would only be needed if we wanted to offload heavy processing to another process or support multiple editors, which isn’t necessary for our MVP (our Arela logic is already in Node/TS). We will ensure heavy tasks are run asynchronously or in a separate process/thread to keep the extension responsive.
	•	Webview UI vs Native Components: For complex UI like the chat interface and possibly the semantic search results, we will use Webviews because they allow rich HTML/JS content and custom styling ￼ ￼. The chat sidebar will be a Webview (or WebviewView) with a custom HTML/CSS/JS UI (for conversation, code formatting, etc.). We will also use native VS Code UI APIs where appropriate: e.g., VS Code’s hover tooltip supports Markdown content, so we’ll feed it Markdown for code summaries instead of building a custom tooltip UI. Similarly, inline code suggestions will use VS Code’s Completion/InlineCompletion API, and context menu commands will be registered via VS Code’s command system. This hybrid approach gives us the flexibility of custom UI for the chat and search, while leveraging native editor integration for hovers, inline completions, status bar, notifications, etc.
	•	Folder/Module Structure: We will organize the extension code for clarity and maintainability:
	•	A main extension entry point (e.g. src/extension.ts) that activates the extension and registers all features.
	•	Separate modules for each feature area: e.g. src/chatPanel.ts for the chat sidebar Webview provider, src/hoverProvider.ts for hover tooltips logic, src/searchView.ts for the semantic search panel, src/inlineCompletion.ts for suggestions, src/commands.ts for context menu commands, etc.
	•	A media/ or webview/ folder for Webview assets (HTML, CSS, JS for the chat UI and any other webview).
	•	We will integrate Arela’s existing core (context router, summarizer, search, etc.) by either bundling its modules or running the Arela MCP server. If possible, we prefer using Arela as a separate process (MCP server) to avoid issues with native modules (like tree-sitter or better-sqlite3) inside the extension. In either case, the extension’s structure should allow calling Arela’s functionalities cleanly (either via import or IPC).

Here’s a suggested project structure:

arela-vscode-extension/
├── package.json               # Extension manifest (including contributions)
├── tsconfig.json              # TypeScript config
├── src/
│   ├── extension.ts           # Entry point – registers commands, panels, providers
│   ├── chatPanel.ts           # Implements Chat sidebar WebviewView provider
│   ├── hoverProvider.ts       # Implements HoverProvider for code summaries
│   ├── searchView.ts          # Implements Semantic Search panel (TreeView or Webview)
│   ├── inlineSuggest.ts       # Inline suggestion provider (CompletionItemProvider)
│   ├── commands.ts            # Commands for context menu actions
│   └── arela-integration.ts   # Module to interface with Arela core (API calls or IPC)
├── media/                     # Static assets for Webviews
│   ├── chat.html              # HTML for chat webview
│   ├── chat.js                # JS for chat webview (UI logic)
│   ├── chat.css               # CSS for chat webview
│   └── ... (any images, etc.)
├── test/                      # Extension test cases (if using VSCode test framework)
│   └── suite.test.ts          # Example integration tests
├── .vscode/
│   └── launch.json            # Debug configuration for extension & webview
└── webpack.config.js          # Webpack config if bundling extension or webview code

This structure separates UI assets from extension logic, and allows possibly bundling the webview code separately (for example, using a front-end framework like React or Svelte in media/ that compiles to chat.js, as shown in the StackOverflow example ￼ ￼). We will use TypeScript for the extension code and possibly for webview script (transpiled to JS). The Yeoman generator (yo code) can scaffold much of this structure for us.

Project Setup and Scaffolding

Initializing the Extension: It’s recommended to start with the Yeoman VS Code Extension Generator for a properly configured project. Run the following in a terminal:

npx --package yo --package generator-code -- yo code

Follow the prompts to create a New Extension (TypeScript). You can name it “Arela Assistant” (for example) and choose defaults for the rest. If prompted about bundling with webpack, you can choose No initially (we will manually configure bundling if needed) ￼ ￼. The generator will create the basic files (package.json, extension.ts, README, etc.) and even set up a simple test. Using Yeoman ensures we have the correct project structure, TypeScript config, and scripts to compile the extension.

TypeScript Configuration: Ensure tsconfig.json is set to target ES2020 or later (since VS Code uses Node 16+ runtime) and module set to commonjs. The generator handles this by default. We should also configure esModuleInterop and sourceMap (for easier debugging). If we plan to bundle the extension, we might later introduce a bundler config, but to start, we can run the extension in development with the TypeScript out files.

Extension Entry Point: The extension.ts (or extension.js after compile) is the activation script. It should export an activate function where we will register all our commands and providers, and a deactivate if any cleanup is needed. The Yeoman template provides a stub activate() and deactivate(). We will expand this to set up Arela’s features.

Example src/extension.ts skeleton:

import * as vscode from 'vscode';
import { ChatPanelProvider } from './chatPanel';
import { registerHoverProvider } from './hoverProvider';
import { SearchResultsProvider } from './searchView';
import { InlineSuggestionProvider } from './inlineSuggest';
import { registerContextCommands } from './commands';
import { ArelaBackend } from './arela-integration';

export async function activate(context: vscode.ExtensionContext) {
    // Initialize Arela backend (start server or load library)
    await ArelaBackend.init(context);

    // Register Chat Sidebar (WebviewView)
    const chatProvider = new ChatPanelProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, chatProvider));
    
    // Register Hover Provider for code summaries
    context.subscriptions.push(registerHoverProvider());
    
    // Register Semantic Search view
    const searchProvider = new SearchResultsProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('arelaSearchView', searchProvider));
    // Alternatively, if using webview for search: register like chat with WebviewViewProvider
    
    // Register Inline Completion Provider for suggestions
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, new InlineSuggestionProvider())
    );
    
    // Register context menu and palette commands
    registerContextCommands(context);
    
    // Status Bar setup
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusItem.text = '$(robot) Arela: Initializing...';
    statusItem.show();
    context.subscriptions.push(statusItem);
    ArelaBackend.onStatusChange((statusText: string) => {
        statusItem.text = `$(robot) Arela: ${statusText}`;
    });
}

In the above snippet, we assume:
	•	ChatPanelProvider is a class handling the chat webview (with a static viewType identifier).
	•	registerHoverProvider() sets up vscode.languages.registerHoverProvider for relevant file types.
	•	SearchResultsProvider implements a TreeDataProvider for search results (with ID arelaSearchView contributed in package.json).
	•	InlineSuggestionProvider provides inline completions.
	•	registerContextCommands registers the commands for context menu items (like “Summarize File”, etc.).
	•	ArelaBackend is a module to initialize and interface with the Arela core (which could spawn the MCP server or load functions).
	•	We also set up a Status Bar item with an icon (using a codicon, here $(robot) for an AI bot) to show Arela’s status (like indexing or ready). We update it via an event from ArelaBackend.

Package.json Contributions: We need to declare contributions in package.json so VS Code knows about our views, commands, etc. For example:
	•	In "contributes.views", add our sidebar views:

"views": {
  "sidebar": [
    {
      "id": "arelaChatView",
      "name": "Arela Chat",
      "type": "webview"
    },
    {
      "id": "arelaSearchView",
      "name": "Arela Search Results",
      "type": "tree"
    }
  ]
}

If we want the chat in its own sidebar section, we might use an "activitybar" entry to create a new icon. But likely, we can put the chat and search under the existing “Explorer” or a new container. Alternatively, use "viewsContainers" to create a new container (with an icon) for Arela. For simplicity, we might put chat under the sidebar (like how GitHub Copilot chat appears in the sidebar panel).

	•	In "contributes.commands", list commands:

"commands": [
  {
    "command": "arela.summarizeFile",
    "title": "Summarize File",
    "category": "Arela"
  },
  {
    "command": "arela.analyzeFunction",
    "title": "Analyze Function",
    "category": "Arela"
  },
  {
    "command": "arela.findUsage",
    "title": "Find Usage (Semantic)",
    "category": "Arela"
  },
  {
    "command": "arela.askInChat",
    "title": "Ask Arela (with Context)",
    "category": "Arela"
  }
]


	•	In "contributes.menus" add these commands to context menus:

"menus": {
  "editor/context": [
    { "command": "arela.summarizeFile", "when": "editorLangId == typescript" },
    { "command": "arela.analyzeFunction", "when": "editorHasSelection" },
    { "command": "arela.findUsage", "when": "editorHasSelection" },
    { "command": "arela.askInChat", "when": "editorHasSelection" }
  ],
  "explorer/context": [
    { "command": "arela.summarizeFile", "when": "resourceExtname == .js || resourceExtname == .ts" }
  ]
}

The "when" clause ensures the menu appears only in relevant contexts (you can refine those conditions). These will create right-click options in the editor and Explorer for invoking our features on files or selections.

	•	Also define activation events for our features, e.g.:

"activationEvents": [
  "onView:arelaChatView",
  "onCommand:arela.summarizeFile",
  "onStartupFinished"
]

We likely want to activate on startup (to index or load Arela backend) and when the chat view is opened or commands are invoked.

After scaffolding and configuring, you can press F5 in VS Code to launch an Extension Development Host with this extension. Initially, it will just show the placeholder views and commands. Now we will implement each feature in detail.

Chat Interface – Sidebar Panel

Goal: Provide a sidebar chat panel where the user can converse with Arela’s AI assistant, ask questions about the codebase, etc., without leaving VS Code. The chat should support markdown (for code formatting) and allow interactive elements (like clicking code suggestions to insert into editor).

Creating a Webview for Chat

We will implement the chat UI using a WebviewView in VS Code’s sidebar. A WebviewView is a type of Webview content that can be embedded in a sidebar or panel contributed by an extension ￼ ￼. We register a WebviewViewProvider for our arelaChatView.

1. Define the WebviewViewProvider: In src/chatPanel.ts:

import * as vscode from 'vscode';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'arelaChatView';  // match the contributes.views id
    private _extensionUri: vscode.Uri;
    private _view?: vscode.WebviewView;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    // This is called when the view is needed (e.g., user opens the Arela Chat panel)
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        const webview = webviewView.webview;
        webview.options = {
            enableScripts: true, 
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
        };
        webview.html = this.getHtmlForWebview(webview);
        
        // Handle messages from the webview
        webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'userInput':
                    const text = message.text?.trim();
                    if (text) {
                        this.handleUserInput(text);
                    }
                    break;
                // handle other message types if needed (e.g., button clicks in UI)
            }
        });
    }

    // Send a message to the webview (for AI responses or status updates)
    public postMessage(msg: any) {
        this._view?.webview.postMessage(msg);
    }

    private handleUserInput(query: string) {
        // Show user query in the chat UI (echo it)
        this.postMessage({ type: 'addUserMessage', text: query });
        // Call Arela backend to get answer (streaming)
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Arela: Answering..." }, async () => {
            try {
                await ArelaBackend.askQuestion(query, (partialAnswer) => {
                    // stream chunks to webview
                    this.postMessage({ type: 'addAssistantMessageChunk', text: partialAnswer });
                });
                this.postMessage({ type: 'finalizeAssistantMessage' });
            } catch (err: any) {
                vscode.window.showErrorMessage(`Arela error: ${err.message || err}`);
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        // We'll construct an HTML page with a basic chat UI layout.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css'));
        const nonce = getNonce();
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>Arela Chat</title>
</head>
<body>
  <div id="chat-container">
    <div id="messages"></div>
    <div id="input-container">
      <textarea id="input" rows="1" placeholder="Ask Arela..."></textarea>
      <button id="send">➤</button>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

Key points in the above code:
	•	We enable scripts and set localResourceRoots to allow loading our local JS/CSS. The Content Security Policy meta tag is set to only allow our scripts (nonce-protected) and styles ￼ ￼.
	•	The HTML structure includes a messages area and a text input with a send button.
	•	We listen for messages from the webview: specifically, we expect a 'userInput' command when the user submits a question.
	•	handleUserInput echoes the user message to the chat panel (so it appears in the UI) and then uses ArelaBackend.askQuestion to handle the AI query. We wrap the call in vscode.window.withProgress to show a progress notification while the answer is being generated ￼ ￼. We use a callback or event to stream partial answers (partialAnswer chunks) from ArelaBackend, and for each chunk we post a message of type 'addAssistantMessageChunk' to the webview. When done, we send a 'finalizeAssistantMessage' to indicate the answer is complete. Any error triggers a VS Code error notification (using showErrorMessage).
	•	The postMessage method is how we send data from extension to the webview. The webview’s JS will handle these message types to update the UI ￼ ￼.

We referenced a helper getNonce() – this is a common utility to generate a random nonce for CSP, which you can implement as a simple random string generator.

2. Webview Script (chat.js): Now we implement the front-end logic inside media/chat.js. This script will be loaded into the webview and can manipulate the DOM and send messages to the extension using the VS Code API (acquireVsCodeApi()).

Example chat.js:

const vscodeApi = acquireVsCodeApi();
const messagesDiv = document.getElementById('messages');
const inputBox = document.getElementById('input');
const sendBtn = document.getElementById('send');

// Utility to append a message to chat
function appendMessage(content, cssClass) {
  const msg = document.createElement('div');
  msg.className = 'msg ' + cssClass;
  msg.innerHTML = content;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Send user message to extension
function sendUserMessage() {
  const text = inputBox.value;
  if (text.trim().length === 0) return;
  vscodeApi.postMessage({ command: 'userInput', text: text });
  inputBox.value = '';
}

// Event listeners
sendBtn.addEventListener('click', sendUserMessage);
inputBox.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage();
  }
});

// Handle messages FROM extension
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.type) {
    case 'addUserMessage':
      appendMessage(`<strong>You:</strong> ${escapeHtml(message.text)}`, 'user-msg');
      break;
    case 'addAssistantMessageChunk':
      // If the last message is still streaming, append to it; otherwise create new
      let last = messagesDiv.lastElementChild;
      if (!last || !last.classList.contains('assistant-msg')) {
        last = document.createElement('div');
        last.className = 'msg assistant-msg';
        messagesDiv.appendChild(last);
      }
      last.innerHTML = `<strong>Arela:</strong> ${markdownToHtml(escapeHtml(message.text))}`;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      break;
    case 'finalizeAssistantMessage':
      // Nothing special here yet, could add a tail or marker
      break;
  }
});

// Simple util to escape HTML
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

// (Optional) markdownToHtml: convert markdown syntax to HTML (for code blocks, etc.)
// For simplicity, we might rely on VS Code’s built-in rendering by sending Markdown strings instead.
// But if needed, we can implement basic conversions or include a library.
function markdownToHtml(md) {
  // This could be a simple regex-based conversion or use a library like marked.js
  return md
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

This script:
	•	Calls acquireVsCodeApi() to get a vscodeApi object for messaging.
	•	Defines appendMessage to add a new message <div> to the chat.
	•	On clicking send or pressing Enter (without shift), it sends the userInput command with the text to the extension.
	•	It listens for incoming messages (from ChatPanelProvider.postMessage). We handle:
	•	'addUserMessage': display the user’s message in the chat (we prefix with You: and escape HTML for safety).
	•	'addAssistantMessageChunk': we append or update an “assistant” message. If a previous assistant message is in progress, we update it; otherwise create a new one. The content is converted from Markdown to HTML for nicer formatting (here we implement a minimal markdownToHtml for backticks and bold as an example – in a real scenario, you might use a proper Markdown renderer or rely on VS Code’s Markdown widget. Alternatively, since our chat is in a webview, we can render HTML directly. Another approach is to send the final answer as Markdown to VS Code’s Markdown renderer, but we want streaming, so doing it in the webview is fine).
	•	We ensure to scroll to bottom as messages come in.

3. Styling (chat.css): A simple CSS for chat layout, e.g.:

#chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
#messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5em;
}
.msg {
  margin: 0.2em 0;
  line-height: 1.4;
}
.user-msg { color: #444; }
.assistant-msg { color: #000; background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
#input-container {
  display: flex;
  border-top: 1px solid #ddd;
}
#input {
  flex: 1;
  resize: none;
  padding: 0.5em;
  border: none;
}
#send {
  background: #0B5FFF;
  color: white;
  border: none;
  padding: 0 1em;
  cursor: pointer;
}
#send:hover { background: #0A50E0; }

This gives a basic appearance: user messages and assistant messages styled differently, and an input area with a send button. We can improve the styling as needed, but for MVP this suffices.

4. Connecting the Chat to Arela backend: The ChatPanelProvider.handleUserInput uses ArelaBackend.askQuestion. We need to implement that function to interface with Arela’s AI logic. This depends on Arela’s design – since Arela already has a multi-agent system and context router, presumably we can call a function like contextRouter.routeQuery(query) or use the MCP server.

Option A: Import Arela modules directly. If Arela’s code (e.g., src/context-router.ts, etc.) is accessible, we could import those. For example, if our extension included Arela as a dependency (say const Arela = require('arela')), then Arela.ask or similar method could produce a result. But direct import will also load tree-sitter and better-sqlite3, which as discussed can cause deployment issues due to native modules needing rebuild ￼ ￼. It’s possible to ship precompiled binaries for those modules, but the VS Code Marketplace does not officially support native modules in extensions ￼. We would have to compile against Electron’s Node version for each platform (a complex process). If possible, avoid direct use of better-sqlite3 in extension; either use a pure JS alternative or run such logic externally.

Option B: Run Arela’s MCP server externally. Arela already has an MCP server (src/mcp/server.ts in the CLI). The extension can spawn this server as a subprocess. For example, on activation, ArelaBackend.init could run arela mcp-server (or use the Arela API to start it). The server might listen on a port or socket for queries. We can then send requests (e.g., HTTP or via the MCP SDK if provided). This keeps the heavy logic out-of-process. The downside is managing the process lifecycle and ensuring it’s running.

Option C: Use Arela as a library but in a worker thread. Node.js supports Worker Threads. We could spawn a worker thread running Arela logic, communicating via messages. This is advanced, but it avoids separate process management while still isolating heavy work.

For MVP, Option B is straightforward: treat Arela’s CLI as an external tool. In ArelaBackend.init, try to require Arela’s package; if it fails or if native modules error out, fallback to launching the CLI. Another approach: since Arela’s MCP is likely accessible via the Model Context Protocol, and VS Code has some support for MCP tools ￼ ￼, we could integrate via VS Code’s MCP APIs. But that may be overkill; a direct JSON RPC over stdout or HTTP with the spawned process is fine.

Example (simplified) src/arela-integration.ts:

import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';

export namespace ArelaBackend {
    let arelaProcess: import('child_process').ChildProcess | null = null;
    let ready = false;
    const listeners: Array<(status: string) => void> = [];

    export async function init(context: vscode.ExtensionContext) {
        try {
            // Try to import Arela directly (if bundled)
            const arela = await import('arela');
            // If import succeeds, possibly perform any initialization needed
            ready = true;
            fireStatus('Ready');
        } catch (e) {
            // Fallback: spawn Arela MCP server
            const arelaPkgPath = context.asAbsolutePath(path.join('node_modules', 'arela', 'bin', 'arela')); 
            // Adjust path if needed to find the CLI binary
            arelaProcess = execFile(arelaPkgPath, ['mcp-server'], (err) => {
                if (err) {
                    vscode.window.showErrorMessage('Failed to start Arela server: ' + err.message);
                }
            });
            // Optionally, listen for server output to detect when it's ready
            arelaProcess?.stdout?.on('data', chunk => {
                const txt = chunk.toString();
                if (txt.includes('Arela MCP server listening')) {
                    ready = true;
                    fireStatus('Ready');
                }
            });
            fireStatus('Starting...');
        }
    }

    export async function askQuestion(query: string, onStream: (partial: string) => void): Promise<void> {
        if (!ready) {
            throw new Error('Arela backend not ready');
        }
        // If Arela is imported (in-process):
        if (!arelaProcess) {
            const arela = await import('arela');
            // assuming arela has a function to ask question with streaming
            return arela.askQuestion(query, onStream);
        } else {
            // If using external process, send via MCP (assuming MCP uses stdin/stdout or HTTP).
            return new Promise((resolve, reject) => {
                // Example using stdin for simplicity:
                if (!arelaProcess) return reject(new Error('Arela process not running'));
                let responseBuffer = '';
                arelaProcess.stdout?.on('data', data => {
                    const text = data.toString();
                    // parse text for streaming markers or final response...
                    onStream(text); // this simplistic approach just streams whatever comes.
                    responseBuffer += text;
                });
                arelaProcess.stdin?.write(JSON.stringify({ query }) + '\n');
                // For a real MCP, you'd implement proper request/response handling.
                // For now, assume one query at a time and treat stdout end as end-of-response.
                arelaProcess.stdout?.once('end', () => resolve());
            });
        }
    }

    export function onStatusChange(listener: (status: string) => void) {
        listeners.push(listener);
    }
    function fireStatus(status: string) {
        listeners.forEach(fn => fn(status));
    }
}

In this pseudo-code:
	•	init tries to import Arela. If it fails (likely because of missing native bindings), it spawns the Arela MCP server via execFile. We adjust the path to the Arela CLI if needed. We track when it’s ready (e.g., by scanning stdout for a ready message). We notify status listeners (like our status bar) via fireStatus.
	•	askQuestion either calls an in-process function (if Arela is loaded) or sends the query to the external process. For demonstration, we wrote a very naive stdout streaming; in practice, the MCP server might communicate via a known protocol or port (perhaps HTTP or a socket). We’d use that protocol properly. The onStream callback is used to relay partial results to the chat UI.
	•	We maintain a simple onStatusChange event to update UI elements like the status bar or to block certain actions until ready.

Securing API Keys: If Arela (or the extension) needs OpenAI/Anthropic API keys, we should not hardcode them. Instead, use VS Code’s Secret Storage for user-provided keys. For example, provide a command or setting for the user to enter their API key, then store it via context.secrets.store('openai_key', key) ￼. The extension can retrieve it when making API calls (context.secrets.get('openai_key')). This keeps keys out of plaintext config files. In package.json, we could also define configuration settings for API endpoints or model choices, but not the key itself (for security). Arela likely handles keys internally if configured, but ensure any needed secrets are loaded from a safe store.

Handling Streaming Responses

As shown above, we handle streaming by sending chunks to the webview as they arrive ￼. This approach keeps the UI responsive, displaying partial answer content (just like ChatGPT/Copilot do). A few considerations:
	•	Rate limiting UI updates: If chunks arrive very fast, updating the DOM for each token could be inefficient. It’s wise to batch updates. For instance, buffer incoming text and update the webview say every 50ms or after a newline. Our example just streams directly for simplicity.
	•	End-of-response detection: When the Arela backend signals the answer is complete, we sent a finalizeAssistantMessage message to webview. In our webview script, we didn’t do much with it yet. You might use it to, e.g., remove a spinner icon or enable the input (we might disable input while an answer is in progress to prevent overlapping requests).
	•	Error handling: If the AI fails (network error, etc.), catch it and show a notification ￼. Also consider sending an error message to the chat UI (so the conversation shows “Error: …” to the user).

Chat Persona & Context: Arela as an AI CTO likely has a system prompt or persona. Implement this in Arela’s backend (it might already). From extension side, you ensure to include context: e.g., if user asks about a function while a file is open, you might capture the current file name or selection and include it. The context router in Arela probably handles this (the “6 memory layers” and code summarizer). We can enrich user queries by passing file context. For example, the “Ask Arela” context menu might call chat with the selected code snippet and file path. In arela.askQuestion(query), you could automatically attach the current open file’s path or project identifier so Arela knows where to search. This is design-dependent – ensure the extension provides enough info (via Arela’s API, maybe something like arela.ask(question, {file, selection}) if available).

Markdown rendering: In our implementation, we did a minimal conversion for backticks. VS Code’s built-in Markdown renderer is not directly available in the webview (since webview is separate). Another strategy is to have the extension convert any code blocks in the answer to actual <pre><code> HTML with syntax highlighting. One approach: use a library like marked￼ or VS Code’s marked.js (it’s bundled) to parse markdown to HTML, and perhaps use the VS Code theming for code. Or, simpler, just trust that backticks are enough for now.
We can also style code blocks in CSS (for example, give them a background). If needed, we could import VS Code’s Shiki or use the vscode.TextDecoder with an Identity grammar, but that’s advanced. For MVP, basic rendering is fine.

Chat UI Best Practices & Pitfalls
	•	Webview Performance: Avoid heavy frameworks unless necessary. A small library (React/Vue) is fine if the UI gets complex, but ensure production build is minified. The example above is vanilla JS for simplicity.
	•	Preserving State: If the user closes and reopens the chat panel, the webview is destroyed by default. If we want to persist the conversation, we could store messages in extension state (memento) or keep the webview alive hidden. Alternatively, VS Code might keep the webview state if not disposed. We can also implement a “clear chat” command.
	•	Focus management: The textarea grows with content (could add auto-resize). Also, intercept Enter key vs Shift+Enter for newline (we did that).
	•	Security: The CSP we set prevents remote content, and we escape user-provided text to avoid injection. Still, review carefully any HTML injection. Using MarkdownString in VS Code APIs (like hover) automatically sanitizes content; in our webview, we must do it ourselves. We used escapeHtml on all dynamic text.
	•	Alternate Approach: As mentioned, VS Code now has a built-in Chat API and UI (the Copilot Chat experience). Using the Chat API, one could register a Chat provider or participant ￼ so that Arela appears in the VS Code Chat view (with @mentions or as a new chat icon). This would handle UI for us. However, that API is newer and may require the user to have the VS Code Insiders or specific settings, and is beyond MVP scope. We chose a custom webview for full control and immediate availability.

With the chat panel in place, let’s move to the other features.

Hover Tooltips with AI Summaries

Goal: When the user hovers over a function, class, or perhaps a file tab, show a tooltip with Arela’s summary: including responsibility, complexity, performance, and security notes of that code element. These should appear within ~100ms (hence likely precomputed or cached).

We implement this using VS Code’s HoverProvider API. This allows us to supply Markdown content for a hovered symbol ￼. The plan:
	•	Parse or look up the summary of the hovered symbol from Arela’s memory. Possibly Arela’s summarizer can generate an AST-based summary for a given function and cache it.
	•	Cache the summaries in a dictionary or persistent store so repeated hovers are fast. Arela has src/summarization/cache/ which likely can be leveraged. We might load a pre-computed summary database at extension activation.
	•	Ensure the hover retrieval is quick: ideally just a dictionary lookup by symbol or function name, which should be <<100ms. If summary is not ready, we could either compute on the fly (which might be slow and degrade UX) or return a placeholder “Summarizing…” and refresh later (not ideal for hover).
	•	Given Arela can index the codebase (324 tests passing suggests it has indexing capability), we should trigger summarization of the workspace in the background (maybe on activation or via a command “Index Project”). Once done, hovers can use the cached data.

Implementing HoverProvider: In hoverProvider.ts:

import * as vscode from 'vscode';
import { ArelaBackend } from './arela-integration';

export function registerHoverProvider(): vscode.Disposable {
    // Apply to all relevant languages (or all files). Could narrow by `{ language: 'typescript', scheme: 'file' }` etc.
    return vscode.languages.registerHoverProvider({ scheme: 'file' }, {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /[A-Za-z0-9_]+/);
            if (!range) return;  // no word, no hover
            const symbol = document.getText(range);
            const filePath = document.uri.fsPath;
            try {
                const summary = ArelaBackend.getSummary(filePath, symbol);
                if (summary) {
                    // Compose Markdown with syntax highlighting for any code in summary
                    const md = new vscode.MarkdownString(summary, true);
                    md.supportHtml = false; // we can use Markdown safely
                    md.isTrusted = false;
                    return new vscode.Hover(md);
                }
            } catch (err) {
                console.error("Error getting summary for hover:", err);
            }
            return; // no hover content
        }
    });
}

In this snippet:
	•	We register a hover provider for all file URIs (you might filter by language if you only want to summarize code files).
	•	We get the word under the cursor (symbol). Potentially, we might want to get the AST node or fully qualified name instead of just a word. VS Code’s hover doesn’t directly give the AST; for more accuracy, Arela’s AST parser can map a position to a function or class name. If ArelaBackend provides something like getSymbolAt(filePath, position) that returns the semantic identifier, use that. For now, using the word is a simplification.
	•	We call ArelaBackend.getSummary(filePath, symbol). This function should return a cached summary (as Markdown string) if available, or trigger one in background if not. For performance, we do not want to call an LLM here. If summary is missing we can either:
	•	Return nothing (no hover) the first time, and asynchronously compute and cache so next hover shows it.
	•	Or return a placeholder hover (“🛈 Summarizing…”) and then update once ready. However, updating hover after it’s shown is tricky (hover would hide by then).
	•	Better: proactively cache by pre-indexing.

Suppose Arela’s memory system (hexi-memory and summarization modules) can pre-generate summaries. We could run ArelaBackend.indexWorkspace() on activation (or via a command) to prepare summaries of all files/functions. This could be time-consuming on a large codebase, so perhaps do it lazily: generate summary for a file when first requested, cache it on disk (maybe using Arela’s sqlite vector DB or just a JSON in extension global storage).

For brevity, assume ArelaBackend.getSummary is fast (lookup). That likely uses Arela’s internal cache (maybe better-sqlite3 or vector DB). If Arela’s summarizer isn’t instantly accessible, we might have to implement a quick summarizer ourselves or ensure Arela is warmed up.

Markdown Content: The summary text we get should be in Markdown format. For example:

**Function:** `processData`  
**Purpose:** Parses input and aggregates results.  
**Complexity:** 🟢 *O(n)* (linear in input size).  
**Notes:** Uses streaming JSON parser for efficiency.  

We can include backticks for code, bold for labels, etc. VS Code’s hover will render this and even highlight inline code or fenced code blocks with syntax if provided ￼ ￼. If we include a fenced code block (like an example usage), we can specify the language for highlighting, e.g.:

\`\`\`typescript
// Example usage
processData(data);
\`\`\`

This would be syntax-highlighted properly in the hover.

Performance: By doing a simple lookup, the hover appears quickly. The hover provider code runs in extension host on each hover event, so it must be very quick. If not, VS Code might delay or not show the hover. That’s why caching is critical. We should also avoid heavy computations on every hover event. If needed, throttle repeated calls (though VS Code usually triggers once when mouse stops moving).

Caching Implementation: Arela likely has caching, but the extension can also maintain an in-memory cache (like a Map of filePath-> {symbol: summary}). On extension activate or on file open, you could preemptively summarize the file’s top-level symbols (maybe parse AST via Arela’s extractor and run codeSummarizer on each function). If that’s too slow, do it on-demand.

One potential optimization: use VS Code’s DocumentSymbolProvider to get outline of the file, then call summarizer for each symbol in that outline in background.

Also, store results in ExtensionContext.workspaceState or globalState if needed to persist between sessions, or rely on Arela’s persistent storage.

Registering the hover: We already did that in activate via registerHoverProvider().

Example HoverProvider usage:

Once implemented, when the user hovers over a symbol, Arela’s summary appears as a native tooltip. For instance, hovering over a function definition could show:

Function: analyzeFunction
Responsibility: Analyzes the AST of a function and generates a report.
Complexity: 🟡 O(n^2) – nested loop over input parameters.
Performance Considerations: Could be optimized by caching intermediate results.
Security Notes: Uses eval internally (potential risk).

(This is just an illustrative format.)

Pitfalls & considerations for Hover:
	•	Make sure to return a vscode.Hover only if we have meaningful content. Otherwise, returning undefined will let other hover providers (or default language hovers) show, e.g., TypeScript’s documentation. We might want to combine Arela’s summary with the normal hover info. VS Code merges multiple hover results ￼ ￼. So, if TypeScript’s language service provides a hover, and we provide one, the user will see both. That might be fine. Alternatively, we could choose to only show our hover in certain contexts or perhaps append to existing hover (there’s advanced API to detect if language hover exists, but not easily – simpler is to always provide it and let user see two sections).
	•	Keep hover text concise and readable; use bullet points or line breaks. Very long text in a hover is hard to read. If needed, we could truncate and say “… (more in Arela panel)” with a command link.
	•	Use vscode.MarkdownString and set isTrusted to false unless you have links that you want to be clickable (and you trust content). We likely keep it false for safety, unless we want to support e.g. a [More Details] link that triggers a command.
	•	Performance fallback: If not indexed, a slow hover could degrade experience. If absolutely necessary, one idea is to show a hover quickly saying “Generating summary…” and then perhaps recompute. But since hovers disappear when you move, it’s tricky. Better to ensure caching via background tasks.

Semantic Search Panel

Goal: Allow the user to search the codebase semantically (natural language or by example code) and get relevant results (likely via vector search in Arela’s memory). Results should be shown with snippets and allow clicking to open the file at the relevant location.

We have two design options:
	•	A TreeView based UI: Use vscode.TreeDataProvider to display search results in a tree/list form (each result as an item, possibly grouped by file or relevance).
	•	A Webview based UI: Similar to chat, build a custom HTML list for results (with rich formatting). This might allow nicer display (highlighted code excerpt in each result).

Using a TreeView is simpler for basic clickable list, and integrates with VS Code’s theming nicely. We won’t get syntax highlighting in a TreeView out of the box for code snippets, but we could include a short code excerpt in the description. Alternatively, use a Webview if we need a more elaborate view.

For MVP, let’s try TreeView for search results:
	•	We contribute a TreeView in package.json with id arelaSearchView (as in our structure above) under the sidebar (or under a custom container).
	•	We implement SearchResultsProvider as TreeDataProvider<SearchResultItem>.

Define a SearchResultItem type:

class SearchResultItem extends vscode.TreeItem {
    fileUri: vscode.Uri;
    line: number;
    preview: string;
    constructor(fileUri: vscode.Uri, line: number, preview: string, score: number) {
        super(`${fileUri.fsPath.split('/').pop()}:${line}`, vscode.TreeItemCollapsibleState.None);
        this.fileUri = fileUri;
        this.line = line;
        this.preview = preview;
        // Show the file name:line as label, and maybe preview as tooltip
        this.description = preview;
        this.tooltip = `${fileUri.fsPath}:${line}\n${preview}`;
        // Optionally, set an icon or resource if desired.
        // Maybe sort by score? Could incorporate score in description or tooltip.
    }
}

The SearchResultsProvider:

import * as vscode from 'vscode';
class SearchResultsProvider implements vscode.TreeDataProvider<SearchResultItem> {
    private results: SearchResultItem[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<SearchResultItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Call this when new results are ready
    refresh(results: SearchResultItem[]): void {
        this.results = results;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: SearchResultItem): vscode.TreeItem {
        return element;
    }
    getChildren(element?: SearchResultItem): SearchResultItem[] {
        if (element) {
            return []; // no nested children
        } else {
            return this.results;
        }
    }
}

We will instantiate this in activate and call it when a search is performed. But how to trigger a search? Options:
	•	Add a command (in Command Palette or a UI input in the tree view) to prompt user for a query and perform search.
	•	Provide an input box at top of the tree view. VS Code’s TreeView API doesn’t have a built-in input box, but we can use the View Title menu contribution to add a search icon that triggers an input.

For instance, in package.json:

"menus": {
  "view/title": [
    {
      "command": "arela.promptSearch",
      "when": "view == arelaSearchView",
      "group": "navigation"
    }
  ]
}

And define the command arela.promptSearch which uses vscode.window.showInputBox to get a query, then calls Arela search.

In commands.ts:

export function registerContextCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('arela.promptSearch', async () => {
          const query = await vscode.window.showInputBox({ prompt: "Enter search query (natural language or code)" });
          if (query) {
              performSemanticSearch(query);
          }
      }),
      vscode.commands.registerCommand('arela.openSearchResult', (item: SearchResultItem) => {
          if (item?.fileUri) {
              vscode.window.showTextDocument(item.fileUri, { selection: new vscode.Range(item.line, 0, item.line, 0) });
          }
      })
    );
}

We register two commands:
	•	arela.promptSearch to initiate a search.
	•	arela.openSearchResult to open the file at the result location.

We need to tie arela.openSearchResult to clicking an item. In our SearchResultItem class, we can specify this.command = { command: 'arela.openSearchResult', title: 'Open File', arguments: [this] }. This way, clicking the tree item invokes the command with that item as argument.

Now, performSemanticSearch(query) would be implemented to call Arela’s search (likely via ArelaBackend.search(query) that uses Arela’s vector search on the codebase). For example:

async function performSemanticSearch(query: string) {
    try {
        statusItem.text = '$(robot) Arela: Searching...'; // update status bar
        const results = await ArelaBackend.search(query);
        // results could be an array of { file, line, snippet, score }
        const items = results.map(res => new SearchResultItem(vscode.Uri.file(res.file), res.line, res.snippet, res.score));
        searchProvider.refresh(items);
        statusItem.text = '$(robot) Arela: Ready';
        if (items.length === 0) {
            vscode.window.showInformationMessage('Arela found no relevant code for your query.');
        }
    } catch (err) {
        statusItem.text = '$(robot) Arela: Ready';
        vscode.window.showErrorMessage('Search failed: ' + (err.message || err));
    }
}

We’d call this function from the arela.promptSearch after getting query. The ArelaBackend.search might internally call the external arela_search tool (MCP) or use Arela’s vector.search module to get nearest code embeddings. This might involve reading an index from SQLite. Ensure the search backend is initialized (maybe Arela built the index on startup or first use).

Display of results: We set the TreeItem label to filename:line, and description to a snippet. The snippet could be truncated. The tooltip shows full path and snippet. We could also format the snippet in code style by wrapping in backticks or quotes, but TreeView will likely show as plain text. If we wanted syntax highlighting, a Webview might be needed; however, for MVP, plain text snippet is acceptable.

Click navigation: We used showTextDocument with a selection at that line. That will open the file and highlight the line. If we want to highlight the entire relevant range, we might need more info (e.g., highlight lines X to Y). We can refine if needed.

Context & Filtering: The query might be natural language (“Where do we parse JSON?”) or code (“MyFunctionName”). Arela’s RAG should handle it. We don’t filter by file type here, but if needed (like search only in same project vs dependencies), Arela can handle.

Performance considerations:
	•	Searching 10k+ files could be heavy. Arela likely uses a vector index. Make sure to load that index once (maybe on extension activation, load into memory or ensure the Arela MCP server is ready).
	•	If search is slow (>2s), consider showing a progress notification. We updated the status bar and can also do withProgress or show a spinner in the tree view title. A trick: update the view title temporarily to “Searching…”.
	•	Also consider debouncing if integrating with an interactive search box (not in our MVP, since we just prompt once per search).

Alternate UI: A more sophisticated approach is to have a search input at top and results below in one webview. But TreeView approach is quicker to implement using VS Code components.

Advanced: We could allow multi-hop queries (as Arela supports multi-hop reasoning). That might involve Arela doing multiple searches or summarizations behind the scenes for a single question. For the extension, it’s mostly transparent – user asks a complex question, and Arela returns some results or final answer.

Context Menu Commands (Summarize, Analyze, Find Usage)

We contributed commands for context menus earlier. Now implement their functionality:
	•	Summarize File: When user right-clicks a file in Explorer and chooses this, we should generate a summary of that entire file (maybe a high-level overview + important functions). We can either show the summary in a pop-up (e.g., open a new text document or webview), or send it to the chat panel, or show in an output channel.

For a quick way, we can use VS Code’s Output Channel or a virtual document. But a nice approach: open a new untitled tab with the summary in Markdown (so it’s read-only but user can see it). Or simply show an InformationMessage if short.

If the file is large, summary might be long; better to show it in a scrollable document.

Example using an untitled doc:

vscode.commands.registerCommand('arela.summarizeFile', async (uri: vscode.Uri) => {
    const filePath = uri.fsPath;
    try {
        const summary = await ArelaBackend.summarizeFile(filePath);
        const doc = await vscode.workspace.openTextDocument({ content: `# Summary of ${path.basename(filePath)}\n\n${summary}`, language: 'markdown' });
        vscode.window.showTextDocument(doc, { preview: false });
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to summarize file: ${err.message || err}`);
    }
});

This will call Arela’s summarizer and open a new tab with a Markdown summary. The user can read it and close it when done. (We mark preview: false so it doesn’t reuse the same tab each time, allowing multiple summaries open if needed.)
	•	Analyze Function: If a user selects a function (or places cursor inside it) and triggers this, Arela should perform a deeper analysis (maybe architecture impact, potential bugs, improvements). We could output this similarly in a new doc or in the chat. Perhaps we output to the chat panel for an interactive feel: by sending the selected code and question to chat. But that might mix with user conversation.

Alternatively, open a panel or output. For simplicity, we can piggyback on chat: implement arela.analyzeFunction to essentially do: “Analyze this function for [something]” via Arela and show result.

For now, we do like summarizeFile but scope to selection:

vscode.commands.registerCommand('arela.analyzeFunction', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selection = editor.selection;
    const code = editor.document.getText(selection.isEmpty ? editor.document.getWordRangeAtPosition(selection.start) || new vscode.Range(selection.start, selection.start) : selection);
    try {
        const analysis = await ArelaBackend.analyzeCode(code, editor.document.languageId);
        const doc = await vscode.workspace.openTextDocument({ content: `# Analysis of Selection\n\n${analysis}`, language: 'markdown' });
        vscode.window.showTextDocument(doc, { preview: false });
    } catch(err) {
        vscode.window.showErrorMessage(`Analysis failed: ${err.message || err}`);
    }
});

This grabs either the current selection or (if none) maybe the word or function at cursor, then calls Arela’s analysis. The analysis might include things like code quality, potential issues, etc., which Arela might provide.
	•	Find Usage (Semantic): This would take the selected text (symbol) and perform a semantic search for references, rather than just text grep. We can simply call our semantic search functionality behind the scenes. Possibly just call performSemanticSearch(selectedWord) so results show up in our search panel.

Alternatively, if Arela has a dedicated “find usage” that uses a code graph, that might be even more precise. Use Arela’s graph.findUsages(symbol) if available.

We could implement:

vscode.commands.registerCommand('arela.findUsage', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const symbol = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.start) || editor.selection);
    if (!symbol) return;
    vscode.commands.executeCommand('arela.promptSearch', symbol);
});

This reuses the search command with the symbol as initial query.
	•	Ask Arela (with Context): If user selects some code and right-click “Ask Arela”, we want to send that to the chat as context. Perhaps open the chat panel (if not visible) and pre-fill or directly send a question like “Explain this code:” + the code. We can do:

vscode.commands.registerCommand('arela.askInChat', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const code = editor.document.getText(editor.selection);
    if (!code.trim()) return;
    // Ensure chat view is visible
    await vscode.commands.executeCommand('workbench.view.extension.arelaChatView');
    // Post a message to webview with the question (assuming ChatPanelProvider is accessible or via ArelaBackend)
    const question = "Explain the following code:\n```\n" + code + "\n```";
    ChatPanelProvider.instance?.postMessage({ type: 'addUserMessage', text: question });
    ChatPanelProvider.instance?.handleUserInput(question);
});

We might need to store a static instance of ChatPanelProvider when constructed to call it here (or route through ArelaBackend). Essentially, we simulate a user input with the code snippet included in a markdown code block. This way the assistant gets the code context. (We could also modify ArelaBackend.askQuestion to accept context separately, but easier is just including in prompt.)

Note: The command workbench.view.extension.arelaChatView (constructed as "onView:arelaChatView" in activation events) should reveal the chat panel. Alternatively executeCommand('arelaChatView.focus') if such exists, but using the built-in onView activation might just open it.

Registering these commands: They should be added to registerContextCommands as shown. Also ensure they are listed in package.json commands.

User Experience:
	•	Provide keyboard shortcuts for some commands (via contributes.keybindings if desired, e.g., Ctrl+Shift+A for Ask Arela).
	•	Also integrate with Command Palette by giving the commands a title (we did via title in package.json) – then user can press Ctrl+Shift+P and type “Arela” to see options.

Inline Code Suggestions (Auto-Completion)

Goal: While typing code, Arela can suggest the next chunk or a solution, similarly to GitHub Copilot. This involves intercepting the code completion pipeline and providing an AI-generated suggestion.

VS Code supports Inline Completion via vscode.languages.registerInlineCompletionItemProvider ￼, which is suitable for ghost-text like suggestions. We can implement InlineSuggestionProvider that on each trigger gives one or more suggestions.

Alternate approach: use registerCompletionItemProvider for standard intellisense suggestions. But those appear in the dropdown; Copilot-like ghost text uses InlineCompletion API introduced in VS Code 1.67+.

Our earlier code snippet in activate already registers an inline provider:

vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, new InlineSuggestionProvider())

This applies to all files (pattern '**'). We can restrict to certain languages if desired.

Implement InlineSuggestionProvider:

import * as vscode from 'vscode';

export class InlineSuggestionProvider implements vscode.InlineCompletionItemProvider {
    async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[]> {
        const lineText = document.lineAt(position).text;
        const prefix = lineText.substring(0, position.character);
        // Optionally gather more context: e.g. last 100 lines or the function code
        const precedingCode = document.getText(new vscode.Range(position.line - 30 >= 0 ? position.line - 30 : 0, 0, position.line, position.character));
        try {
            const suggestion = await ArelaBackend.completeCode(document.languageId, precedingCode);
            if (suggestion) {
                const item = new vscode.InlineCompletionItem(suggestion, { start: position, end: position });
                // Optionally set a command on accept, or a tooltip
                return [ item ];
            }
        } catch(err) {
            console.error("Completion error:", err);
        }
        return [];
    }
}

This simplistic provider:
	•	Gathers some context (prefix of current line and some preceding lines).
	•	Calls ArelaBackend.completeCode(lang, contextSnippet) which should return an AI-generated completion string for that context.
	•	If a suggestion is returned, we create an InlineCompletionItem. We specify the range as 0-length at cursor (start = end = current position), meaning the text is to be inserted at cursor.
	•	We could also generate multiple suggestions and return a InlineCompletionList with them, but usually one strong suggestion is fine (Copilot typically provides one and pressing Ctrl+[ cycles alternatives).
	•	The extension can also assign different “sortText” or filters, but inline completions are presented directly as ghost text, not in a list.

ArelaBackend.completeCode: This likely calls one of Arela’s agents (maybe Codex or local model) to get a completion. It might use the same models but with a prompt like: provide continuation for the given code context. If Arela doesn’t have a ready function, we might directly call OpenAI’s code model if key is present. But given Arela orchestrates multi-agents, perhaps it has a “code completion agent”.

For now, assume it’s implemented (calls OpenAI Codex or similar). If offline, maybe use a local model (like StarCoder via Ollama). Provide languageId to help pick appropriate model.

Ranking & context: Keep context snippet not too large to avoid slow responses. Possibly limit to a few hundred tokens before cursor. We might also include function signature or name as part of prompt. E.g., if user is inside a function, consider sending the function signature and preceding code. This can improve quality.

Performance: Completions must be fast (<500ms ideally) for good UX, otherwise users type faster than it appears. If model is slow, maybe trigger only on specific events (like manual trigger or certain characters). However, Copilot shows ghost text as you pause typing. We might do similarly: the InlineCompletionContext might tell if it was invoked manually or automatically. If automatically on every keystroke, we must ensure not to overload the AI calls. Possibly add a debounce: e.g., only query after user paused typing for 500ms. The VS Code API doesn’t directly provide a pause event, but we can track via a timer inside provider or rely on model streaming. Given complexity, for MVP, we can let the user trigger suggestions via Ctrl+Enter (if we set in package.json a keybinding to trigger inline suggestion, or they use the default). But for parity with Copilot, we may attempt always-active suggestions.

Ghost Text Display: VS Code will show the suggestion as translucent text. If user accepts (Tab or something by default), it inserts. We might want to set up a command on acceptance (like logging feedback). There is a way to know if user accepted an inline suggestion (perhaps via inlineCompletionItem.command). We can attach a command that calls ArelaBackend.feedback(reward) to reinforce learning if needed (Arela has feedback learning).

Example:

const item = new vscode.InlineCompletionItem(suggestion);
item.command = { command: 'arela.feedback', title: 'Feedback', arguments: [ true ] };

Then register arela.feedback to handle (here just stub: if true means accepted, false means rejected, which VS Code might not easily signal though).

Testing Inline Completions: After implementing, in a file, start typing code and see if suggestion appears. If not, may need to adjust triggers (like context suggests triggers when user presses e.g. Ctrl+Space or specifically the inline suggestion command).

Note: In VS Code settings, user might have to enable inline suggestions (some versions had it off by default unless an extension specifically uses it).

Code Actions (Quick Fixes) – Future

(For future version, not MVP, but outline for completeness.)

Arela could detect certain patterns and suggest fixes or refactors. Using vscode.languages.registerCodeActionsProvider, we can provide CodeAction for a given document range if certain conditions are met ￼. For example, if Arela’s analysis finds a vulnerability, we could surface a code action “Apply security fix”.

Implementing this requires:
	•	Running some analysis on documents (maybe on save or on file open) to gather issues. Or call an AI on demand when VS Code requests code actions for a range.
	•	If an issue is found, return a CodeAction with title and an edit (WorkspaceEdit) to apply the fix, or a command to open something.

For instance:

vscode.languages.registerCodeActionsProvider('javascript', {
    provideCodeActions(doc, range, context, token) {
        const fixes: vscode.CodeAction[] = [];
        for (const diag of context.diagnostics) {
            if (diag.code === 'ARELA_SECURITY' || diag.message.includes('SQL Injection')) {
                const action = new vscode.CodeAction(`Fix potential SQL injection`, vscode.CodeActionKind.QuickFix);
                action.edit = new vscode.WorkspaceEdit();
                // some edit to parameterize query...
                fixes.push(action);
            }
        }
        return fixes;
    }
});

This example triggers on diagnostics (we would have to produce such diagnostics first). Or we could have a code action independent of diagnostics, but usually it’s tied to either a diagnostic or context (like selection). We can also create Refactor type code actions.

Due to complexity of analyzing code for specific refactor, this is left for later. But keep in mind extension points:
	•	CodeActionProvider for quick fixes/refactors.
	•	Possibly CodeLensProvider to add inline hints (like “+ See summary” above functions – might be interesting, user clicks a code lens to get summary).

Diagnostics (Problems) – Future

Arela can act like a smart linter, identifying potential bugs, smells, or vulnerabilities. We can integrate that via VS Code’s Diagnostics API:
	•	Create a vscode.DiagnosticCollection ￼.
	•	Run analyses (maybe on file save or via a command) and populate diagnostics for a file with messages, severities, and codes.
	•	Those appear in VS Code’s Problems panel and with squiggly underlines.

For example:

const diagCollection = vscode.languages.createDiagnosticCollection('arela');
function analyzeDocument(doc: vscode.TextDocument) {
    const diags: vscode.Diagnostic[] = [];
    const issues = ArelaBackend.staticAnalyze(doc.getText(), doc.languageId);
    for (const issue of issues) {
        const range = new vscode.Range(issue.line, 0, issue.line, Number.MAX_VALUE);
        const diag = new vscode.Diagnostic(range, issue.message, issue.severity);
        diag.code = 'ARELA_' + issue.type;
        diags.push(diag);
    }
    diagCollection.set(doc.uri, diags);
}

Then call analyzeDocument on file open/change. This would highlight problems.

Be careful to only do this when appropriate; running an AI analysis on every keystroke is too slow. Maybe do it on save or when user explicitly triggers “Run AI Analysis on this file”.

This could be a powerful feature but likely post-MVP.

Performance and Optimization

Building an AI extension that remains fast requires careful consideration:
	•	Avoid UI Thread Blocking: The extension host is separate from VS Code’s UI thread, but if the extension host loops heavily (CPU-bound work), it can still lag responses (e.g., slow to respond to hover or completions). Offload heavy CPU tasks (like parsing all files) using setImmediate or splitting into chunks. If extreme, use worker threads or an external process (we already do for Arela core). All LLM calls are inherently async (network or subprocess), so they won’t block the event loop if we await them – but they will occupy time before returning results.
	•	Lazy Initialization: Don’t load everything upfront. Perhaps load models or indexes on first use. For example, delay starting a big vector index until first search query. However, some things like hover summaries we want ready – so maybe do a partial preload but yield control periodically.
	•	Progress Indicators: For any operation that might take >500ms, give user feedback. We used withProgress for chat and search. Also update the status bar as we did. This prevents the user from thinking VS Code froze if they accidentally trigger a heavy operation.
	•	Memory Management: If the codebase is large (10k files), an in-memory index could be big. Arela likely uses a SQLite DB for vectors, which is fine. Ensure to close it on deactivate to avoid corruption. The extension should handle memory carefully – e.g., clear caches if not used or limit summary cache size. But since Arela’s memory is 6-layer, perhaps some layers are ephemeral and some persistent on disk.
	•	Caching Summaries: We touched on caching code summaries for hover. Implementing a persistent cache (maybe backed by better-sqlite3 or a JSON) ensures once computed it’s reused across sessions. Ensure cache invalidation – e.g., if code changes, update the summary. VS Code’s file watch API (vscode.workspace.onDidSaveTextDocument) can be used to invalidate or recompute the summary for that file on save.
	•	Indexing in Background: On activation, you might kick off a background task to index the workspace. If using an external process (MCP server), it might do that itself. If doing in extension, consider vscode.workspace.findFiles('**/*.{ts,js,py,java,go}', '**/node_modules/**') to list files and process them one by one, updating a progress indicator. However, doing this heavy lifting could slow startup. You might instead wait until the user first opens the chat or triggers a search, then ensure indexing is done. Communicate status via the status bar (“Indexing…”).
	•	Timeouts: If an AI call is taking too long (maybe stuck), implement a timeout to avoid waiting indefinitely. For example, for search or chat, if no response in, say, 60 seconds, abort and inform user.
	•	Testing at scale: Try the extension on a large repo and profile memory/CPU. Optimize any obvious bottlenecks (e.g., unnecessary JSON serialization or redundant computations).

User Experience Best Practices

To ensure a good UX:
	•	Command Palette Integration: All features should be accessible via the Command Palette (for discoverability). We’ve registered commands with titles, so “Arela: …” commands appear. Document these in README.
	•	Keyboard Shortcuts: Consider adding default keybindings for common actions. For example, a keybinding to focus the chat (like Ctrl+Shift+A to open Arela chat panel quickly), or to trigger inline suggestion (though usually it’s automatic). Keybindings can be added in package.json “contributes.keybindings” section, e.g.:

"keybindings": [
  { "key": "ctrl+shift+a", "command": "workbench.view.extension.arelaChatView", "when": "!chatInputFocus" }
]

This example focuses the chat panel. Ensure not to conflict with existing shortcuts.

	•	Status Bar Feedback: We added a status item that shows Arela’s status (indexing, ready, answering, etc.). Use icons and short text. For example, while indexing, $(sync~spin) Arela: Indexing... (the ~spin on an icon ID makes it spin ￼). When ready, show a neutral icon with “Ready”. On error states, maybe a warning icon.
	•	Notifications: Use sparingly. Informational messages like “No results found” or “File summarized” are fine, but do not overuse popups. Use status bar or inline UI where possible. For example, after search, we chose to show a message if no results.
	•	Settings & Configuration: Expose settings for users to configure Arela. E.g., model selection (local vs OpenAI), API keys, enable/disable certain features. In package.json contributions, we can define a configuration schema:

"contributes": {
  "configuration": {
    "title": "Arela Assistant",
    "properties": {
      "arela.enableInlineSuggestions": {
        "type": "boolean",
        "default": true,
        "description": "Enable AI inline code suggestions."
      },
      "arela.maxHoverSummaryLength": {
        "type": "number",
        "default": 200,
        "description": "Maximum characters for hover summaries."
      },
      "arela.openAI.apiKey": {
        "type": "string",
        "description": "OpenAI API Key for Arela (if using cloud).",
        "secure": true
      }
    }
  }
}

The secure: true will store that setting in secret storage automatically ￼ if VS Code supports (for user-level secret).
Users can then set these in settings UI. Provide sensible defaults so it works out-of-box with local models if possible.

	•	Help and Onboarding: Consider adding a README with usage instructions (the VS Code marketplace will show it) and maybe a “Getting Started” walkthrough in the extension (VS Code supports walkthrough content in contributions). For example, a walkthrough page guiding the user to try a chat, a hover, etc.
	•	Graceful Degradation: If internet is off and no local model, the extension should inform the user (“Arela: offline, no response available”) rather than hang. In ArelaBackend, detect connectivity or catch fetch errors and handle gracefully. Perhaps have an offline mode config that uses only local models (like instruct Arela to switch to Ollama).
	•	Feedback loop: If Arela learns from feedback, provide UI to give feedback. For example, after an inline suggestion is accepted or rejected, send that info to Arela. Or have thumbs-up/down buttons in chat messages. This can call Arela’s learning module (dynamic weight adjustment).
	•	Privacy: Ensure to respect user code privacy if sending to cloud. Perhaps have a setting to disable cloud usage (only local). Or prompt user for consent on first use of an online model.

Error Handling

Robust error handling prevents frustration:
	•	Wrap all calls to external processes or APIs in try/catch. We did that in many places, using vscode.window.showErrorMessage to notify user of issues.
	•	If Arela’s subprocess crashes or fails to start, inform the user and possibly guide to install requirements. E.g., if arela CLI not found, prompt: “Arela CLI not found. Please install via npm install -g arela or add to extension dependencies.”
	•	In chat, if an error happens mid-response, ensure the UI doesn’t remain waiting. We could append an error message to chat window so the conversation shows something like “(Arela encountered an error while answering)”.
	•	Provide fallbacks: If OpenAI API fails but a local model is available, catch the error and try the local model. Or vice versa. Logging such events can help improvement.
	•	Logging: Use console.error for internal logs (these go to the Extension Host log output, accessible via Developer Tools). For user-level logging, consider a dedicated Output Channel:

const output = vscode.window.createOutputChannel('Arela');
output.appendLine('Extension activated.');

Use output.appendLine for significant events (especially if debugging issues on user machines). Not too verbose, or make verbosity configurable.

	•	Edge cases: If the user triggers multiple actions simultaneously (e.g., two searches quickly, or asks a new question while one is streaming), handle it. Perhaps queue chat requests or cancel previous. Could implement a simple semaphore: if a chat is ongoing, either reject new or cancel old.
	•	If extension is deactivated (VS Code closing or reloading), ensure to terminate Arela subprocess to not leave orphans. Implement deactivate() to kill the process (arelaProcess.kill()).
	•	For memory heavy tasks, also catch any out-of-memory errors, though that’s rare at extension level.

Testing the Extension

Testing can be done at multiple levels:

Unit Testing

For pure functions (if we have any, e.g., utility functions like markdownToHtml, or logic like caching), use a framework like Mocha (which Yeoman sets up) or Jest. These can run outside VS Code if they don’t need the VS Code API. Keep logic separated from VS Code API where possible to allow such testing (for example, ArelaBackend functions can be tested by mocking the Arela responses).

Integration Testing

VS Code provides an Extension Test Runner that launches a real VS Code instance and runs tests inside it ￼. The Yeoman generator likely created ./src/test/suite/extension.test.ts and an associated launch configuration.
We can write tests like:
	•	Activate the extension and verify that certain commands are registered.
	•	Simulate a scenario: open a sample file, trigger hover, see if a Hover is returned with expected content (using VS Code API to execute a hover provider via vscode.commands.executeCommand('vscode.executeHoverProvider', doc.uri, position) which returns hover contents ￼).
	•	Test that the webview loads: possibly we can programmatically get the Webview HTML via chatProvider.resolveWebviewView and ensure it contains expected elements.
	•	Use @vscode/test-electron as recommended to run these.

A simple integration test could be:

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Arela Extension Tests', () => {
  test('Hover provides summary', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: 'function foo() {}', language: 'javascript' });
    await vscode.window.showTextDocument(doc);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', doc.uri, new vscode.Position(0, 10));
    assert.ok(hovers && hovers.length > 0, 'No hover returned');
    const hoverText = (hovers![0].contents[0] as vscode.MarkdownString).value;
    assert.match(hoverText, /Function:\s*`foo`/);
  });
});

Here we rely on ArelaBackend returning something for function foo. In tests, you might want to stub ArelaBackend to return a deterministic summary instead of actually calling AI. This can be done by dependency injection or by designing ArelaBackend with override for test.

For the webview, testing is harder in automated way. You might verify that after sending a message, the provider’s postMessage is called appropriately, but that might require exposing some internal or using vscode.commands.executeCommand('arela.askInChat') and then manually checking some state.

Manual Testing

Given the complexity, manual testing is crucial:
	•	Test on different languages (JS, Python, etc.) to see if features like hover and search adapt.
	•	Test offline scenario: disconnect internet, ensure no unhandled promise rejections, and local model path is used.
	•	Test the extension on all OS if possible (especially if including native modules or spawning processes).

Debugging the Extension
	•	Use VS Code’s debugger to launch the Extension Host (the generator provides a launch config for this). You can set breakpoints in your extension code. Logging with console.log goes to the Debug Console of the Extension Host.
	•	To debug the webview’s code (chat.js), you can use Developer Tools: in the Extension Development Host, run the command “Developer: Open Webview Developer Tools” ￼. This opens Chrome DevTools for your webview, where you can inspect HTML and console.log output from chat.js. This is extremely useful for debugging the chat UI.
	•	If something isn’t working (e.g., command not found), check that package.json contributions are correct and that activationEvents cover the scenario. Use the Developer Tools console to see any errors (e.g., if a command registration threw or some promise rejection).
	•	In case of native module issues (like the dreaded NODE_MODULE_VERSION mismatch), run Developer: Toggle Developer Tools in the Extension Host, and see the console for such errors. That indicates the bundling problem we discussed; the solution likely to avoid using those modules in extension directly.

Packaging and Publishing

When ready to release:
	•	Use vsce (Visual Studio Code Extension CLI) to package the extension. Running vsce package in the project will create a .vsix file. Ensure you’ve updated the version in package.json appropriately.
	•	Bundling: We skipped bundling initially (generator’s webpack = No). That means the vsix will include all .js files in out plus node_modules. If Arela’s node_modules is heavy, this could create a large extension. Consider bundling to reduce size and ensure all needed files are included. The VS Code docs have a “Bundling Extensions” guide ￼ – typically, you’d set up webpack to produce a single file for your extension code. If using webview with frameworks, you’ll also bundle those separately or as part of extension bundle.
	•	If including native modules, as noted, it’s problematic on Marketplace. Official stance: not supported ￼. If Arela can’t function without better-sqlite3 or tree-sitter, you have a tough call:
	•	You might exclude those from vsce (via .vscodeignore file) and require user to install Arela separately.
	•	Or publish separate vsix per platform with pre-compiled binaries – but Marketplace doesn’t handle platform-specific extensions easily (it can mark extension as VS Code Desktop only, but not auto-select OS).
	•	A safer approach: find alternatives. For example, use WebAssembly versions of tree-sitter (there are WASM parsers for tree-sitter that can run in Node without native bindings), and use a pure JS vector store (or an HTTP server for SQLite).
	•	Perhaps for MVP, target a subset: if just testing privately, you can include compiled modules for your OS. For public Marketplace, likely need to remove them. (Some extensions have done native modules by including multiple binaries and choosing at runtime, but it’s not elegant).
	•	Marketplace requirements: Ensure you have a unique publisher name and extension ID. Obtain a Personal Access Token and use vsce publish or use GitHub Actions CI for publishing (there’s an official action).
	•	Versioning: Follow semantic versioning (Major.Minor.Patch). Going from 4.x to 5.0.0 implies major update. Mark it accordingly. If releasing pre-release, you can tag versions as 5.0.0-beta etc., which VS Code can handle as pre-release if you mark in Marketplace.
	•	Extension Category: In package.json, categorize it (e.g., “AI Tools” or “Other”). Add keywords like “AI”, “code assistant”, so users can find it.
	•	README and Media: The Marketplace listing is generated from README.md and any images you reference. Include screenshots or animations of your extension in action. That helps users understand it.
	•	Licensing: If Arela is proprietary or requires a license, clarify that. If using OpenAI models, mention the need for API key. Ensure compliance with their terms.

Updates & Auto-update

Users who install from Marketplace will get updates automatically when you publish new versions. If you distribute .vsix manually, they’d have to reinstall those for updates.

We should handle migrating settings if any breaking changes in settings keys between versions. Typically, just maintain backward compatibility or document changes.

If we ever need to run upgrade logic (like converting a cache file format on update), the extension can check its previous version (stored in memento globalState) and perform needed migration.

Step-by-Step Implementation Checklist

Finally, here’s a condensed checklist to implement Arela VS Code Extension v5.0.0:
	1.	Scaffold Extension – Use yo code to create a TypeScript extension project. Configure package.json (name, publisher, etc.) and basic structure.
	2.	Integrate Arela Backend – Decide on in-process vs external. Implement ArelaBackend module to initialize Arela (import or spawn server) and provide methods: askQuestion, summarizeFile, search, completeCode, etc. Test that Arela core can be invoked (e.g., try a simple query in extension activation and log result).
	3.	Chat Panel UI – Set up ChatPanelProvider (WebviewView). Create the HTML/CSS/JS for chat. Register the provider in activate. Implement message passing both ways. Test manually: open the chat view, type a dummy message, simulate a response via postMessage.
	4.	Hover Provider – Implement and register provideHover. Connect to Arela’s summary cache. For initial testing, you might hardcode a response or use a simple function. Then connect to real summarizer once indexing is in place.
	5.	Context Menu Commands – Register commands for Summarize, Analyze, Find Usage, Ask in Chat. Implement their handlers calling ArelaBackend. Use dummy data first to verify UI (e.g., open a temp doc with “Summary…”). Then integrate real Arela calls.
	6.	Semantic Search – Implement SearchResultsProvider and TreeView. Hook up the search command to populate it. Test by returning some fake results, ensure clicking works (opening files).
	7.	Inline Suggestions – Register InlineCompletionProvider. For testing, you might return a static suggestion for certain trigger (like always suggest // TODO comment) to see it appear. Then integrate Arela’s completion API.
	8.	Status Bar – Create a status bar item on activate. Update it during long operations (search, chat). E.g., set to “Thinking…” when AI is answering, back to “Ready” after. Use icons to make it clear.
	9.	Background Indexing – Implement workspace scan if needed to feed Arela. Possibly call ArelaBackend.buildIndex() on activation and show progress (maybe use window.withProgress with ProgressLocation.Window which shows a progress in status bar ￼). If using external MCP, ensure it indexes project on start (maybe pass project path).
	10.	Caching & Speed – Ensure summary retrieval is cached. Perhaps on the first hover for a file, call Arela to summarize the file (if not done) and store it. Use VS Code’s workspaceState or Arela’s DB for cache.
	11.	Testing – Run through all features manually:
	•	Chat: Ask a code question, get answer (both with internet and offline if possible).
	•	Hover: Hover many symbols, see if fast and correct.
	•	Search: Try a keyword and a natural query, verify results open.
	•	Context menu: Summarize a large file, see if output is formatted. Analyze a function with selection vs without.
	•	Inline suggest: Type code like for ( in an empty JS file, see if it suggests a loop completion, etc.
	•	Error handling: Unplug internet or put invalid API key, see if errors are caught nicely.
	12.	Polish – Add README with usage instructions and examples. Possibly add command palette entries like “Arela: Index Workspace” if manual indexing control is desired, or “Arela: Clear Cache”.
	13.	Performance – If any operation feels slow, optimize or add feedback. For example, if first-time open of chat triggers model download (like Ollama pulling a model), show a message “Downloading model…”.
	14.	Publish Prep – Remove dev dependencies, ensure vsce package works. If size is huge, consider bundling or pruning unnecessary files (update .vscodeignore to exclude tests, screenshots, etc.).
	15.	Publishing – Use vsce publish or CI to push to Marketplace.

Each step should be verified before moving to the next to ensure a stable increment.

Deployment Guide

Once the extension is packaged as .vsix or published, users can install it. If you require the Arela CLI or server, make sure to document that. Perhaps the extension can also auto-install Arela CLI by downloading it or running npm install arela in extension folder if missing – but that’s complex, so at least prompt the user.

If the extension can work offline with local models, ensure to include instructions for obtaining those models (for example, if using Ollama, the user might need to install it and the model weights).

Auto-Update is handled by VS Code if installed from Marketplace. We just need to bump version properly on each release.

For any breaking changes in config, handle them gracefully (maybe read old config key and migrate).

Conclusion & Resources

With this comprehensive plan, Arela’s VS Code extension will provide an AI-powered experience akin to GitHub Copilot and Cursor, tailored to Arela’s capabilities. We covered architecture decisions (favoring extension host + Webviews), a full implementation outline of each feature, integration strategies with Arela’s existing codebase, and best practices for performance and UX. Following this guide, you can incrementally build and test each component, resulting in a production-ready extension that enhances developer productivity with Arela’s AI assistance.

Key Resources & References:
	•	VS Code Extension Official Docs – covering [Extension architecture and language features】 ￼ ￼, [Webview Guide】 ￼ ￼, [Tree View Guide], [Notifications and Status Bar】 ￼, [Testing Extensions】 ￼, [Publishing Extensions].
	•	VS Code AI Extensibility Guide – see VS Code’s docs on AI features (Chat, MCP tools, etc.) ￼ for future integration with VS Code’s native chat.
	•	Community Examples – e.g., the ChatGPT VS Code extension (mpociot/chatgpt-vscode) which implements a chat sidebar ￼ ￼, and others like Microsoft’s sample (if available).
	•	Stack Overflow discussions – useful snippets for webview messaging and progress:
	•	Posting messages to Webview ￼ ￼.
	•	Handling native modules in extensions (GitHub issues) – to understand the limitations (native modules not officially supported ￼).
	•	Arela’s own documentation (if any) for MCP usage, to properly call arela_search and others.

By following this guide and utilizing the resources, you should be able to create a powerful VS Code extension that turns Arela into a seamlessly integrated AI coding assistant within the editor. Good luck with building Arela v5.0.0! 🚀