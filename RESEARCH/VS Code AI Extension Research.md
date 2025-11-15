
Arela VS Code Extension (v5.0.0): Architectural Blueprint and Implementation Guide


Part 1: Core Architecture and Integration Strategy

This section establishes the foundational architecture for the Arela VS Code extension. The primary objective is to integrate a sophisticated, existing Node.js backend—which includes AI orchestration, code summarization, and RAG capabilities—into the Visual Studio Code environment. The architecture must meet strict performance requirements ($<100$ms hovers, $<2$s search) and support a complex feature set. A simple, single-process model is insufficient. The analysis dictates a hybrid, multi-process architecture to ensure performance, stability, and maintainability.

1.1 The Definitive Architecture: A Prescriptive Hybrid Model

The query (Q1.1) presents a choice between the Extension Host and the Language Server Protocol (LSP). For an AI assistant of this complexity, this is not an "either/or" decision. A high-performance, responsive extension requires a hybrid model that isolates distinct workloads into specialized processes. The recommended architecture consists of three primary components.
Component 1: The Extension Host (The Coordinator)
The Extension Host is the main entry point for the extension, defined by the extension.ts file.1 It runs in a sandboxed Node.js process managed by VS Code.2 Its role should be strictly limited to coordination:
Activating the extension (via activationEvents in package.json).
Registering all commands, context menus, and status bar elements.3
Initializing and managing the WebView-based UI panels (Chat and Search).
Spawning and managing the two child processes (LSP and MCP Server).
The Extension Host must be kept lightweight. Any CPU-intensive task, such as file I/O, AST parsing, or AI model inference, must not run in this process, as doing so would block the main thread and freeze the VS Code UI.2
Component 2: The Language Server (LSP) (The Real-time Analyst)
Arela's features, such as AI-powered hover tooltips (Feature 2) and inline suggestions (Feature 5), are resource-intensive.4 They require parsing large file sets, building Abstract Syntax Trees (ASTs), and performing static analysis. The Language Server Protocol (LSP) is the industry-standard architecture designed by Microsoft specifically to offload this "significant CPU and memory usage" to a separate, isolated process.4 This ensures that intensive code analysis does not impact editor responsiveness. The Arela LSP will be responsible for all real-time, language-aware features.
Component 3: The child_process MCP Server (The AI Orchestrator)
The Arela codebase already includes a production-ready MCP server (src/mcp/server.ts). The most robust and lowest-risk integration path (Q3.2) is to spawn this server as a dedicated child_process using Node.js's built-in spawn or fork methods.5 This "sidecar" approach 7 provides critical advantages:
Isolation: It isolates the server's runtime and its complex dependencies (including native modules) from both the Extension Host and the LSP, preventing conflicts.
Reuse: It allows for the direct reuse of the existing, tested codebase with minimal refactoring.
Role: This process will handle all discrete, high-latency, user-initiated tasks that involve AI orchestration, such as Chat (Feature 1), Semantic Search (Feature 3), and "Analyze Function" (Feature 4).
This three-process model provides a clear separation of concerns:
Extension Host: UI and process coordination.
Language Server: Real-time, low-latency code intelligence (hovers, suggestions, diagnostics).
MCP Server (Sidecar): User-initiated, high-latency AI orchestration (chat, search, analysis).
The following diagram illustrates this flow:

Code snippet


graph TD
    subgraph VS Code UI
        A
        B
        C
        D
    end

    subgraph Extension Host Process
        E[extension.ts (Activator)]
        E -- registers --> D
        E -- creates/manages --> A
        E -- creates/manages --> C
        E -- spawns/communicates (IPC) --> F
        E -- starts/communicates (LSP) --> G
    end

    subgraph "Language-Aware Features (LSP)"
        G -- provides --> B
        G -- imports --> H(arela-core: summarization, reasoning)
    end

    subgraph "AI Orchestration (Sidecar)"
        F
        F -- imports --> H
        F -- calls --> I[Ollama, OpenAI, etc.]
    end

    A -- postMessage/onDidReceiveMessage --> E
    C -- postMessage/onDidReceiveMessage --> E



1.2 Process Management: Integrating the Arela MCP Server

As identified in the architecture (Q3.2), the existing MCP server should be run as a separate process. Attempting to run it within the Extension Host would block the UI.2
Recommendation: Use child_process.spawn 5 from the Extension Host's activate function.

TypeScript


// In extension.ts
import * as cp from 'child_process';
import * as path from 'path';

let mcpProcess: cp.ChildProcessWithoutNullStreams;

export function activate(context: vscode.ExtensionContext) {
    // Path to the compiled MCP server script
    const serverScript = path.join(context.extensionPath, 'dist', 'mcp_server.js');

    mcpProcess = cp.spawn('node',, { stdio: 'pipe' });

    mcpProcess.stdout.on('data', (data) => {
        // Handle data from the MCP server
    });

    mcpProcess.stderr.on('data', (data) => {
        console.error(`MCP Server Error: ${data}`);
    });

    //... register commands, webviews, etc.
}

export function deactivate() {
    mcpProcess?.kill();
}


The Extension Host will communicate with this sidecar process via Inter-Process Communication (IPC). While stdin/stdout can be used for simple JSON-RPC, a more robust solution is to establish a dedicated IPC channel if using child_process.fork. This approach fully isolates the server's environment and dependencies, dramatically simplifying the integration of the existing codebase.7

1.3 UI Architecture: WebView with React UI Toolkit

For the Chat (Feature 1) and Semantic Search (Feature 3) interfaces, native VS Code components like TreeView are unsuitable. TreeView is designed for hierarchical lists of items 8, not for complex, interactive UIs like a chat window or a search results page.
Recommendation: The only viable solution is the Webview API.9 A WebView provides an iframe within VS Code that the extension controls, allowing for the rendering of any HTML, CSS, and JavaScript content.9
To answer Q2.1 ("React, Vue, vanilla JS?"), the most productive and standards-compliant stack is React combined with the official @vscode/webview-ui-toolkit.
Why WebView: It allows for a "fully customizable" 9 and "complex user interface" 9, which is a firm requirement for the Arela chat and search panels.
Why @vscode/webview-ui-toolkit: A plain HTML view will look and feel alien inside VS Code. This official Microsoft library provides a set of web components (buttons, text fields, dropdowns) that automatically adopt the user's current VS Code theme and design language.10 This is critical for a professional user experience.
Why React: The @vscode/webview-ui-toolkit explicitly provides React wrappers (@vscode/webview-ui-toolkit/react).11 This makes React the officially sanctioned and most productive framework for building complex WebView UIs, as supported by numerous guides and samples.13
This stack provides the customizability of a web app while ensuring the native look and feel of the VS Code editor.

1.4 Project Scaffolding and Monorepo Structure

To implement this hybrid architecture and integrate the existing codebase (Q1.2, Q1.3), a monorepo structure is strongly recommended. This provides a clean separation of concerns and formalizes the dependencies between the different parts of the system.
Scaffolding:
Use the Yeoman generator (yo code) 15 to scaffold two separate projects, which will then be organized into a monorepo:
arela-vscode: Scaffold this using the "New Extension (TypeScript)" template.15 This will become the main Extension Host package.
arela-lsp: Scaffold this using the "New Language Server" template.15 This creates the client/server structure for the LSP.
arela-core: This will be a new package directory containing the entire existing src/ codebase (context-router.ts, summarization/, etc.).
Recommended Monorepo Folder Structure:



arela-v5/
├── package.json               # Monorepo root (using npm/pnpm workspaces)
├── packages/
│   ├── arela-core/            # Your existing TypeScript/Node.js backend
│   │   ├── src/
│   │   │   ├── mcp/
│   │   │   │   └── server.ts
│   │   │   ├── summarization/
│   │   │   ├── context-router.ts
│   │   │   └──...
│   │   └── package.json         # Defines the 'arela-core' API
│   │
│   ├── arela-vscode/          # The Extension Host (client)
│   │   ├── src/
│   │   │   ├── extension.ts     # Main activation file
│   │   │   ├── chatViewProvider.ts
│   │   │   ├── searchPanel.ts
│   │   │   └── mcpServiceClient.ts # Communicates with the child_process
│   │   ├── webview-ui/          # React UI source code
│   │   │   ├── src/
│   │   │   │   ├── ChatView.tsx
│   │   │   │   └── SearchView.tsx
│   │   │   └── package.json
│   │   └── package.json         # Depends on 'arela-core'
│   │
│   └── arela-lsp/               # The Language Server
│       ├── client/            # LSP client (often merged into arela-vscode)
│       │   └── src/
│       └── server/            # LSP server
│           ├── src/
│           │   └── server.ts  # LSP implementation
│           └── package.json   # Depends on 'arela-core'
│
└── tsconfig.base.json


This structure is the definitive answer to "How do I reuse my existing codebase?" (Q1.3, Q3.1). The arela-vscode and arela-lsp packages formally depend on arela-core through package.json. This is not a "direct import" via relative paths but a proper package dependency, which ensures type safety and makes the complex build/bundling process (Part 2) manageable.

Part 2: The Native Module Imperative (T1, Q1.3)

This is the most significant technical hurdle for the Arela extension. The dependencies on tree-sitter and better-sqlite3 are native Node.js modules (C++ add-ons) and will unconditionally fail on installation for most users if not handled with a specific, complex build and distribution strategy.16

2.1 The Electron ABI Mismatch Problem: Why It Fails

The core issue is the Node.js Application Binary Interface (ABI) mismatch.18
When a developer runs npm install, native modules are compiled against the system's Node.js version (e.g., Node 20, which has a specific ABI, say $v115$).
VS Code is an Electron application, which bundles its own internal, and often different, version of Node.js (e.g., Node 18, with ABI $v108$).16
When the Extension Host attempts to require('better-sqlite3'), the Node.js runtime detects this ABI mismatch.
This throws the "was compiled against a different Node.js version" error, and the extension activation fails.16
This is a fundamental constraint of the Electron ecosystem.19 A bespoke strategy is mandatory.

2.2 Critical Recommendation: Migrating from better-sqlite3 to @vscode/sqlite3

The better-sqlite3 dependency is a known and persistent source of friction for VS Code extension developers.17 While it can be made to work, it requires a fragile, custom-managed electron-rebuild process for all target platforms.
Strategic Recommendation: A superior solution is to migrate the arela-core database layer from better-sqlite3 to @vscode/sqlite3.
@vscode/sqlite3 is an officially supported fork/wrapper maintained by Microsoft specifically for this use case.20
It ships with pre-compiled native binaries for all platforms and Electron versions supported by VS Code.
By adopting this module, the entire build, rebuild, and distribution problem for the database dependency is eliminated. This single change significantly de-risks the project. While it requires a one-time migration of the arela-core database code, the long-term saving in build-system maintenance is substantial.

2.3 Bundling Strategy: tree-sitter, Webpack, and electron-rebuild

The tree-sitter dependency is non-negotiable for AST parsing. Since no official VS Code-specific package exists, it must be correctly compiled.
Step 1: Configure the Bundler (Webpack/esbuild)
The extension must be bundled for performance.22 The bundler (Webpack is standard, but esbuild is faster) must be instructed not to bundle native modules. They must be treated as externals.20

JavaScript


// in packages/arela-vscode/webpack.config.js
const config = {
  //...
  target: 'node',
  externals: {
    'vscode': 'commonjs vscode', // Must be external
    'tree-sitter': 'commonjs tree-sitter', // Mark as external
    '@vscode/sqlite3': 'commonjs @vscode/sqlite3' // Also external
  }
};
module.exports = config;


Step 2: Implement electron-rebuild
The @electron/rebuild package is the standard tool for recompiling native modules against Electron's specific headers.19
This must be added as a postinstall script in the package.json of any package that has a native dependency (e.g., arela-core, or arela-vscode if it's the final packager).

JSON


// in packages/arela-core/package.json
{
  "name": "arela-core",
  "dependencies": {
    "tree-sitter": "...",
    "@vscode/sqlite3": "..."
  },
  "devDependencies": {
    "@electron/rebuild": "^3.6.0"
  },
  "scripts": {
    // This script must be run by the CI/dev environment
    "rebuild-native": "electron-rebuild -v <electron_version>"
  }
}


The <electron_version> is critical and must match the version used by the target VS Code release. This can be found in VS Code's documentation or package.json.18

2.4 Publishing Strategy: The Mandate for Platform-Specific VSIXs

The electron-rebuild step in 2.3 creates a .node file for only the platform it's run on (e.g., darwin-arm64 for an M1 Mac). If this single .vsix file is published, it will fail for all users on Windows, Linux, and Intel Macs.
The Solution: The extension must be published as a set of platform-specific .vsix files. The VS Code Marketplace is designed to handle this. The vsce (Visual Studio Code Extensions) tool supports a --target flag for this exact purpose.26
A CI/CD pipeline (e.g., GitHub Actions) is required to manage this. The build process must run a matrix job that:
Checks out the code on the target platform (or a container simulating it).
Installs dependencies.
Runs electron-rebuild for that platform's native modules.
Packages the extension using the vsce CLI, specifying the target.
Example CI/CD Script Logic (Q7.1):

Bash


# This must be run for *each* target platform:
# (win32-x64, win32-arm64, linux-x64, linux-arm64, darwin-x64, darwin-arm64)

# 1. Rebuild native modules for the specific target
# (This step is complex and may require cross-compilation tools
# or running on native platform runners)
npm run rebuild-native -- --target_platform=linux --target_arch=x64

# 2. Package the platform-specific VSIX
npx vsce package --target linux-x64

#... repeat for all platforms...

# 3. After all VSIXs are built, publish them all
npx vsce publish --packagePath *.vsix


The Marketplace will then automatically serve the correct .vsix (e.g., arela-5.0.0-linux-x64.vsix) to the user based on their OS.26 This is a non-negotiable step for shipping an extension with native dependencies.

Part 3: Implementation Guide: UI and Interaction (Features 1, 3, 6)

This section provides implementation details for the core WebView-based features, following the UI architecture from Part 1.3.

3.1 Feature 1: Chat Interface (Sidebar)

This feature (Q2.1) provides a chat UI in the sidebar.
API: Use a WebviewViewProvider.9 This is specifically designed to host a WebView within a view container in the sidebar (or panel).29
Step 1: Register the Provider (in extension.ts)

TypeScript


// In extension.ts
import { ChatViewProvider } from './chatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const chatProvider = new ChatViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'arela.chatView', // This ID matches package.json
            chatProvider
        )
    );
}


Step 2: Define the ChatViewProvider
This class manages the WebView's lifecycle and communication.

TypeScript


// In chatViewProvider.ts
export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the WebView
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'askArela':
                    // Send text to the MCP child_process
                    // And then post a response back
                    const response = await mcpService.ask(data.text); 
                    webviewView.webview.postMessage({
                        command: 'response',
                        payload: response
                    });
                    return;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get URI for the compiled React JS bundle
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionUri, 'dist', 'webview-ui.js'
        ));
        
        // Use a nonce for security
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Arela Chat</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}


Step 3: Build the React UI (webview-ui/src/ChatView.tsx)
The React app will use the @vscode/webview-ui-toolkit/react components 11 and the acquireVsCodeApi to communicate.30

TypeScript


// In webview-ui/src/ChatView.tsx
import React, { useState, useEffect } from 'react';
import { VSCodeTextField, VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import ReactMarkdown from 'react-markdown'; // For Q2.1 Markdown rendering

// This API is provided by VS Code in the WebView
const vscode = acquireVsCodeApi();

export function ChatView() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState();

    useEffect(() => {
        // Listen for messages from the Extension Host
        const handleMessage = (event) => {
            const message = event.data;
            if (message.command === 'response') {
                setMessages([...messages, { from: 'arela', text: message.payload }]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [messages]);

    const handleSend = () => {
        setMessages([...messages, { from: 'user', text: prompt }]);
        vscode.postMessage({ command: 'askArela', text: prompt });
        setPrompt('');
    };

    return (
        <div>
            <div className="message-list">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.from}`}>
                        <ReactMarkdown children={msg.text} />
                    </div>
                ))}
            </div>
            <div className="input-box">
                <VSCodeTextField value={prompt} onInput={e => setPrompt(e.target.value)} />
                <VSCodeButton onClick={handleSend}>Send</VSCodeButton>
            </div>
        </div>
    );
}



3.2 Technical Deep Dive: Streaming LLM Responses (T2)

Streaming responses is critical for AI UX. It is an extension of the message bus from 3.1.
WebView -> Extension: vscode.postMessage({ command: 'askArelaStream',... }).31
Extension -> MCP Process: The ChatViewProvider sends the request to the mcpServiceClient. This client writes to the child_process.stdin.
MCP Process -> Extension: The MCP server, upon receiving the request, does not wait. It streams response chunks (e.g., tokens) to process.stdout.
Extension (mcpProcess.stdout.on('data',...)): The Extension Host listens to the stdout stream. For each chunk received, it immediately posts a new message to the WebView.31
TypeScript
// In ChatViewProvider, after calling the MCP service
mcpService.askStream(data.text, (chunk) => {
    // This callback is triggered by the service client
    // for each 'data' event from the child process
    this._view.webview.postMessage({
        command: 'streamChunk',
        payload: chunk
    });
});


WebView (React) -> UI: The React component's message listener 32 handles the streamChunk command.
TypeScript
// In ChatView.tsx, inside useEffect
if (message.command === 'streamChunk') {
    // Find the last message and append the chunk
    setMessages(currentMessages => {
        const lastMsg = currentMessages[currentMessages.length - 1];
        if (lastMsg && lastMsg.from === 'arela') {
            lastMsg.text += message.payload;
            return [...currentMessages];
        } else {
            return [...currentMessages, { from: 'arela', text: message.payload }];
        }
    });
}


This creates a real-time, token-by-token streaming effect, as seen in tools like Copilot Chat.33

3.3 Feature 3: Semantic Search Panel

This feature (Q2.3) is similar to the Chat UI but should be a main panel, not a sidebar view.
API: Use vscode.window.createWebviewPanel.9 This creates a full "editor" panel.

TypeScript


// In extension.ts, register a command
context.subscriptions.push(
    vscode.commands.registerCommand('arela.showSearch', () => {
        const panel = vscode.window.createWebviewPanel(
            'arelaSearch', // Internal ID
            'Arela Semantic Search', // Title
            vscode.ViewColumn.One, // Show in main editor column
            { enableScripts: true }
        );

        panel.webview.html = getSearchWebviewHtml(panel.webview, context.extensionUri);
        
        // Handle messages from this panel
        panel.webview.onDidReceiveMessage(async (data) => {
            if (data.command === 'jumpToLocation') {
                const uri = vscode.Uri.file(data.file);
                const doc = await vscode.workspace.openTextDocument(uri);
                const pos = new vscode.Position(data.line, 0);
                await vscode.window.showTextDocument(doc, { 
                    selection: new vscode.Selection(pos, pos) 
                });
            }
        });
    })
);


Click-to-Jump (Q2.3): The React UI for the search panel will render results. The onClick handler for a result item will not be a web link, but a postMessage call.31

TypeScript


// In webview-ui/src/SearchView.tsx
const SearchResult = ({ result }) => {
    const handleClick = () => {
        vscode.postMessage({
            command: 'jumpToLocation',
            file: result.filePath, // e.g., '/Users/dev/project/src/main.ts'
            line: result.line      // e.g., 42
        });
    };
    return <div onClick={handleClick}>{result.filePath}:{result.line}</div>;
}


The Extension Host handler (defined above) catches this message, opens the specified file, and moves the cursor to the correct line and selection.8

3.4 Feature 6: Status Bar Integration

This feature (Q5.2) provides ambient information and quick actions.
API: Use vscode.window.createStatusBarItem.29

TypeScript


// In extension.ts 'activate' function
let statusBarItem: vscode.StatusBarItem;

// Create the item
statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 
    100 // Priority
);
statusBarItem.text = "$(zap) Arela: Ready"; // Use built-in codicons
statusBarItem.tooltip = "Arela AI is active";
statusBarItem.command = "arela.showChat"; // Open chat on click
statusBarItem.show();

context.subscriptions.push(statusBarItem);

// Update status bar text during long operations
// e.g., vscode.window.withProgress(...)
statusBarItem.text = "$(sync~spin) Arela: Indexing...";



Part 4: Implementation Guide: Language Server Features (Features 2, 4, 5, 8)

This section details features implemented via the Language Server Protocol (LSP), as defined in the Part 1 architecture. This is the correct model for high-performance, language-aware features.

4.1 Setting up the Language Server Client & Server

The yo code "Language Server" template 15 scaffolds the client (arela-vscode) and server (arela-lsp/server).
LSP Server (arela-lsp/server/src/server.ts):
This is where the core logic resides. It imports from arela-core (Q3.1) and uses the vscode-languageserver library.4

TypeScript


// In arela-lsp/server/src/server.ts
import {
    createConnection, TextDocuments, ProposedFeatures
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Import from the shared 'arela-core' package
import { CodeSummarizer } from 'arela-core/summarization';
import { initializeCache } from 'arela-core/cache';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(async (params) => {
    // Initialize the shared DB cache
    await initializeCache();

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            hoverProvider: true, // Enable Hover
            completionProvider: { resolveProvider: true }, // Enable Completion
            codeActionProvider: true, // Enable Code Actions
            diagnosticProvider: { // Enable Diagnostics
                interFileDependencies: false,
                workspaceDiagnostics: false
            }
        }
    };
});

// Background Indexing (Q4.1)
// When a file is opened or changed, trigger background summarization
documents.onDidOpen(async (change) => {
    const doc = change.document;
    // Do not block. Await a non-blocking call.
    CodeSummarizer.summarizeAndCache(doc.uri, doc.getText());
});
documents.onDidChangeContent(async (change) => {
    // This is where incremental indexing logic would go
    CodeSummarizer.summarizeAndCache(change.document.uri, change.document.getText());
});

//... Handlers for features (Hover, Completion) go here...

documents.listen(connection);
connection.listen();


This setup establishes the background indexing process (Q4.1, Q4.3). By hooking into onDidOpen and onDidChangeContent 36, the LSP can parse ASTs and populate the SQLite cache in its own process, completely avoiding blocking the UI thread.4

4.2 Feature 2: AI-Powered Hover Tooltips

This feature (Q2.2) is implemented with the connection.onHover handler in the LSP server.38
Rich Content (T3): To show Markdown with syntax-highlighted code blocks, the handler must return MarkupContent with kind: 'markdown'.40 VS Code's renderer natively syntax highlights fenced code blocks; no special library is needed.41
Implementation:

TypeScript


// In arela-lsp/server/src/server.ts
connection.onHover(async (params): Promise<vscode.Hover | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    // 1. Get symbol/range at position (complex logic, often needs AST)
    const symbol = await getSymbolAt(document, params.position);
    if (!symbol) return null;

    // 2. Perform fast cache lookup (populated by background indexer)
    // This is how the <100ms requirement is met
    const summary = await CodeSummarizer.getSummaryFromCache(symbol.id);
    if (!summary) return null;

    // 3. Format as Markdown for T3
    const markdownContent =.join('\n');

    return {
        contents: {
            kind: 'markdown',
            value: markdownContent
        },
        range: symbol.range // The range this hover applies to
    };
});



4.3 Feature 4: Right-Click Context Menus

This feature (Q2.4) is not an LSP feature. It is configured in the Extension Host (arela-vscode).
Step 1: Define Commands and Menus in package.json

JSON


{
  "name": "arela-vscode",
  "contributes": {
    "commands":,
    "menus": {
      "editor/context":
    }
  }
}


Step 2: Register Handlers in extension.ts
The command handler receives the file uri or TextEditor context.43

TypeScript


// In extension.ts 'activate' function
context.subscriptions.push(
    vscode.commands.registerCommand('arela.analyzeFunction', 
      (editor: vscode.TextEditor) => {
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        
        // Send selected text to the MCP child_process
        mcpService.analyze(text, editor.document.uri);
        // Show results in a new panel or notification
    })
);

context.subscriptions.push(
    vscode.commands.registerCommand('arela.summarizeFile', 
      (uri: vscode.Uri) => {
        // uri is provided by the context menu
        // Send file URI to the MCP child_process
        mcpService.summarizeFile(uri);
    })
);



4.4 Feature 5 & Q8.1: Inline Suggestions (Copilot-style)

The user asks for "code completion" (Q8.1), but the description implies "ghost text" 44, not a simple dropdown. The correct, modern API for this is InlineCompletionItemProvider, which is registered in the Extension Host.38

TypeScript


// In extension.ts 'activate' function
const inlineSuggestionProvider = {
    async provideInlineCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        context: vscode.InlineCompletionContext, 
        token: vscode.CancellationToken
    ) {
        // 1. Get context from document/position
        const textBefore = document.getText(
            new vscode.Range(new vscode.Position(0, 0), position)
        );

        // 2. Call Arela reasoning engine (via MCP child_process)
        const suggestion = await mcpService.getSuggestion(textBefore);

        if (token.isCancellationRequested ||!suggestion) {
            return;
        }

        // 3. Return the suggestion
        return;
    }
};

context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**" }, // Activate for all files
        inlineSuggestionProvider
    )
);



4.5 Advanced Features: Diagnostics and Code Actions

These "future" features (Q8.2, Q8.3) are classic LSP implementations.
Diagnostics (AI Linter) (Q8.3): The background indexing process in the LSP (from 4.1) can also check for AI-detected issues. The LSP can then send these to the client.
TypeScript
// In arela-lsp/server/src/server.ts, inside onDidChangeContent
const issues = await ArelaLinter.findIssues(document.getText());
const diagnostics: vscode.Diagnostic = issues.map(issue => ({
    severity: vscode.DiagnosticSeverity.Warning,
    range: issue.range,
    message: issue.message,
    source: 'arela'
}));

// Send diagnostics to VS Code
connection.sendDiagnostics({ uri: document.uri, diagnostics });

VS Code automatically renders these as squiggles and adds them to the "Problems" panel.38
Code Actions (AI Refactor) (Q8.2): When a user clicks the lightbulb on a diagnostic, the LSP's onCodeAction handler is triggered.38
TypeScript
// In arela-lsp/server/src/server.ts
connection.onCodeAction(async (params): Promise<vscode.CodeAction> => {
    const diagnostics = params.context.diagnostics
       .filter(d => d.source === 'arela');
    if (diagnostics.length === 0) return;

    const refactor = await mcpService.getRefactor(diagnostics);
    if (!refactor) return;

    // Define the change
    const edit = new vscode.WorkspaceEdit();
    edit.replace(params.textDocument.uri, refactor.range, refactor.newText);

    return [{
        title: `Arela: ${refactor.title}`,
        kind: vscode.CodeActionKind.QuickFix,
        diagnostics: [diagnostics],
        edit: edit
    }];
});



Part 5: Production Readiness: Performance, Security, and UX

This section addresses the non-functional requirements crucial for a production-ready v5.0.0 release.

5.1 Performance Strategy for Large Codebases

The performance strategy (Q4) is a direct consequence of the hybrid architecture.
Lazy Loading (Q4.1): The extension must not activate on startup (*). activationEvents in package.json must be precisely defined.
JSON
"activationEvents":
    "onLanguage:python"
]


Background Processing (Q4.1, Q4.2): The primary performance goal is to "avoid blocking the UI".2 This is achieved by the architecture:
LSP: All indexing (AST parsing, summarization) is in the LSP process.4
child_process: All AI/LLM calls (which are I/O-bound and high-latency) are in the MCP process.
Extension Host: Does nothing but pass messages.
Caching (Q4.1): The <100ms hover and <2s search requirements (Constraints) mandate a persistent cache. The @vscode/sqlite3 database is the primary mechanism for this. The background LSP process writes to the cache, and the real-time handlers (like onHover) perform fast, synchronous-style lookups from it.
Web Workers (Q4.2): For any heavy, synchronous computation that must run in the Extension Host (which should be rare), a WebWorker 49 could be used. However, the LSP/child_process model is far superior and is the primary strategy.50

5.2 Security: Storing API Keys (T5)

This is a critical security requirement. API keys for OpenAI, Anthropic, etc., must never be stored in settings.json. That file is plain text and often accidentally committed to source control.
The Solution: The only correct method is to use the SecretStorage API provided by the ExtensionContext.52
SecretStorage securely stores data in the underlying OS keychain (macOS Keychain Access, Windows Credential Manager, or libsecret on Linux).52
Data is encrypted at rest and is not accessible outside the extension's context.55
Implementation (T5):

TypeScript


// In extension.ts

// Command to prompt user and store the key
context.subscriptions.push(
    vscode.commands.registerCommand('arela.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: "Enter your Arela (OpenAI/Anthropic) API Key",
            password: true, // Hides the input
            ignoreFocusOut: true
        });

        if (apiKey) {
            await context.secrets.store("arela.apiKey", apiKey);
            vscode.window.showInformationMessage("Arela API Key stored securely.");
        }
    })
);

// Function to retrieve the key for use in your MCP service
async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    const key = await context.secrets.get("arela.apiKey");
    if (!key) {
        vscode.window.showErrorMessage(
            "Arela API Key not set. Please run 'Arela: Set API Key' command."
        );
        return undefined;
    }
    return key;
}



5.3 Offline Strategy (T4)

The prompt (Context) mentions ollama, which enables an offline strategy.
Configuration: Define a setting in package.json's contributes.configuration section.
JSON
"properties": {
  "arela.aiProvider": {
    "type": "string",
    "enum": ["Cloud (OpenAI/Anthropic)", "Local (Ollama)"],
    "default": "Cloud (OpenAI/Anthropic)",
    "description": "Select the AI provider for Arela."
  }
}


Routing: The arela-core or mcp-server logic must read this configuration.
Fallback: When a request is made, the service checks this setting.
If "Cloud," it uses the API key from SecretStorage and calls the external API.
If "Local," it routes the request to http://localhost:11434 (Ollama's default port).56
Error Handling: If "Cloud" is selected and no internet is available, the extension should gracefully fail and suggest switching to "Local (Ollama)" mode if available.

5.4 UX Best Practices: Progress, Notifications, Settings

Progress (Q5.2): For long-running, non-blocking tasks like background indexing, use vscode.window.withProgress.
TypeScript
vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Arela is indexing your workspace...",
    cancellable: true
}, (progress, token) => {
    // This promise must be returned
    return backgroundIndexer.run(progress, token); 
});

This shows a dismissible toast notification with a progress bar.58
Notifications (Q5.2): Use the standard notification APIs for communication:
vscode.window.showInformationMessage(...) for success/info.
vscode.window.showWarningMessage(...) for non-critical issues.
vscode.window.showErrorMessage(...) for all errors.6
Settings (Q5.1): All user-configurable options must be in package.json's contributes.configuration section to appear in the native Settings UI.

Part 6: Testing, Debugging, and Distribution

This section details the strategy for ensuring quality and successfully publishing the extension.

6.1 Debugging Strategy

Debugging a multi-process extension (Q6.2) requires a multi-pronged approach.
Debugging the Extension Host: This is the standard "Run Extension" (F5) launch configuration created by yo code.15 console.log messages will appear in the "Debug Console" of the main VS Code window.
Debugging the WebView (React UI): This is a common pain point.
Solution: While the extension is running in the Extension Development Host window, open the Command Palette (Ctrl+Shift+P) and run the command: "Developer: Open Webview Developer Tools".60
This will open a Chrome DevTools window pointed directly at the WebView's iframe. This allows for full DOM inspection, network request monitoring, and console.log debugging of the React application.
Debugging the LSP & child_process: These are separate Node.js processes.
Solution: They must be launched with the --inspect flag.63
In the launch.json of the main project, add a new "Attach to Node Process" configuration.
Start the extension (F5).
Run the "Attach" configuration, which will connect to the --inspect port of the LSP or child_process, enabling breakpoints and logging in that process.

6.2 Testing Strategy

Unit Tests (Q6.1): The arela-core package is a standard Node.js library. It can (and should) be unit-tested thoroughly with a framework like Jest or Mocha, completely independent of the VS Code environment.
Integration Tests (Q6.1): To test code that uses the vscode API (e.g., command registrations, WebView providers), the @vscode/test-electron package is required.65
This package downloads a test instance of VS Code, installs the extension, and runs a Mocha test suite inside the Extension Host, giving tests full access to the live vscode API.65
yo code scaffolds a basic integration test setup.
CI/CD Gotcha: Integration tests using @vscode/test-electron will fail in headless CI environments (like default GitHub Actions runners) because Electron requires a graphical display to launch.67
Solution: The CI environment must use a virtual frame-buffer like Xvfb.67
Example GitHub Actions Workflow (.github/workflows/test.yml):YAML
name: Run Extension Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 18

    - name: Install dependencies
      run: npm install

    - name: Install Xvfb (Virtual Display)
      run: sudo apt-get update && sudo apt-get install -y xvfb

    - name: Run Integration Tests
      run: |
        export DISPLAY=:99.0
        Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
        npm run test



6.3 Final Publishing Checklist

This checklist (Q7.1, Q7.2) synthesizes the critical steps for a successful publish, especially given the native module dependencies.
Bundle: Run the webpack or esbuild production build to bundle all extension code.22 Ensure externals (Part 2.3) are correctly configured.
.vsix Creation: Do not run a simple vsce package. You must run a matrix build to create platform-specific packages.26
vsce package --target win32-x64
vsce package --target linux-x64
vsce package --target darwin-arm64
...etc. for all supported platforms.
Publish: Use vsce publish (or vsce publish --packagePath...) to upload all the generated .vsix files to the Visual Studio Marketplace.26 The Marketplace will serve the correct file to each user.
Versioning: Use standard semantic versioning (e.g., 5.0.0).
Updates (Q7.2): VS Code handles the auto-update mechanism. The Arela team's responsibility is to ensure backward compatibility or, if breaking changes are necessary (e.g., in cache/DB schema), write explicit migration logic in the activate function to handle data from older versions.

Part 7: Conclusions and Strategic Recommendations

This report provides a comprehensive architectural blueprint for the Arela v5.0.0 VS Code extension. The plan is designed to integrate a complex, existing AI backend into a high-performance, feature-rich, and stable IDE assistant.
The following strategic decisions are paramount and should be prioritized by the engineering team:
Adopt the Hybrid Architecture: The three-process model (Extension Host, LSP, child_process MCP Server) is not optional; it is a hard requirement to meet the project's performance, stability, and code-reuse goals.
Prioritize the Native Module Strategy: This is the highest technical risk. The migration from better-sqlite3 to the officially supported @vscode/sqlite3 is strongly recommended to de-risk the project. The build and CI/CD pipeline must be configured to use electron-rebuild for tree-sitter and to build and publish platform-specific VSIXs using the --target flag. This work should begin immediately.
Standardize on the UI Stack: All custom UI (Chat, Search) must be built using the Webview API with the React and @vscode/webview-ui-toolkit/react stack. This ensures a consistent, high-quality, and maintainable user interface.
Implement Security First: The SecretStorage API for all user-provided API keys is a non-negotiable security requirement. This must be implemented from day one.
By following this prescriptive guide, the Arela team can effectively leverage its existing, production-ready backend to deliver a "best-in-class" AI assistant that feels deeply integrated into the Visual Studio Code ecosystem.
Works cited
Extension Host - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/advanced-topics/extension-host
How AI Extensions in VSCode Understand Code Context: Under the Hood - GoCodeo, accessed on November 15, 2025, https://www.gocodeo.com/post/how-ai-extensions-in-vscode-understand-code-context-under-the-hood
UX Guidelines | Visual Studio Code Extension API, accessed on November 15, 2025, https://code.visualstudio.com/api/ux-guidelines/overview
Language Server Extension Guide - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
How to run a system command from VSCode extension - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/43007267/how-to-run-a-system-command-from-vscode-extension
node.js - child_process not working in extension(vscode) - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/64059641/child-process-not-working-in-extensionvscode
Node.js as a sidecar - Tauri, accessed on November 15, 2025, https://v2.tauri.app/learn/sidecar-nodejs/
Tree View API - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/extension-guides/tree-view
Webview API | Visual Studio Code Extension API, accessed on November 15, 2025, https://code.visualstudio.com/api/extension-guides/webview
Webview UI Toolkit for Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/blogs/2021/10/11/webview-ui-toolkit
React Webview UI Toolkit for VS Code - GitHub Next, accessed on November 15, 2025, https://githubnext.com/projects/react-webview-ui-toolkit/
A collection of sample extensions built with the Webview UI Toolkit for Visual Studio Code. - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode-webview-ui-toolkit-samples
Configuring VSCode Extensions: Webpack, React, and TypeScript Demystified - Medium, accessed on November 15, 2025, https://medium.com/@captaincolinr/vscode-react-extension-guide-10ea25cb983f
Using React in Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/nodejs/reactjs-tutorial
Your First Extension - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/get-started/your-first-extension
Correct way to publish extensions with native modules? · microsoft vscode-discussions · Discussion #768 - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode-discussions/discussions/768
Using better-sqlite3 in a VS Code extension · Issue #385 - GitHub, accessed on November 15, 2025, https://github.com/JoshuaWise/better-sqlite3/issues/385
node.js - Module compiled against a different NODE_MODULE_VERSION when developing an extension for vscode - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/71527006/module-compiled-against-a-different-node-module-version-when-developing-an-exten
Native Node Modules | Electron, accessed on November 15, 2025, https://electronjs.org/docs/latest/tutorial/using-native-node-modules
Unable to integrate with Electron (Vscode extension) · Issue #1321 · WiseLibs/better-sqlite3, accessed on November 15, 2025, https://github.com/WiseLibs/better-sqlite3/issues/1321
vscode-sqlite - Visual Studio Marketplace, accessed on November 15, 2025, https://marketplace.visualstudio.com/items?itemName=alexcvzz.vscode-sqlite
Bundling Extensions - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/working-with-extensions/bundling-extension
Externals - webpack, accessed on November 15, 2025, https://webpack.js.org/configuration/externals/
Native Modules - Electron React Boilerplate, accessed on November 15, 2025, https://electron-react-boilerplate.js.org/docs/native-modules
How to add sqlite3 dependency to VS Code extension? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/51587843/how-to-add-sqlite3-dependency-to-vs-code-extension
Publishing Extensions - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/working-with-extensions/publishing-extension
Issue with native modules (.node) resolving incorrectly in VSCode extension built with esbuild #4154 - GitHub, accessed on November 15, 2025, https://github.com/evanw/esbuild/issues/4154
VS Code platform specific extension sample - Open VSX Registry, accessed on November 15, 2025, https://open-vsx.org/extension/filiptronicek/vscode-platform-specific-sample
microsoft/vscode-extension-samples: Sample code illustrating the VS Code extension API., accessed on November 15, 2025, https://github.com/microsoft/vscode-extension-samples
Enhancing communication between extensions and webviews using VS Code Messenger, accessed on November 15, 2025, https://www.typefox.io/blog/vs-code-messenger/
Simplify Visual Studio Code extension webview communication - Elio Struyf, accessed on November 15, 2025, https://www.eliostruyf.com/simplify-communication-visual-studio-code-extension-webview/
How to use PostMessage in a React Native webview? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/68334181/how-to-use-postmessage-in-a-react-native-webview
Language Model API - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/extension-guides/ai/language-model
Best practices to render streamed LLM responses | AI on Chrome, accessed on November 15, 2025, https://developer.chrome.com/docs/ai/render-llm-responses
visual studio code - Open current editing file in explorer tree - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/41929709/open-current-editing-file-in-explorer-tree
Language Server Protocol Overview - Visual Studio (Windows) | Microsoft Learn, accessed on November 15, 2025, https://learn.microsoft.com/en-us/visualstudio/extensibility/language-server-protocol?view=visualstudio
The Language Server Index Format (LSIF) - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/blogs/2019/02/19/lsif
Programmatic Language Features | Visual Studio Code Extension API, accessed on November 15, 2025, https://code.visualstudio.com/api/language-extensions/programmatic-language-features
Building a Language Server Extension using VS Code | by Rebecca Abraham - Medium, accessed on November 15, 2025, https://medium.com/@rebeccaaby21/building-a-language-server-extension-using-vs-code-248b49f037b4
Markdown and Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/languages/markdown
Syntax Highlight Guide | Visual Studio Code Extension API, accessed on November 15, 2025, https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
Change style of VS Code Markdown `code` syntax highlighting - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/73298139/change-style-of-vs-code-markdown-code-syntax-highlighting
VsCode extension. How to select a tree view item on right click - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/52797204/vscode-extension-how-to-select-a-tree-view-item-on-right-click
Inline suggestions from GitHub Copilot in VS Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/copilot/ai-powered-suggestions
Build a linter extension for Visual Studio Code | by Tyler Liu | RingCentral Developers, accessed on November 15, 2025, https://medium.com/ringcentral-developers/build-a-linter-extension-for-visual-studio-code-368a65a95545
Refactoring - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/editing/refactoring
No way to run a long running computation in a background thread · Issue #213098 · microsoft/vscode - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode/issues/213098
Web Workers vs child_process for CPU intensive functions in Node.js [closed], accessed on November 15, 2025, https://stackoverflow.com/questions/41843269/web-workers-vs-child-process-for-cpu-intensive-functions-in-node-js
What is the difference between Child_process and Worker Threads? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/56312692/what-is-the-difference-between-child-process-and-worker-threads
Understanding Worker Threads and Child Processes - DEV Community, accessed on November 15, 2025, https://dev.to/wallacefreitas/understanding-worker-threads-and-child-processes-52nj
Why Every Developer's API Keys Are Probably in the Wrong Place And how a VS Code Extension Finally… - Medium, accessed on November 15, 2025, https://medium.com/@dingersandks/why-every-developers-api-keys-are-probably-in-the-wrong-place-and-how-a-vs-code-extension-finally-c966d081d132
visual studio code - How to use the vscode.SecretStorage? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/66568692/how-to-use-the-vscode-secretstorage
How to use SecretStorage in your VSCode extensions - DEV Community, accessed on November 15, 2025, https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
Where are the VS Code extension secrets stored exactly? #748 - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode-discussions/discussions/748
Offline AI / Completion / Assistive coding in VSCode - [Purnank], accessed on November 15, 2025, https://www.purnank.in/en/posts/2025/01/offline-ai-in-vscode/
Local and offline AI code assistant for VS Code with Ollama and Sourcegraph, accessed on November 15, 2025, https://dev.to/thorwebdev/local-and-offline-ai-code-assistant-for-vs-code-with-ollama-and-sourcegraph-2jf8
LangServer keeps indexing everytime I open up VS Code - Julia Discourse, accessed on November 15, 2025, https://discourse.julialang.org/t/langserver-keeps-indexing-everytime-i-open-up-vs-code/41275
TypeScript tutorial in Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/typescript/typescript-tutorial
Easy way to debug a webview in a VS Code extension - DEV Community, accessed on November 15, 2025, https://dev.to/dzhavat/easy-way-to-debug-a-webview-in-a-vs-code-extension-2mho?comments_sort=latest
Easy way to debug a Webview in a VS Code extension | Dzhavat Ushev, accessed on November 15, 2025, https://dzhavat.github.io/2020/11/12/easy-way-to-debug-a-webview-in-a-vscode-extension.html
How To Debug a vscode extension's WebView javascript - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/52613207/how-to-debug-a-vscode-extensions-webview-javascript
Node.js debugging in VS Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/nodejs/nodejs-debugging
How to set up a remote Language Server node process to be debuggable in VS Code?, accessed on November 15, 2025, https://stackoverflow.com/questions/64815152/how-to-set-up-a-remote-language-server-node-process-to-be-debuggable-in-vs-code
Testing Extensions - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/working-with-extensions/testing-extension
Testing extensions for Visual Studio Code - DevConf.CZ 2021 - YouTube, accessed on November 15, 2025, https://www.youtube.com/watch?v=gKFOJz52dG8
Visual Studio Code extension integration tests works locally but fails in GitHub Action, accessed on November 15, 2025, https://stackoverflow.com/questions/79607537/visual-studio-code-extension-integration-tests-works-locally-but-fails-in-github
