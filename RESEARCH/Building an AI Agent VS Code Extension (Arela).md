Building an AI Agent VS Code Extension (Arela)

In this guide, we will walk through how to create a full-featured AI coding assistant inside Visual Studio Code. We’ll cover everything from the chat UI and real-time streaming of model responses, to integrating with existing memory systems, ensuring performance, and following best practices for security and UX.

Table of Contents
	•	Architecture Overview￼
	•	Choosing a Chat Interface Architecture￼
	•	Extension vs. WebView Responsibilities￼
	•	Chat UI Implementation￼
	•	Creating a WebView Panel￼
	•	Building the Chat WebView (HTML/JS)￼
	•	Handling User Input and Streaming Output￼
	•	AI Integration and Streaming Responses￼
	•	OpenAI API (GPT-4) Streaming￼
	•	Anthropic API (Claude) Streaming￼
	•	Securely Managing API Keys￼
	•	Rate Limiting, Errors, and Fallbacks￼
	•	Tracking Token Usage and Cost￼
	•	Extension-WebView Communication￼
	•	Messaging from Extension to WebView￼
	•	Messaging from WebView to Extension￼
	•	Real-time Streaming Updates to WebView￼
	•	VS Code Context Integration￼
	•	Accessing Editor Content and Selection￼
	•	Workspace Files and Search￼
	•	Showing Notifications and Progress￼
	•	Integrating Arela’s Systems￼
	•	Importing the HexiMemory and Other Modules￼
	•	Loading Persona and Rules into Prompts￼
	•	Handling Native Modules (tree-sitter, SQLite)￼
	•	Dependency Management and Bundling￼
	•	Performance and Optimization￼
	•	Avoiding UI Blocking￼
	•	Implementing Cancellation for Requests￼
	•	Optimizing for Large Codebases￼
	•	Caching Responses and Summaries￼
	•	Step-by-Step Implementation Guide￼
	•	Best Practices￼
	•	Common Pitfalls and Solutions￼
	•	Resources and References￼
	•	Testing Strategy￼

⸻

Architecture Overview

Choosing a Chat Interface Architecture

To build a chat interface in VS Code, the primary options are:
	•	WebView Panel – A custom HTML/CSS/JS UI embedded in VS Code (essentially an isolated mini webpage). This is the most flexible approach and is used by extensions like GitHub Copilot Chat and Cursor ￼ ￼. You can design a rich interactive chat UI with Markdown rendering, code highlights, copy buttons, etc.
	•	VS Code’s Chat APIs – Recent VS Code versions introduce a Chat view and “Chat Participant” API, allowing integration into the built-in chat UI (invoked via @ mentions) ￼ ￼. This provides a native look and feel, but is less customizable and was still evolving. It’s great for domain-specific Q&A bots, but for a full custom agent like “Arela” with a unique interface, a WebView offers more control.
	•	TreeView or Panel with native components – Not suitable for rich text chat. TreeView is for hierarchical data, and there’s no native multi-line text widget for chat in the extension API.

Recommendation: Use a WebView Panel for the chat UI. This is how tools like Copilot Chat implement their interface. A WebView allows full control over HTML/JS/CSS so you can create a chat bubble layout, render Markdown answers, and stream token-by-token updates. The WebView will run as a sandboxed iframe within VS Code ￼, communicating with the extension via message passing. For complex UI, you can use a framework (React, Vue, Svelte) – for example, GitHub’s toolkit provides VS Code-styled React components ￼. Using a framework can simplify state management, but it’s optional. A lightweight approach (vanilla JS or minimal library) can also work given that the UI logic (chat rendering) is relatively straightforward.

WebView vs Chat API: The new Chat Participant API integrates into VS Code’s native Chat view. However, it requires users to use the @assistantName prefix to invoke and doesn’t (currently) allow a fully custom UI (you supply responses, but the rendering is VS Code’s) ￼ ￼. For a Copilot-like experience with streaming and custom controls, a WebView is the way to go. (You can consider supporting the Chat API in addition to a WebView for maximum integration, but we’ll focus on the WebView approach here.)

Extension vs. WebView Responsibilities

In this architecture, our extension will have two main components:
	•	Extension Host (Node.js): This is the backend of the extension running in VS Code’s extension host process. It will handle AI logic, file I/O, calling Arela’s core (HexiMemory, etc.), and making API calls to OpenAI/Anthropic. It also mediates between the WebView and the outside world. The extension host can be thought of as the controller and model in MVC, preparing data and handling commands.
	•	WebView (Frontend): This is the UI running in an isolated browser-like environment within VS Code. It will display the chat conversation, collect user input, and show streaming responses. The WebView cannot directly access Node APIs or the VS Code API (except through messaging), which is a security feature ￼ ￼. It communicates with the extension host by posting messages.

Each part has distinct responsibilities:
	•	WebView UI: Render chat messages (user and AI), including Markdown and code blocks with syntax highlighting. Provide an input box for the user, and controls like a “Send” button or “Stop/Cancel” button. Show a typing indicator or spinner when the AI is responding. The WebView should remain responsive and handle partial updates gracefully.
	•	Extension Host: Receive user queries from the WebView, retrieve relevant context from Arela’s memory layers, orchestrate the AI calls (including multi-hop reasoning if needed), stream the response tokens back to the WebView, and manage conversation state (SessionMemory). The extension also handles reading files, storing API keys securely, and applying any rules/persona to the prompts.

The extension host can be further structured with separation of concerns:
	•	A controller (e.g., a ChatManager class) orchestrates the flow: on receiving a message from WebView, it uses Arela’s ContextRouter and MemoryRouter to gather context, uses QueryClassifier to determine the query type, etc., then calls the AI model(s).
	•	The Arela core (HexiMemory and its subcomponents) can be used directly as a library inside the extension host. These modules (SessionMemory, ProjectMemory, etc.) are already implemented and tested, so the extension should leverage them rather than reinventing context handling.
	•	The extension should also integrate the FeedbackLearner – for example, if the WebView has thumbs-up/down buttons on answers, the extension can call FeedbackLearner.recordFeedback() accordingly.

Folder Structure: Within your extension project, you might structure it as follows for clarity:

vscode-extension/
├── src/
│   ├── extension.ts        # Entry point – activate function registers commands, etc.
│   ├── chatPanel.ts        # Class to manage the WebView Panel (create/destroy, message handling)
│   ├── chatManager.ts      # Orchestrates interactions (calls Arela core, AI APIs, etc.)
│   ├── arela/ ...          # Your imported Arela core code (memory, summarization, etc.)
│   ├── ui/ 
│   │   ├── webview.html    # HTML template for the WebView
│   │   ├── main.js         # Script for WebView (if not inlined)
│   │   └── styles.css      # CSS for WebView
│   └── util/ ...           # Utility modules (e.g., for token counting, formatting)
└── package.json

This is just an example; you can also bundle the UI assets. The key point is to separate the WebView UI code from the extension logic.

Below, we’ll dive into each piece of the implementation in detail.

⸻

Chat UI Implementation

Creating a WebView Panel

First, let’s create the WebView panel that will host our chat UI. We’ll register a new command (e.g., "arela.openChat") that opens the chat panel. In the extension’s activate function, use vscode.window.createWebviewPanel to initialize the panel ￼ ￼:

// extension.ts (or in activate function)
import * as vscode from 'vscode';
let chatPanel: vscode.WebviewPanel | undefined;

context.subscriptions.push(
  vscode.commands.registerCommand('arela.openChat', () => {
    if (chatPanel) {
      // Reveal existing panel
      chatPanel.reveal(vscode.ViewColumn.One);
      return;
    }
    // Create and show a new webview panel in the sidebar (column 1)
    chatPanel = vscode.window.createWebviewPanel(
      'arelaChat',             // Internal identifier for the webview panel
      'Arela Chat',            // Title of the panel (shows in UI)
      vscode.ViewColumn.One,   // Show panel in the first column (sidebar area)
      {
        enableScripts: true,   // Allow running scripts in the webview
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] 
        // ^ Restrict resource loading to the 'media' directory of extension
      }
    );
    // Set initial HTML content for the panel
    chatPanel.webview.html = getWebviewHtml(chatPanel.webview, context.extensionUri);
    
    // Handle panel disposal (e.g., when user closes it)
    chatPanel.onDidDispose(() => {
      chatPanel = undefined;
    }, null, context.subscriptions);
    
    // Handle messages from the WebView
    chatPanel.webview.onDidReceiveMessage(handleWebviewMessage, undefined, context.subscriptions);
  })
);

In the above code:
	•	We ensure only one chat panel exists at a time. If the user triggers the command again, we just bring the existing panel to front ￼ ￼.
	•	enableScripts: true is required to run JS in the WebView ￼. We restrict localResourceRoots to our extension’s media folder to control file access (for security) ￼ ￼.
	•	We set the HTML content via a helper getWebviewHtml. This function will return a string containing the HTML for our chat UI. We pass in webview and extensionUri so we can properly load local scripts/styles using asWebviewUri (explained below).
	•	We register an onDidReceiveMessage listener to handle messages sent from the webview (the handleWebviewMessage function will process user input, etc., which we’ll define later).

Persisting state: By default, if VS Code is closed and reopened, the WebView will not automatically restore. If you want to persist the chat panel across sessions, you can implement a WebviewPanelSerializer via vscode.window.registerWebviewPanelSerializer ￼. This involves saving the conversation or UI state and reloading it. Alternatively, since we have SessionMemory (backed by SQLite) to persist past messages, we can simply reopen a fresh panel and re-populate it from SessionMemory on startup.

Building the Chat WebView (HTML/JS)

Now, let’s design the content of the WebView. The HTML will define the structure of the chat UI. A simple structure could be:
	•	A scrollable message list (div) where each message is an element (user vs assistant).
	•	An input area at the bottom with a textarea or input box and a Send button.
	•	Optional toolbar for actions like clear conversation or stop generation.

HTML Template: We can generate it in code or store as a separate .html file. For clarity, here’s a simplified version assembled in the extension (using template strings). We’ll include a content security policy and link to local scripts/styles:

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
  const styleUri   = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
  // Note: If using external libraries from CDN, include them in CSP and script tags as needed.
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
  <title>Arela Chat</title>
  <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
  <div id="chat-container">
    <div id="messages"></div>
    <div id="input-container">
      <textarea id="user-input" rows="1" placeholder="Ask Arela..."></textarea>
      <button id="send-btn">Send</button>
    </div>
  </div>
  <script src="${toolkitUri}"></script>
</body>
</html>`;
}

A few things to note:
	•	We include a Content Security Policy (CSP) meta tag to restrict resource loading. In the example above, we allow images from our extension and HTTPS, and allow scripts/styles only from our extension (and inline for simplicity) ￼. This prevents the webview from loading arbitrary remote content or running injected scripts, improving security.
	•	webview.cspSource is a magic string that represents the extension’s own URI scheme; this allows our script and style to load ￼.
	•	We link a styles.css for basic styling (e.g., dark/light theme adjustments, chat bubble styling, etc.). We also link main.js which will contain our WebView JavaScript code (or we could inline a script).
	•	The #messages div will hold the chat messages. The #input-container holds a textarea and a button for sending. We use a <textarea> so that the user can input multi-line queries if needed (pressing Enter could send, or we provide the button).
	•	We set rows="1" on the textarea and could use some JS to auto-expand it as the user types (optional).
	•	The UI is minimal here; you can enhance it with icons (e.g., an airplane icon on the send button, a stop icon, etc.), and CSS for a nice look (background colors for user vs AI messages, etc.).

Handling VS Code theme: The webview can detect VS Code’s theme via CSS classes on the body (e.g., vscode-light or vscode-dark) ￼. In our CSS, we can style accordingly. For example:

body.vscode-dark { background-color: #1e1e1e; color: #d4d4d4; } 
body.vscode-light { background-color: #ffffff; color: #333; }

We can also use the provided CSS variables (like --vscode-editor-foreground) for colors so that our chat UI matches the editor theme ￼.

Syntax Highlighting for Code: To render code blocks in AI responses with syntax coloring, we have a few options:
	•	Use a JavaScript library like highlight.js or Prism.js in the WebView. We can include it and then, whenever we render a code block <pre><code class="language-js">...</code></pre>, call the highlighter on it. Many Markdown libraries allow a callback for highlighting.
	•	Use VS Code’s built-in theming with a library like Shiki (which is what VS Code’s markdown preview uses for matching editor colors ￼). Shiki can run in the webview to highlight code according to VS Code’s theme, but it might be overkill for our case.
	•	Simpler: since we are in a web context, highlight.js is straightforward. Alternatively, we could rely on the <pre><code> styling from VS Code’s markdown CSS if we import it, but better to explicitly highlight.

A common approach is to use a Markdown-it or Marked library to parse markdown, and integrate highlight.js:

// In webview script
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  highlight: function(code, lang) {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

Then use marked(markdownString) to get HTML with <code> tags highlighted. We’ll incorporate similar logic when rendering AI messages.

Handling User Input and Streaming Output

The WebView’s JavaScript (main.js) will attach event listeners to the input field and button, send the user’s query to the extension, and handle incoming messages (AI responses, tokens, etc.) from the extension.

Sending user messages: We use the VS Code WebView API acquireVsCodeApi() to communicate with the extension ￼ ￼. This gives us a vscode object with a postMessage method. For example, in main.js:

const vscode = acquireVsCodeApi();

const inputBox = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

sendBtn.addEventListener('click', sendMessage);
inputBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {  // Enter (without Shift) to send
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = inputBox.value.trim();
  if (!text) return;
  appendMessage('user', text);  // Optimistically add user message to UI
  vscode.postMessage({ type: 'ask', text: text });
  inputBox.value = '';
  inputBox.focus();
  // Show typing indicator...
}

Here, we listen for clicks on the send button and for Enter key on the textarea. We then:
	•	Append the user’s message to the chat UI immediately (so it appears in the conversation bubble list). The function appendMessage(who, text) would create a div with appropriate styling (distinguish user vs assistant) and add it to #messages.
	•	Send a message to the extension with an object { type: 'ask', text: '...' }. We use a type field so the extension knows how to handle it. In this case, 'ask' means a new question from the user.
	•	Clear the input field and maybe show a “… thinking” indicator in the UI. For example, we could add a placeholder assistant message with a spinner GIF or text like “Arela is typing…”.

On the extension side, our handleWebviewMessage (registered earlier) will receive this JSON. For example:

function handleWebviewMessage(message: any) {
  switch (message.type) {
    case 'ask':
      const userText = message.text || '';
      // Call the chat manager to handle the query
      chatManager.handleUserQuery(userText, /*sender*/);
      break;
    case 'cancel':
      // User clicked "Stop" – cancel generation
      chatManager.cancelCurrentRequest();
      break;
    // ... handle other message types (feedback, etc.)
  }
}

This will kick off the process of gathering context, calling AI, etc., which we’ll cover in the next sections.

Receiving streaming responses: The WebView should handle messages coming from the extension, which contain the AI’s response. We might design it such that:
	•	When the extension starts generating a response, it sends an initial message like { type: 'start' } or simply starts streaming tokens with { type: 'token', content: 'partial text' }.
	•	As each token or chunk arrives, the extension posts it. The WebView script listens using window.addEventListener('message', event => { ... }) to process these events ￼ ￼. For example:

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'token') {
    // Append or update the assistant message with new content
    appendTokenToLastMessage(msg.content);
  } else if (msg.type === 'done') {
    // Remove typing indicator, finalize message
    finalizeAssistantMessage();
  } else if (msg.type === 'error') {
    // Display error to user
    showErrorMessage(msg.error);
  }
});

We’ll get into the extension’s streaming logic shortly. On the UI side, appendTokenToLastMessage should take the latest assistant message element (perhaps the one we created when generation started, e.g., with a spinner) and append the new text. One simple approach is to accumulate the text and set element.innerHTML = marked(accumulatedText) each time a new chunk arrives, so that Markdown is continuously rendered with highlight. However, re-parsing markdown for each token can be inefficient and may cause flicker. A more efficient approach:
	•	If the token is plain text, you can append document.createTextNode(token) to the content.
	•	If it’s part of a code block, you might accumulate until the block is complete, etc.

For a first pass, it’s acceptable to just rebuild the HTML on each update (the texts are not huge per token). Many implementations do a simple append unless the token is a special symbol. Just be careful with tokens that complete Markdown syntax (like the closing ``` of a code block). You might keep track if a code block is open and if so, avoid appending a fully re-rendered highlight until it closes.

Scrolling: Each time a new message or token comes in, you likely want to scroll the #messages container to the bottom (so the user sees the latest output). You can do:

const messagesDiv = document.getElementById('messages');
messagesDiv.scrollTop = messagesDiv.scrollHeight;

after appending content.

Copy buttons for code: A nice touch is to add a “Copy” button on code blocks. This can be done by injecting a button element into the <pre> when rendering markdown, or after rendering, selecting all <pre><code> blocks and appending a child button. You then add a click listener to copy the code text (using the Clipboard API). Since this is a static UI inside VS Code, normal clipboard API should work (or you can use vscode.postMessage({type:'copy', text: code}) and have the extension write to clipboard via env.clipboard). Given the scope, this can be an extension later; we’ll ensure the HTML/CSS structure allows it.

That covers the WebView side basics: capturing input, sending to extension, and updating UI with responses. Now, let’s focus on the extension’s integration with AI APIs and Arela’s systems to generate those responses.

⸻

AI Integration and Streaming Responses

The extension needs to integrate with multiple AI backends:
	•	OpenAI GPT-4 (and variants) – via OpenAI’s REST API.
	•	Anthropic Claude – via Anthropic’s API.
	•	Ollama (Local LLM) – via local invocation (likely an HTTP or CLI interface).

We’ll set up the extension to use OpenAI as primary, Claude as an alternative (maybe for certain query types or as fallback), and Ollama as offline fallback. The Arela’s multi-agent orchestration suggests you might route queries to different models based on need. For simplicity, let’s assume a default model (GPT-4) and you can extend the logic to others as needed.

OpenAI API (GPT-4) Streaming

OpenAI’s Chat Completions API supports streaming responses. In Node.js, we have a few ways to call it:
	•	Using the official OpenAI Node SDK (openai npm package).
	•	Using a direct HTTP request (via fetch or Axios) to the OpenAI endpoint.

Using OpenAI’s SDK: As of mid-2024, the OpenAI Node SDK allows streaming if you pass stream: true and use the underlying Axios response stream ￼ ￼. For example:

import { Configuration, OpenAIApi } from 'openai';
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }));

async function generateWithOpenAI(messages: any[], onToken: (token: string) => void) {
  const response = await openai.createChatCompletion(
    {
      model: 'gpt-4', 
      messages: messages,
      stream: true
    }, 
    { responseType: 'stream' }
  );
  const stream = response.data as unknown as NodeJS.ReadableStream;
  // Read the stream chunk-by-chunk
  stream.on('data', (chunk: Buffer) => {
    const payloads = chunk.toString().split("\n\n");
    for (const payload of payloads) {
      if (payload.includes('[DONE]')) return;  // stream end
      if (payload.startsWith("data:")) {
        try {
          const data = JSON.parse(payload.replace(/^data: /, ""));
          const delta = data.choices[0].delta?.content;
          if (delta) {
            onToken(delta); // send token to webview
          }
        } catch (err) {
          console.error('Error parsing OpenAI stream chunk', err);
        }
      }
    }
  });
  stream.on('end', () => {
    onToken(null); // signal done
  });
  stream.on('error', (err: Error) => {
    console.error('OpenAI API Error:', err);
    // Handle error (maybe forward to UI)
  });
}

This code is based on an example from a StackOverflow answer ￼ ￼. The OpenAI API streams data in server-sent event format, where each chunk is prefixed with data:  and \n\n separated. The code above splits incoming data by the double newlines, checks for the special "[DONE]" message (which indicates the end of the stream), and for each JSON chunk, extracts the delta.content (the new token or part of a token). We call onToken(delta) for each piece of text.

Using fetch: If you prefer not to use the OpenAI SDK, you can use the Fetch API (Node 18+ has fetch built-in). For example:

async function generateWithOpenAI(messages: any[], onToken: (token: string) => void) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: messages,
      stream: true
    })
  });
  if (!res.body) {
    throw new Error("No response body from OpenAI");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let partial = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    partial += decoder.decode(value);
    const lines = partial.split("\n\n");
    partial = lines.pop() || '';  // keep incomplete chunk
    for (const line of lines) {
      if (line.trim() === '' || line.includes('[DONE]')) continue;
      if (line.startsWith('data:')) {
        const json = JSON.parse(line.replace(/^data: /, ''));
        const delta = json.choices[0].delta?.content;
        if (delta) onToken(delta);
      }
    }
  }
  onToken(null);
}

This does essentially the same thing: it reads from the response stream chunk by chunk, accumulates the text to handle cases where a chunk ends mid-JSON, and parses out each complete JSON message. The final call onToken(null) signifies completion. This approach uses Web Streams API (getReader()), which works in modern Node.

Posting tokens to WebView: Inside the onToken callback, we can post messages to the webview. For example, if panel is our WebViewPanel:

generateWithOpenAI(promptMessages, (token) => {
  if (token) {
    panel.webview.postMessage({ type: 'token', content: token });
  } else {
    panel.webview.postMessage({ type: 'done' });
    // (we could also accumulate full answer if needed for memory)
  }
});

This streams out tokens to the UI as they arrive ￼. We also likely want to accumulate these tokens into a string on the extension side if we plan to store the full answer in SessionMemory or use it for follow-up context. That can be done by appending to a variable in the callback.

Anthropic API (Claude) Streaming

Anthropic’s Claude API also supports streaming. We’ll use the official @anthropic-ai/sdk for simplicity. The SDK provides an async iterator for the stream ￼ ￼:

import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function generateWithClaude(messages: any[], onToken: (token: string) => void) {
  const stream = await anthropic.complete({ 
    // Note: The SDK uses a different format, adjust as needed
    model: "claude-2", 
    max_tokens_to_sample: 1000,
    prompt: Anthropic.composePrompt(messages),  // hypothetical helper to format prompt
    stream: true 
  });
  for await (const chunk of stream) {
    if (chunk.stop_reason) {
      break; // end of stream
    }
    if (chunk.completion) {
      onToken(chunk.completion);
    }
  }
  onToken(null);
}

(The above is illustrative; check Anthropic’s SDK docs for exact usage. For chat, their API uses a different structure of messages.)

From the example in a Node.js tutorial ￼ ￼, the SDK returns an async iterable. Each chunk might have a .delta or .completion property containing the latest text. In the snippet above, we call onToken for each chunk of text. The logic will be similar: post messages to the webview.

If not using the SDK, one can use fetch to Anthropic’s endpoint and parse SSE in a similar way, but using the SDK is easier.

Choosing between models: You might incorporate both. For example, Arela could decide: if query is very large or requires more context, maybe use Claude (which has 100k context in Claude 2). Or if OpenAI returns a rate limit, fall back to Claude. Implement logic in chatManager.handleUserQuery such as:

try {
  await generateWithOpenAI(messages, sendTokenToWebview);
} catch (err) {
  console.warn("OpenAI failed, falling back to Claude:", err);
  await generateWithClaude(messages, sendTokenToWebview);
}

This provides resilience.

We also should handle the local model (Ollama). That might involve calling a local server or CLI. For brevity: if Ollama has an HTTP streaming API, we’d do similar fetch read, or if CLI, spawn a process and read stdout line by line. Ensure to run it asynchronously so as not to block the extension.

Securely Managing API Keys

Never hardcode API keys in your extension. Instead, use VS Code’s Secret Storage to store user-provided keys securely ￼ ￼. Here’s how:

Prompting the user for a key: The first time the extension needs a key (say the user triggers chat and we find no OpenAI key), prompt the user with an input box:

import * as vscode from 'vscode';
const secrets = context.secrets;  // SecretStorage from ExtensionContext

async function getOpenAIApiKey(): Promise<string | undefined> {
  let apiKey = await secrets.get("openai-api-key");
  if (!apiKey) {
    apiKey = await vscode.window.showInputBox({ 
      prompt: "Enter OpenAI API Key",
      ignoreFocusOut: true,
      password: true,  // hide input
      placeHolder: "sk-..." 
    });
    if (apiKey) {
      await secrets.store("openai-api-key", apiKey);
    }
  }
  return apiKey;
}

This will either retrieve the stored key or ask the user to input it (with a masked input field) ￼. The key is then stored securely. VS Code’s secret storage encrypts the data on disk ￼ (backed by OS keychain on many platforms), and it is not synced to other machines by default, ensuring privacy ￼.

Use similar flows for Anthropic keys or other credentials. You might provide a settings UI in extension settings for the user to paste keys, but saving them via the secrets API is safer than plain settings.json.

When making API calls, retrieve the key from secrets and include in the Authorization header. Avoid ever sending the key to the WebView or logging it. If the WebView needs to know whether a key is set (to prompt user), just send a boolean flag; don’t expose the raw key.

Rate Limiting, Errors, and Fallbacks

AI APIs can return errors for various reasons: rate limits (HTTP 429), invalid requests, model overloads, etc. It’s important to handle these gracefully:
	•	Rate Limit (429): OpenAI responds with 429 if too many requests. The response headers often include Retry-After. A best practice is to implement exponential backoff on retries ￼. For example, if a request fails with 429, wait a random short delay (e.g., 500ms – 1500ms) and retry, up to a few attempts. The Anthropic SDK might throw a RateLimitError which you can catch ￼ ￼. You could use a library like axios-retry (as shown in Bronson’s tutorial) to automatically handle this ￼ ￼. However, since streaming is interactive, you may choose to simply inform the user to try again soon if immediate retry fails.
	•	API Key invalid/expired: The API might return 401/403. In this case, stop and show a message to the user (using vscode.window.showErrorMessage("Invalid API key for OpenAI")) and perhaps prompt them to update the key.
	•	Model error: Sometimes the model might return an error object or your code might throw in mid-stream. Ensure that stream.on('error', ...) is handled as in the OpenAI example above ￼. You might forward an error to the webview via panel.webview.postMessage({ type: 'error', error: err.message }) so the UI can display it.
	•	Fallback logic: As mentioned, you can sequence through providers. For example:

try {
  await generateWithOpenAI(msg, sendToken);
} catch (e) {
  if (isRateLimitError(e) || isServerError(e)) {
    // try Claude
    await generateWithClaude(msg, sendToken);
  } else {
    throw e;
  }
}

Where isRateLimitError checks e.g. err.response?.status === 429.

	•	Local fallback: If both cloud APIs fail or if user is offline, you could attempt generateWithOllama. You might detect offline by catching network errors (fetch throwing) and then using local model. Provide a setting like "preferredModel": "openai|anthropic|ollama|auto" to let user control this.

When an error does occur that prevents getting any answer, ensure the UI is notified so the “typing” indicator can stop. For instance:

panel.webview.postMessage({ type: 'done' });
panel.webview.postMessage({ type: 'error', error: 'OpenAI request failed: ' + err.message });

And in the WebView script, upon receiving an error message, you could replace the placeholder response with an error display (e.g., a message bubble saying “Error: OpenAI request failed (rate limit). Switched to Claude.” or similar).

Logging errors to the console (using console.error) is good for development, but in production, surface them to users in a friendly way or log to an output channel.

Tracking Token Usage and Cost

It’s often useful to inform users about token usage and cost, especially since these APIs incur cost. OpenAI’s response (non-streaming) includes a usage field with token counts ￼ ￼. In streaming mode, you do not get the full usage until the end. If using the SDK, you might not easily get usage for streamed responses (the REST API doesn’t send it in chunks). A workaround:
	•	After streaming is done, you could make a separate call to count tokens (e.g., using OpenAI’s tiktoken library to count tokens in prompt+response). Or maintain a count as you stream (increment a counter for each token you send to UI).
	•	For a rough estimate, counting characters can give a ballpark, but tokenizers vary.

We can keep track of prompt_tokens (all input context tokens) and completion_tokens (tokens generated). If using OpenAI SDK without streaming (just for counting), you could call it with same messages and stream:false but that wastes another call. Instead, consider using the tiktoken package to count tokens locally for each model.

For simplicity, let’s say we accumulate a token count during streaming (each delta might be one or few tokens):

let tokensUsed = 0;
onToken = (token) => {
  if (token) {
    tokensUsed += token.split(/\s+/).length; // naive count by splitting, better to use tokenizer
    panel.webview.postMessage({ type: 'token', content: token });
  } else {
    panel.webview.postMessage({ type: 'done' });
    console.log(`Tokens used: ~${tokensUsed}`);
    panel.webview.postMessage({ type: 'usage', promptTokens: promptCount, completionTokens: tokensUsed, model: 'gpt-4' });
  }
};

Where promptCount we compute from the input messages (maybe using known lengths or by counting words as a proxy).

On the WebView side, if a usage message arrives, we could display it in the UI (e.g., in a status bar within the chat view: “Tokens: 150 (cost ~$0.003)”). The cost calculation requires knowing the model’s pricing. You could hardcode known rates (GPT-4 8k: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens; GPT-3.5: $0.0015/1K etc., Claude pricing, etc.) or allow configuration. For a rough estimation, it’s fine to code it.

Example calculation:

if (msg.type === 'usage') {
  const model = msg.model;
  const promptTokens = msg.promptTokens, completionTokens = msg.completionTokens;
  let cost = 0;
  if (model.startsWith('gpt-4')) {
    cost = promptTokens/1000 * 0.03 + completionTokens/1000 * 0.06;
  } else if (model.startsWith('gpt-3.5-turbo')) {
    cost = (promptTokens + completionTokens)/1000 * 0.002;
  }
  cost = cost || 0;
  statusElement.textContent = `Tokens: ${promptTokens+completionTokens}, Est. Cost: $${cost.toFixed(4)}`;
}

(Example uses hypothetical rates; adjust for actual model used.)

This is optional but enhances transparency. If implementing, be sure to reset the token counter for each new conversation turn.

⸻

Extension-WebView Communication

We touched on this earlier, but let’s clearly define the message protocol between extension and webview and give code snippets for each direction.

Messaging from Extension to WebView

The extension can send any JSON-serializable data to the webview using webview.postMessage(...). This returns a promise that resolves to a boolean (indicating success), but you typically don’t need that since there’s no response from webview directly ￼ ￼.

In our design, extension -> webview messages include:
	•	type: 'token' – partial text generated by AI (for streaming).
	•	type: 'done' – indicates the AI has finished its answer.
	•	type: 'error' – an error occurred (with an error field).
	•	type: 'usage' – token/cost info (optional).
	•	Possibly type: 'history' – to send past conversation when opening the panel (so the webview can display prior messages from SessionMemory). We didn’t explicitly plan this, but you could on panel create, do something like:

const past = sessionMemory.getConversation(); // e.g., array of {role, text}
panel.webview.postMessage({ type: 'history', messages: past });

Then the webview would iterate and render those messages (so the conversation persists visually).

The code to post a message is straightforward:

panel.webview.postMessage({ type: 'token', content: delta });

from within our streaming loop, as shown above. Another example: after processing a user’s query fully, we might send a final assistant message in one go if not streaming:

panel.webview.postMessage({ type: 'answer', text: fullAnswer });

We didn’t define an 'answer' earlier because we stream with 'token'. But if you choose not to implement streaming initially, you can accumulate the full answer on extension side and send it once:

const fullResponse = await openai.createChatCompletion({stream:false, ...});
panel.webview.postMessage({ type: 'answer', text: fullResponse.data.choices[0].message.content });

Where the webview would then simply render that content. However, streaming provides a better UX for long answers by showing them incrementally ￼ ￼, so we encourage using it.

Messaging from WebView to Extension

In the webview context, we use vscode.postMessage (after calling acquireVsCodeApi()) to send messages. We already gave an example for sending the user’s question:

vscode.postMessage({ type: 'ask', text: userQuestion });

Similarly, if the webview has a “Stop” button to cancel generation, we’d do:

vscode.postMessage({ type: 'cancel' });

Or for feedback buttons:

vscode.postMessage({ type: 'feedback', rating: 'down', messageId: msgId });

It’s just JSON. On the extension side, onDidReceiveMessage provides exactly that object as event.data ￼.

Remember that message passing is asynchronous and not inherently request/response. If you need to confirm something back, you have to send a separate message back. For example, you might send {type:'clearComplete'} after clearing conversation on extension side to tell webview to clear UI.

Example Extension Message Handler:

panel.webview.onDidReceiveMessage(async (msg) => {
  switch(msg.type) {
    case 'ask':
      const question = msg.text;
      await chatManager.handleUserQuery(question); 
      break;
    case 'cancel':
      chatManager.abortGeneration(); 
      break;
    case 'feedback':
      feedbackLearner.record(msg.messageId, msg.rating);
      vscode.window.showInformationMessage("Thanks for the feedback!");
      break;
  }
});

This shows how various message types can be handled. The chatManager.handleUserQuery would implement the core logic we’ve described (context gathering, API calls, etc.), and within that function, it uses panel.webview.postMessage to stream results back.

Real-time Streaming Updates to WebView

To stream tokens smoothly:
	•	Batch tokens if necessary. Posting one message per token is fine if tokens are a few per second. But if the model outputs very fast (e.g., 20+ tokens/sec), spamming 20 postMessage calls per second might be okay (it’s usually fine; VS Code can handle it). If performance becomes an issue, you can concatenate small chunks and send, say, every 50ms. For instance, buffer tokens in a local string and use setInterval or setTimeout to flush them periodically. Given token speeds and the simplicity of our scenario, it’s usually not needed.
	•	On the webview side, ensure the event listener efficiently updates the DOM. Instead of re-rendering the entire message list on each token, just update the last message element’s text. If using a framework like React, you might push tokens into state and let it re-render a component. If doing manually, you could maintain a reference: e.g., when an answer starts, do:

const msgElem = document.createElement('div');
msgElem.className = 'assistant message';
msgElem.innerHTML = `<div class="bubble"><span id="cursor">▍</span></div>`;
messagesDiv.appendChild(msgElem);
currentAssistantBubble = msgElem.querySelector('.bubble');

Then on each token message:

if (currentAssistantBubble) {
  // remove the cursor
  const cursor = currentAssistantBubble.querySelector('#cursor');
  if (cursor) cursor.remove();
  // append new text before adding a new cursor
  currentAssistantBubble.innerHTML += msg.content;
  currentAssistantBubble.innerHTML += `<span id="cursor">▍</span>`;
}

Here “▍” (a heavy vertical bar) acts as a blinking cursor or indicator of an incomplete response. This is how Cursor’s UI indicates streaming. On done, you remove the cursor span and finalize the text (perhaps re-run a highlight on the whole content to ensure code blocks are highlighted).
Alternatively, accumulate text and call marked() each time as mentioned. But direct text appending is faster. If the token contains Markdown syntax (like it starts a code block), appending raw might break the HTML. Another approach is to accumulate plain text and not set .innerHTML until the end, but that way you can’t show formatting mid-way. It’s a tradeoff. A pragmatic solution is to do minimal formatting during streaming (e.g., show code in a monospaced block but without full coloring), and once done arrives, replace the content with a fully rendered Markdown via marked. This avoids flicker from reprocessing incomplete markdown.

	•	End-of-stream handling: Make sure when done, you tell the webview to finalize. We send a {type:'done'} message as shown. In the UI, we could remove any spinner and enable the input box again (maybe we disabled it during generation to prevent multiple overlapping requests unless you support that).
	•	Partial Markdown concerns: If a code block is incomplete, highlight.js might not parse it well. Many markdown renderers won’t output until the closing ``` appears. Our approach above (cursor indicator and final re-render) alleviates this.

In summary, streaming UX involves some trickiness in UI, but the result is a much better experience where answers start appearing within ~1-2 seconds of the question, rather than waiting ~10 seconds in silence for a full answer.

⸻

VS Code Context Integration

A key feature of Arela is its Hexi-Memory providing context (session, project code, user prefs, etc.). We need to integrate editor and workspace context into the AI prompts.

Accessing Editor Content and Selection

When the user asks something like “How does authentication work?”, we likely want to include context from the codebase. Arela’s ProjectMemory can be queried (likely via keyword or vector search) for relevant files. But often, the currently open file or the selected text is the most relevant context (especially if user’s question is about code they’re looking at).

Active editor content: VS Code provides vscode.window.activeTextEditor which points to the currently focused text editor (if any). From it, we can get the document and text:

const editor = vscode.window.activeTextEditor;
let activeFileContent = '';
let activeFilePath = '';
if (editor) {
  activeFileContent = editor.document.getText();
  activeFilePath = editor.document.uri.fsPath;
}

This gives the full content of the file. If the file is large, you might not want to always include all of it. Instead, possibly just include a summary (Arela’s CodeSummarizer can produce one). If the question specifically references something in that file, including that file’s content or summary is helpful.

Selection: If the user has highlighted text or their cursor is on a symbol, that provides a strong hint of context. You can get the selection range via editor.selection. For example:

if (editor && !editor.selection.isEmpty) {
  const selectedText = editor.document.getText(editor.selection);
  promptContext += "\nSelected Code:\n" + selectedText;
}

In a chat scenario, you could automatically prepend the selected code in the prompt (perhaps as a system or assistant message: “Here is the code the user is referring to: …”). GitHub Copilot Chat does something similar when you ask a question while selecting code – it will show that code in the chat as context.

If no selection but cursor is on a word (e.g., a function name), you could consider grabbing the entire function or relevant block via AST – but that’s complex. However, Arela’s ASTExtractor could help: given a cursor position, find the function node and extract it. That’s advanced, but worth considering since you have that capability in code-summarizer.ts / ast-extractor.ts.

For now, basic approach:
	•	If selection length > 0 and less than, say, 500 lines, include it in context.
	•	If not, maybe still include the current file’s name or path in the system prompt: e.g., “The user is currently looking at auth.ts.” and let the AI decide if needed.

File path and language: You can also pass the file name or programming language of the open file. E.g., if the user asks “Explain this code”, knowing the language (Java, Python, etc.) is useful to the model. editor.document.languageId gives the language mode (like ‘typescript’, ‘java’) ￼. You could add a system message: “The following code is in ${languageId}: …”.

Workspace Files and Search

To provide broader context (ProjectMemory, VectorMemory):
	•	You might query Arela’s ProjectMemory which likely indexes code in a SQLite (project.db). If there’s a method to search it (maybe ProjectMemory.findEntries(keyword) or VectorMemory.similarTo(query)), use that. Otherwise, you can do a brute-force search:

const uris = await vscode.workspace.findFiles('**/*.ts', '**/node_modules/**', 100);
for (const uri of uris) {
  // maybe search within file or decide relevant files by name
}

But that’s inefficient at runtime. It’s better if ProjectMemory already has a knowledge store. We might assume that when the CLI tests passed, the .arela/project.db has content. We can instantiate ProjectMemory in the extension and call a method to query it. For example:

const projectMemory = new ProjectMemory(projectDBPath);
const relevant = projectMemory.search('authentication token creation');
// this is hypothetical; adapt to actual API. Possibly vectorMemory has embeddings to use.


	•	If not using Arela’s own indexing, you could utilize VS Code’s Workspace Symbol search or plain text search:
	•	vscode.workspace.findTextInFiles can search for a keyword in all files (but it can be heavy and asynchronous, streaming results).
	•	Arela’s GraphMemory might have a dependency graph of modules, which could help if the question is specific (like find all auth-related modules).

Given Arela’s design, use the ContextRouter / MemoryRouter already present:
	•	QueryClassifier might classify question type as “PROCEDURAL” (from the use case example).
	•	MemoryRouter then picks which memories to query (VectorMemory, GraphMemory, etc.).

Integrating Arela’s memory system: You can create an instance of HexiMemory at extension activation:

import { HexiMemory } from './arela/memory/hexi-memory';
let hexi = new HexiMemory(/* perhaps pass config or paths if needed */);

If HexiMemory needs to know where the databases are, provide the path to .arela/memory/ directory (which presumably is at the workspace root). For example:

const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
if (workspaceFolder) {
  const baseDir = workspaceFolder.uri.fsPath;
  hexi = new HexiMemory(baseDir + '/.arela'); 
}

(This assumes HexiMemory can load the DBs from a base path, based on how you implemented it.)

Then, when a query comes in:

const context = hexi.getContextForQuery(userQuery);

If such a method exists. If not, you might replicate what the CLI does:
	•	Use ContextRouter to route the query to the appropriate memory layers.
	•	For each relevant memory layer, retrieve some context string (code snippets, previous messages, etc.).
	•	Concatenate these into the system or assistant prompt. For example:

SYSTEM: (Persona + Rules)
ASSISTANT (internal thought): (ProjectMemory says: "Auth flow involves AuthService and TokenManager...")
ASSISTANT (internal knowledge): (GraphMemory: "login -> generates token -> calls dashboard init...")
USER: "How does authentication work from login to dashboard?"

Obviously, formatting is up to you.

A simpler heuristic: gather top 3 relevant code snippets (each maybe up to 100-200 tokens) and include them in the prompt with some indicator. E.g.:

Relevant code snippets:
[File auth.service.ts]:
... code ...
[File dashboard.controller.ts]:
... code ...

Then the user’s question.

However, caution: including large code dumps can hit token limits quickly. Use Arela’s CodeSummarizer to compress code if needed. For instance, if ProjectMemory yields a 300-line file as relevant, run CodeSummarizer.summarizeFile(filePath) to get a TL;DR, and include that instead of raw code.

Workspace file reading: If you need to manually read a file:

const doc = await vscode.workspace.openTextDocument(uri);
const content = doc.getText();

This is convenient and respects encoding. Alternatively, use fs.readFile if outside the workspace.

One more integration: GraphMemory. If GraphMemory uses a SQLite DB for dependencies, you might want to query it to see relationships. E.g., if user asks about “dashboard”, GraphMemory might tell that DashboardComponent depends on AuthService. This can hint which files to fetch from ProjectMemory.

Summing up: hooking directly into Arela’s memory will likely yield better results than writing new search code. It might be as simple as:

const contextPieces = hexiMemory.retrieveContext(userQuery);
const prompt = persona + rules + "\n" + contextPieces.join("\n") + "\nUser: " + userQuery;
generateWithOpenAI([{ role: 'system', content: prompt } ...], ...);

Ensure that the combined prompt stays under the model’s token limit (for GPT-4, ~8k or 32k). HexiMemory or GovernanceMemory might help trim if too large.

Showing Notifications and Progress

For certain operations, you may want to inform the user via VS Code’s notification or status bar:
	•	Notifications: use vscode.window.showInformationMessage, showWarningMessage, showErrorMessage for simple alerts. For example, if no API key is set and user tries to chat, you could do:

vscode.window.showErrorMessage("OpenAI API key not set. Please set it to use Arela Chat.");

Possibly offer an action:

vscode.window.showErrorMessage("API key missing", "Enter Key").then(choice => { if(choice) promptForKey(); });


	•	Progress: If a background task is time-consuming (like indexing the project on first run, or generating a huge answer), consider using vscode.window.withProgress. For instance, on extension activation, if you need to build the HexiMemory index:

await vscode.window.withProgress({
  location: vscode.ProgressLocation.Window,
  title: "Arela: Indexing workspace for AI assistance...",
  cancellable: false
}, async () => {
  await hexiMemory.indexWorkspace();
});
vscode.window.showInformationMessage("Arela indexing complete! 🎉");

This shows a progress notification in VS Code’s UI (either in the status bar or a popup depending on location) ￼.
During chat generation, we opted to show a typing indicator in the WebView itself rather than a VS Code progress. That’s usually sufficient. But you could also update the status bar with something like “Arela: Generating answer…”. Implementing a status bar item:

const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusItem.text = "$(sync~spin) Arela is thinking...";
statusItem.show();
// after done:
statusItem.hide();
statusItem.dispose();

The "$(sync~spin)" is an icon with a spin animation.

For multi-hop queries or other long-running processes, it’s good to keep the user informed either in the chat UI or VS Code UI, so they know the extension is working (and not frozen).

⸻

Integrating Arela’s Systems

Now, let’s focus on how to leverage the existing codebase (Arela’s classes and rules) inside the extension.

Importing the HexiMemory and Other Modules

Since Arela’s code is in TypeScript files within our project (151 files as described), we can import them normally by relative paths. For example, in the extension:

import { HexiMemory } from './memory/hexi-memory';
import { ContextRouter } from './context-router';
import { QueryClassifier } from './meta-rag/classifier';
import { FeedbackLearner } from './learning/feedback-learner';
// etc.

Make sure your extension’s tsconfig.json includes these files (or just include all TS files in src/). Since they are part of the extension bundle, they will be packaged into the extension. There’s no need to run Arela as a separate process – it can function as a library in-proc.

The Arela classes might use Node modules like better-sqlite3. As noted, those need special handling (see next section). But assuming they work, you can initialize them:

const hexi = new HexiMemory(/* possibly paths or config */);
await hexi.init();  // if there is an async initialization to load DBs

(Check your HexiMemory implementation – ensure it doesn’t try to do something like read from stdin since it was a CLI; you might need to tweak any CLI-specific code.)

Once initialized, you can use:
	•	hexi.session (SessionMemory) to record the conversation. Likely SessionMemory stores each message as a record in session.db. After the assistant responds, do something like hexi.session.addMessage('assistant', fullResponse).
	•	hexi.project (ProjectMemory) to query code. Possibly hexi.project.findCode(query) or some method you have.
	•	hexi.user (UserMemory) for user prefs (not as relevant for answering questions).
	•	hexi.vector (VectorMemory) to do semantic search. For example, hexi.vector.search(query) could return snippets or file references.
	•	hexi.graph (GraphMemory) for dependency links (if question references a component, find related components).
	•	hexi.governance (GovernanceMemory) for logs/rules (the audit trail of past queries, etc., which might not directly feed into answers but for internal tracking).

Basically, the extension’s chatManager can orchestrate:

const classified = QueryClassifier.classify(userQuery);
const route = MemoryRouter.route(classified);  // which memory layers to use
const contextSnippets = [];
if (route.useProject) contextSnippets.push(...hexi.project.search(userQuery));
if (route.useVector) contextSnippets.push(...hexi.vector.searchSimilar(userQuery));
// ... and so on for graph or user memory
// Limit context to e.g. 1000 tokens
const contextText = contextSnippets.join("\n");

Then build the prompt:

const personaText = await loadPersona();  // from file
const rulesText = await loadRules();      // combined rules
let systemPrompt = personaText + "\n" + rulesText;
if (contextText) {
  systemPrompt += `\nRelevant Information:\n${contextText}`;
}
const messages = [
  { role: "system", content: systemPrompt },
  ...hexi.session.getRecentMessages(10),  // last 10 messages for context
  { role: "user", content: userQuery }
];
generateWithOpenAI(messages, sendToken);

This is a pseudo-code illustration. The idea is we inject persona and rules as system, then some context labeled as e.g. “Relevant Info” (the model will treat it as part of the prompt it can draw from), then conversation history and the new question.

If the persona and rules are lengthy, make sure they are concise (you don’t want to blow 1000 tokens on instructions every time). Perhaps have a short system prompt that says something like: “You are Arela, an AI assistant with the personality of a CTO: [some traits]. Follow these rules: [security-first rule, etc.]” rather than raw text of entire arela-cto.md if it’s long. Alternatively, you can fine-tune that prompt later; initially just including them is fine.

One more thing: Multi-hop reasoning (QueryDecomposer, MultiHopRouter). If QueryClassifier flags a query as complex, you can use QueryDecomposer to break it into subqueries ￼. For the use case “How does auth flow work from login to dashboard?”:

if (classified === 'COMPLEX') {
  const subQueries = QueryDecomposer.decompose(userQuery);
  let combinedAnswer = '';
  for (const subq of subQueries) {
    // Perhaps route each subq through same process
    const subAnswer = await getAnswerForQuery(subq);
    combinedAnswer += subAnswer + "\n";
  }
  const finalAnswer = ResultCombiner.combine(combinedAnswer);
  sendToWebview(finalAnswer);
}

Where getAnswerForQuery basically does the above prompt assembly and calls the model (maybe preferring a shorter model for subqueries). This approach is advanced and can be done in the background, streaming each sub-answer or only final. To keep our focus, implement multi-hop if time permits after basic functionality.

Loading Persona and Rules into Prompts

The persona file arela-cto.md and rules in .arela/rules/*.md need to be loaded from disk. Since these are part of the workspace (likely), we use file I/O:

import * as fs from 'fs/promises';

async function loadPersona(): Promise<string> {
  try {
    const wsFolder = vscode.workspace.workspaceFolders?.[0];
    if (!wsFolder) return '';
    const personaUri = vscode.Uri.joinPath(wsFolder.uri, 'src/persona/templates/arela-cto.md');
    const content = await vscode.workspace.fs.readFile(personaUri);
    return Buffer.from(content).toString('utf-8');
  } catch (err) {
    console.error("Could not load persona file:", err);
    return '';
  }
}

async function loadRules(): Promise<string> {
  const wsFolder = vscode.workspace.workspaceFolders?.[0];
  if (!wsFolder) return '';
  const pattern = new vscode.RelativePattern(wsFolder, '.arela/rules/*.md');
  const files = await vscode.workspace.findFiles(pattern);
  let combined = '';
  for (const file of files) {
    try {
      const content = await vscode.workspace.fs.readFile(file);
      combined += Buffer.from(content).toString('utf-8') + "\n";
    } catch {}
  }
  return combined;
}

Here we use the VS Code workspace.fs which returns a Uint8Array of file bytes, then convert to string. Alternatively, use Node’s fs/promises.readFile(path, 'utf8') if the extension is not run in a web context (which it isn’t, it’s Node, so fs is fine).

Make sure to handle errors (file not found, etc.) gracefully. Perhaps the user doesn’t have a .arela folder in their current project – then Arela could still function but without custom rules.

Once we have these strings, we incorporate them as shown earlier into the system prompt. It might be wise to cache them (read once at activation and store in variables) since they won’t change often. If you want to be fancy, watch the files for changes using workspace.onDidChangeTextDocument for those URIs and reload – but not necessary initially.

Applying rules: The rules might be written as guidelines (“Always prioritize security”, etc.). Putting them in the system prompt is effectively how to enforce them. If some rules are critical (e.g., “never reveal sensitive info”), you may want to also implement checks on the output (like GovernanceMemory auditing). For example, after generating an answer, run a simple scan if it violates a known rule (like contains a keyword that should be avoided) and if so, modify or warn. That’s advanced; the primary enforcement is via prompt instructions.

Handling Native Modules (tree-sitter, SQLite)

As discussed, tree-sitter and better-sqlite3 are native. When bundling the extension:
	•	If using vsce package, it will include the compiled .node binaries in node_modules/better-sqlite3/build/Release/better_sqlite3.node and similarly for tree-sitter. If you publish that vsix, it will only contain the binaries for the platform where you packaged it (e.g., if you packaged on Mac, the .node for Mac). On a different OS, the extension will fail to load those modules.
	•	To support all platforms, you have a few options:
	1.	Prebuild binaries for each platform and include them all. This means somehow package better-sqlite3-linux.node, ...-win32.node, etc., and at runtime decide which to load. This is complex and increases extension size. The VS Code marketplace does allow platform-specific extensions (you can publish separate vsix for each OS), but that’s cumbersome.
	2.	Switch to pure JS alternatives:
	•	For SQLite, use a pure JS/wasm approach. For example, sql.js (SQLite compiled to WebAssembly) can run in Node without native code. Or use the built-in vscode.Sqlite if it exists (there was an experimental @vscode/sqlite which is what VS Code itself uses for globalState). The StackOverflow answer ￼ ￼ suggests using sql.js.org to avoid native binaries.
	•	For Tree-sitter, possibly use the WASM version of tree-sitter. There is a tree-sitter npm package that might have fallback to WASM if not on Electron, or you might not need it if CodeSummarizer can use a simpler parser. Alternatively, consider using the TypeScript compiler API or regex for summarization to avoid heavy native dependency.
	3.	Use VS Code’s proposed APIs: For example, VS Code has an experimental API for parsing code or an LSP. But that’s overkill here.
	4.	Post-install compile: You could have a postinstall script that compiles native modules on the user’s machine (like running npm rebuild better-sqlite3). This is not ideal for marketplace distribution and might fail if user doesn’t have a build toolchain.

Given the complexity, a recommended approach is to try to eliminate native deps. For the short term, during development, you can ignore it (just use better-sqlite3 on your dev machine). But for publishing, plan to address it:
	•	You could use better-sqlite3 on the CLI and maybe for the extension, use the simpler sqlite3 (which uses a compiled binary but often includes prebuilt ones for major platforms) or use the Webview’s IndexedDB/LocalStorage to store small data if needed (not for whole code though).
	•	Or distribute an extension that requires the user to run “npm install” after install (not user-friendly).

Because Arela’s memory heavily uses SQLite, consider the sql.js path. You could convert the .db files to use that by loading them into memory. This might be a big change.

As a quick hack, you might catch the error on require('better-sqlite3') and if it fails, notify the user that this feature is unavailable on their platform. But that’s not great.

For tree-sitter: If ASTExtractor is just for summarization, you could skip it and use a simpler summarizer (like just trim comments or so) if tree-sitter is not available. Alternatively, find a JS library for AST (like TypeScript’s own AST for TS files, etc.).

In summary, plan to remove or replace native modules for a truly cross-platform extension:
	•	Use web assembly or simpler logic for AST and database.
	•	Or implement conditional requires: in package.json, mark these modules as optional dependencies for specific OS, and try-catch when loading them (the GitHub issue ￼ ￼ warns against using them in marketplace).

Dependency Management and Bundling

Your extension’s package.json should include all necessary dependencies for runtime (openai, anthropic, your Arela modules if published separately, etc.). To minimize size:
	•	Only include necessary libraries. E.g., if you use marked for Markdown, that’s fine (small). highlight.js for highlighting.
	•	Dev dependencies (like types, webpack, etc.) won’t be packaged by vsce.

Bundling: You can ship the extension as raw files (TypeScript -> JavaScript compiled). VS Code can run those. However, many extensions use bundlers (webpack, esbuild, rollup) to create a single JavaScript file for the extension, which can reduce size and improve load time. If you have 151 files, bundling might help. But be careful with native modules – bundlers often can’t inline those and might throw warnings.

Given your extension is large, consider using esbuild which can bundle quickly. You can configure it to mark better-sqlite3 as external (so it’s not bundled but copied). Actually, if you plan to remove them, maybe bundling everything else is fine.

Optimize dependency loading:
	•	Lazy-load heavy modules if not always needed. For instance, if ASTExtractor is only needed when summarizing a file, require it dynamically in that code path:

let ASTExtractor;
async function summarize(file) {
  ASTExtractor = ASTExtractor || (await import('./summarization/extractor/ast-extractor')).ASTExtractor;
  // then use ASTExtractor
}

This defers loading tree-sitter until absolutely needed.

	•	Remove any debug or test code from production (e.g., if some modules import chai or jest types, exclude those in build).

The good news is VS Code’s extension host is quite capable; a moderately sized extension is fine as long as you’re not doing extremely heavy stuff on activation. Activation events can be used to defer loading until needed. For chat, you might set activation event as on command or on some UI interaction:

"activationEvents": [ "onCommand:arela.openChat" ]

This means the extension doesn’t even load until the user actually opens the chat, which helps startup performance of VS Code. Then on first use, you might see a small delay as it loads Arela’s modules into memory.

⸻

Performance and Optimization

Avoiding UI Blocking

As mentioned, never block the extension’s event loop with slow operations. The extension runs on a single Node.js thread for your code (the extension host). If you do heavy CPU work (like parsing a huge file, or synchronously iterating thousands of files), VS Code UI might become unresponsive (because extension host is busy and can’t process other requests).

Best Practices to avoid blocking:
	•	Use async I/O and network calls (which we are doing with fetch and promises). This relinquishes the event loop while awaiting.
	•	If you have CPU-intensive tasks (like vector computations, large JSON processing), consider splitting them:
	•	Use setImmediate or process.nextTick inside loops to yield occasionally.
	•	Offload to a webworker or secondary process. Node.js has Worker Threads which can be used for parallel processing if needed.
	•	For example, if indexing the project by reading all files, do it file by file asynchronously and yield between files:

for (const uri of allFiles) {
  const content = await vscode.workspace.fs.readFile(uri);
  indexFile(uri, content);
  await new Promise(res => setImmediate(res)); // yield event loop
}


	•	The StackOverflow Q&A ￼ ￼ highlights that using a synchronous child_process (spawnSync) blocked the UI, whereas using asynchronous spawn allowed the progress to show and UI to remain live. The solution was to refactor code to async (Promises), which is exactly what we ensure to do ￼.

In our case, the AI calls and FS reads are async. The JSON parsing of stream chunks is trivial per chunk. Arela’s vector searches and SQLite queries might be synchronous if using better-sqlite3 (which is synchronous by nature). That is a concern: better-sqlite3 runs in-process and will block while querying. If those queries are slow, it could jank the UI. If it becomes an issue, consider migrating ProjectMemory to an async SQLite library or run it in a separate process (like a simple background Node process that communicates with the extension via IPC). But unless your project DB is huge, a single query is probably fine (usually <50ms).

Implementing Cancellation for Requests

When the user hits the “Stop” button or sends a new question while one is running, we need to cancel the ongoing AI request:
	•	For OpenAI (and fetch in general), we can use AbortController. The Fetch API accepts an AbortSignal. In the generateWithOpenAI example above, we can create a controller and pass signal: controller.signal in fetch options. Then calling controller.abort() will abort the request, causing the promise to reject (with an error DOMException). We catch that and treat it as cancellation (don’t show error, just break out).
	•	For the OpenAI SDK, it doesn’t directly accept an AbortController as of now, but since we convert it to a stream, you could call stream.destroy() on the NodeJS readable stream to abort it.
	•	For Anthropic SDK, they may not have built-in abort; you could possibly break out of the for-await loop and hope it stops reading. If needed, you might have to implement your own fetch for Claude for abort support.

Coordinating cancellation:
	•	When user triggers cancel, your extension message handler should call something like chatManager.cancelCurrent(). In that, you keep a reference to the AbortController from the current request and call abort() on it. Also, if using the SDK approach, maybe set a flag that your stream reading loop checks.
	•	Also stop sending any further tokens to the UI. Optionally send a special message like {type:'done', cancelled:true} so the UI knows the completion was interrupted.
	•	On the UI, you might display the partial answer with a note “… stopped” or simply stop adding tokens.

Example cancel implementation:

In the extension:

let currentAbortController: AbortController | null = null;

async function handleUserQuery(query: string) {
  // ... build prompt
  const controller = new AbortController();
  currentAbortController = controller;
  try {
    await generateWithOpenAI(messages, token => {
      panel.webview.postMessage({ type: 'token', content: token });
    }, controller);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log("Request aborted by user");
    } else {
      panel.webview.postMessage({ type: 'error', error: err.message });
    }
  } finally {
    currentAbortController = null;
    panel.webview.postMessage({ type: 'done' });
  }
}

function cancelCurrentRequest() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
}

Here, generateWithOpenAI would accept the controller and pass controller.signal to fetch. When aborted, fetch throws an AbortError which we catch and handle differently from other errors.

In the webview (UI):

// Suppose we have a "Stop" button in the UI:
document.getElementById('stop-btn').onclick = () => {
  vscode.postMessage({ type: 'cancel' });
};

And maybe we disable the Stop button or hide it when no request in progress, enabling it when a request starts.

When cancellation happens, the partial content already in UI remains (which might be incomplete sentence/paragraph). The user can ask a new question or resume.

It’s optional to implement a “Resume” that continues from where stopped, but usually not needed.

Optimizing for Large Codebases

For large projects, key concerns:
	•	Indexing: Don’t re-index everything on each query. Arela likely maintains SQLite DBs for code and dependencies – this is good. Ensure you update the index when files change. You can listen to file save events:

vscode.workspace.onDidSaveTextDocument(doc => {
  hexi.project.indexFile(doc.uri.fsPath, doc.getText());
});

Or something similar to update the ProjectMemory. If not, at least document that user should run an index refresh command if project changed outside extension’s knowledge.

	•	Lazy load context: If a user asks a question unrelated to code, don’t dump large code context. Use the classifier to decide if this is a general question or code-specific. If it’s a generic programming question, maybe you don’t need any project files at all, saving tokens.
	•	Limit search scope: If the workspace is huge (thousands of files), searching all can be slow. VectorMemory with approximate nearest neighbor can retrieve relevant code in sub-second if properly implemented. Use that instead of naive text scan.
	•	Memory usage: Loading entire files into memory (like getText() for each file) can be heavy. If you only need certain parts, consider streaming through files or reading just top N lines for context. But since we rely on Arela’s existing strategy, follow its methods (e.g., maybe ProjectMemory already stores summaries or only certain info).
	•	If real-time performance of memory is an issue, consider moving heavy computations to a separate thread. For example, computing embeddings for a new file could be offloaded, rather than done in main thread.
	•	If using GraphMemory (which might use a SQLite graph), those queries should be fine as they likely involve small tables of dependencies.

Pagination of results: If user asks something broad like “List all API endpoints”, and your search finds 50 relevant files, you cannot feed all into the prompt (too large). Instead, maybe summarize them or just pick the top few. Or respond with a message “There are many results, here’s a summary…”. Copilot Chat usually tries to answer more generally rather than listing thousands of lines.

In summary:
	•	Keep context relevant and concise.
	•	Update indexes incrementally to avoid full rescans.
	•	Consider an initial one-time cost (indexing on activation) and then reuse.

Caching Responses and Summaries

Caching can significantly improve performance and cost:
	•	Cache AI responses: If the user asks the exact same question twice in a session, you can return the stored answer from SessionMemory instead of calling the API again. SessionMemory effectively does this by storing Q&A pairs. You could detect if the new question equals a previous one (maybe after trimming whitespace) and if so, just resend the previous answer (maybe with a note “(cached)”). However, if your extension UI already shows the history, the user can just see the old answer above, so this is minor.
	•	Cache code summaries: Arela’s SemanticCache likely stores embeddings or summaries for code blocks ￼. Ensure that’s used. For instance, if summarizing a function, check cache first. Your CodeSummarizer class likely does that (e.g., it might use a hash of the code to store a summary).
	•	VectorMemory caching: If you embed queries for RAG, caching the embeddings of common queries could save time (embedding is not free either). If using OpenAI’s API for embeddings, that’s another cost. Perhaps use a local model for embeddings or cache them per session.
	•	Workspace storage: VS Code provides context.workspaceState (not encrypted) to store small data per workspace. You could use it for caching small things, but for large (like entire answers or vector arrays) use your own DB or file. Arela’s .arela folder is fine for this.

One strategy:
	•	On extension deactivate (or periodically), save SessionMemory (if not already saving after each message).
	•	If a particular query is encountered frequently, perhaps add it to a FAQ or documentation instead of always asking the model.

The end goal is to minimize redundant calls. But do be careful: if the codebase changes, a cached answer might be outdated. For example, caching “How does function X work?” from last week could be wrong if function X changed. GovernanceMemory might record when an answer was generated. Perhaps on each query, you could check if relevant files changed after the cached answer was produced; if so, invalidate it. This is complex and likely unnecessary for initial implementation – just be aware of potential staleness.

⸻

Step-by-Step Implementation Guide

Finally, let’s outline a recommended order of implementation to build this extension from scratch:

1. Scaffold the Extension: Use yo code or VSCode’s Extension generator to create a new extension project (TypeScript). Set up the package.json with a command arela.openChat and activationEvents for that command. Install needed packages (openai, @anthropic-ai/sdk, etc.).

2. Create the WebView Panel: In activate, register the openChat command to call a function that creates the WebviewPanel ￼ ￼. Set enableScripts: true. Initially, you can put a simple HTML (like “Hello from Arela”) to test the panel opens. Run vsce start (or debug in VS Code) to verify the panel appears.

3. Build the Chat UI in WebView: Design the HTML structure for messages and input. Add a minimal CSS for layout (make the messages div scrollable, input at bottom). Write the WebView script to handle input events (Enter key, send button). Test sending a message: implement onDidReceiveMessage in extension to just console.log it at first. From the WebView, call vscode.postMessage({type:'ask', text:'test'}) on click to ensure the message is received (use VS Code’s debug console to see extension logs). This confirms extension<->webview messaging works.

4. Integrate OpenAI API: Write a small function to call OpenAI with a fixed prompt (e.g., user says “Hello”, respond with “Hi”). Hardcode an API key to test or use an environment variable (later replace with Secrets API). Ensure node-fetch or the OpenAI SDK is working (you might need to polyfill fetch in Node depending on Node version; Node 18+ has it). Once confirmed, integrate streaming: attempt to stream a completion and send tokens to webview. You can test by asking “Write a hello world in Python” and see if it streams code.

5. Connect extension ↔ WebView fully: Now tie it together: on receiving {type:'ask'}, call the function that queries OpenAI (with a dummy prompt for now, or echo the question as answer to test). In WebView, display the user message, then stream the AI answer tokens as they come, appending to the UI. This is a critical milestone: you should see the AI typing out an answer in the VS Code panel. Use a known prompt to test streaming (or use a shorter model like gpt-3.5-turbo for speed).

6. Secure the API keys: Implement the key retrieval via context.secrets. Perhaps add a command or UI to set the key (you can use showInputBox on startup if no key, or provide a command like “Arela: Set OpenAI API Key”). Test that the key is stored and subsequent calls use it. Remove any hardcoded keys.

7. Load Arela’s Persona and Rules: Use vscode.workspace.findFiles to locate the persona and rules files. If they are part of your extension (not user workspace), then include them as extension resources and read them via context.extensionUri. In your case, they seem to be part of user project, so workspace search is correct. Once loaded, incorporate them into the system prompt for OpenAI/Anthropic. This is a good point to test the effect: e.g., if persona says “Your name is Arela”, ask “What is your name?” – the assistant should respond as Arela per the persona text, confirming it’s in effect.

8. Integrate HexiMemory (Project context): Instantiate HexiMemory or individual memory classes. Verify you can query something simple. You might have to adjust file paths (the .db files likely in workspace). Try a known query: e.g., if the project has a function login() in some file, ask “What does login do?” and see if you can fetch that function’s code as context. Start by implementing a simple strategy: search all files for the keyword. Once that works, refine using VectorMemory or GraphMemory if available. This step is more open-ended, but even providing file names in answer is helpful. Aim to have at least one memory source working (like semantic search via VectorMemory or keyword via ProjectMemory).

9. Multi-turn conversation: Ensure that after one Q&A, the SessionMemory is updated. So if user asks follow-up “And what about logout?”, the assistant has context of the previous Q (maybe by including last Q&A in prompt). Test a follow-up question to see if the assistant uses context (OpenAI’s conversation mechanism will do this if you supply the messages array including prior turns).

10. Error Handling & Edge Cases: Induce an error to test (e.g., set a very low rate limit or provide wrong key to get a 401) and ensure the error is shown to user, not just failing silently. Test cancellation by hitting Stop mid-answer. Make sure a new question aborts the old properly (maybe disable input during generation to avoid race conditions, or if not, the cancel logic will handle it).

11. Performance tests: Try on a larger text (maybe ask to generate a long list or summary) to see streaming performance. If output is super long, watch for UI slowdown and adjust token batching if necessary. Also, simulate large file context to see if prompt sizes cause model to error (handle max token errors with a friendly message: e.g., catch OpenAI error about context length and tell user to narrow query).

12. Polish the UI: Add syntax highlighting: include highlight.js library in webview and after receiving a full answer (done), call highlightAll() to color all code blocks ￼. Add copy buttons: after rendering done, attach buttons to each <pre><code> (you can do this by querying DOM in webview script). Add some basic Markdown rendering for bold/italics in the streaming (if not already handled). Ensure the UI works in both light and dark themes (test by switching VS Code theme).

13. Add commands or settings as needed: Perhaps a command to clear the conversation (which would clear SessionMemory and refresh the webview UI). Or a command to toggle between models (OpenAI vs Anthropic) – or just automatically fallback as earlier.

14. Testing and Debugging: Use VS Code’s Extension Development Host to test thoroughly the scenarios. Write some integration tests if possible (there is an @vscode/test package that can automate launching VS Code and sending commands, but testing the actual AI output might be tricky since it’s nondeterministic and requires API calls). At least test the functions that don’t call external services (e.g., test that loadRules() returns combined string).

15. Prepare for Packaging: Remove any console.log that is too verbose or might expose info. Add an acknowledgment or note in README about model usage and costs. Use vsce package to create a .vsix. If targeting open marketplace, consider the native module issue before publishing widely (maybe mark extension as preview).

By following these steps, you implement incrementally and verify each piece, which helps avoid being overwhelmed by the large scope.

⸻

Best Practices

To ensure a robust, user-friendly extension, keep these best practices in mind:
	•	Security: Never expose secrets or file contents unnecessarily. The WebView should not be able to access the user’s filesystem arbitrarily (we set localResourceRoots accordingly) ￼. Implement a strict CSP ￼ – e.g., if your webview doesn’t need to load images from internet, remove https: from allowed sources to prevent any inadvertent request. Also, sanitize any content that you insert into the DOM to avoid script injection. Using marked with sanitize: true or a library that escapes HTML can prevent malicious code in a file from doing bad things if it ends up in an answer (though by default, models shouldn’t output raw <script> tags, but better safe).
	•	Resource Management: Dispose of resources when done. For instance, if you create StatusBarItem or timers, dispose or clear them on extension deactivation or when not needed. Also handle onDidDispose of the WebView – if the panel is closed, perhaps cancel any ongoing generation to not waste tokens.
	•	Performance: We hammered on avoiding blocking code. Also consider using Throttle/Debounce for certain actions. For example, if you had a feature where the AI gives suggestions as you type (like inline suggestions), you’d debounce API calls. In chat, maybe debounce the input submission if user presses Enter multiple times accidentally.
	•	User Experience (UX):
	•	Provide visual feedback at all stages: spinner or “typing…” while waiting ￼ ￼, a clear way to cancel, and maybe disable the send button while the bot is responding to prevent queueing multiple messages (unless you support multi-question parallel which is harder).
	•	Maintain scroll position to show newest messages.
	•	Distinguish AI vs user messages clearly (different background color, maybe an “Arela:” label vs “You:” label).
	•	Respect the user’s theme and font preferences. You can use the CSS variables like --vscode-editor-font-family for the code blocks so that code in answers appears in the same font as in the editor ￼.
	•	Limit answer length if needed. Sometimes models can ramble or produce very long output. You can set max_tokens in the API call to a reasonable number for chat (maybe default to 1000 tokens). If answer was cut off, the user can always ask follow-up.
	•	Plan for empty or unknown answers: The model might say “I don’t know”. That’s fine, but ensure it doesn’t violate any style guidelines (like it might say something overly apologetic or include unwanted content). Having the persona and rules helps keep the style consistent.
	•	Commands and Settings: Provide user settings for API keys (though we prefer secrets API, some may still put key in settings for syncing across machines – if so, mark that setting as editPresentation: secret to hide input). Also allow configuring model (GPT-4 vs GPT-3.5) or whether to use Anthropic.
	•	Provide a Clear Conversation button to start fresh, which can reset SessionMemory.
	•	Include some help or documentation command – e.g., “Arela: Help” that opens a README or shows a quick message on how to use the chat (especially if keys are not set, guide the user).
	•	Testing & Iteration: Test with different question types (code-related, general, multi-hop, etc.). Where the assistant fails or behaves poorly, consider adjusting the prompt or adding rules. For example, if it starts giving very lengthy answers when not needed, perhaps add a rule “be concise”. Or if it uses insecure code, a security-first rule is already in place.
	•	Respect OpenAI/Anthropic policies: Ensure your extension doesn’t encourage misuse. If you detect the user prompt is asking for disallowed content (e.g., something clearly against policy), you might choose to refuse rather than forward to the API (to avoid getting your API key flagged). OpenAI’s own filters will handle some, but as a developer you should incorporate some basic checks if possible (the GovernanceMemory might be designed for this). For instance, if QueryClassifier or a custom classifier identifies a query as potentially unsafe, you can decline with a message.
	•	API Usage Monitoring: Given cost concerns, perhaps track how many tokens each user session uses and maybe provide a summary or warning if it’s very high (“You’ve used 100K tokens this session, roughly $2 of API usage.”). This is more of a user education feature.
	•	Upgradability: Code your extension such that components are modular (UI separate, logic separate) so that you can update parts easily. Perhaps you’ll later swap out the AI provider, or add support for the official VS Code “Chat” panel. Good separation now will make those changes easier.
	•	Analytics and Logging: If you plan to gather usage data (for your own debugging), remember to respect user privacy and possibly provide an opt-in. Don’t log code or queries externally without consent. It’s best to avoid sending anything anywhere except to the model APIs and the necessary context. If you put telemetry (e.g., using vscode.extensions.getExtension(...).telemetryReporter), anonymize data. But many extensions skip telemetry.

⸻

Common Pitfalls and Solutions

Be mindful of these common pitfalls when developing your VS Code AI extension, and how to avoid them:
	•	WebView not updating: If your webview doesn’t show new messages, make sure you are using panel.webview.postMessage correctly and that the webview’s script is attached to window.addEventListener('message', ...) ￼. A mistake is to do window.addEventListener('message', event => { ... }, false); in a script that executes before the DOM is loaded. Ensure your script is at bottom of body or use DOMContentLoaded event to set up the listener. Also, always JSON-serialize simple data (don’t try to send complex prototype objects).
	•	CSP violations: If you see errors in the webview console about content security policy, adjust the meta tag. For example, including 'unsafe-inline' for styles/scripts if you are not using external JS file. Or if using a CDN for highlight.js, include its domain in CSP (but better to bundle it to avoid that). A restrictive CSP like default-src 'none'; img-src https:; script-src 'self'; style-src 'self'; plus the ${webview.cspSource} as needed is recommended ￼. Not setting CSP at all is a security risk (the default allows nothing, which might break your webview if you don’t configure it).
	•	Memory leaks: If you create multiple webviews (maybe user opens multiple instances?), you might leak event handlers or duplicate processes. In our approach, we reuse a single panel. If you allow multiple, manage them in an array and clean up each on dispose. Also, if you use setInterval or similar in webview (e.g., blinking cursor), clear it when done.
	•	Large responses freezing UI: If the model returns a huge blob (like printing an entire file because user asked), adding that as one giant DOM update can stall the webview. Streaming mitigates this (renders incrementally). But if you know it’s going to be very large, consider truncating or paging. Perhaps impose a max tokens per answer and if it’s hit, cut off and say “[answer truncated]”. It’s better than crashing the webview. The user can refine the query if needed.
	•	Off-by-one errors in selection: If providing code context from selection, ensure you include exactly what user selected. One common bug is forgetting that getText(selection) returns exactly the text, but if the user has no selection (isEmpty), maybe take a whole line or function. Be cautious using editor.selection.active (cursor position) – you might inadvertently capture only part of a word. It’s usually safer to use isEmpty to decide if selection is useful or not.
	•	Multi-folder workspace: workspaceFolders can have multiple entries (monorepo scenario). Our code picks the first folder. This might be fine if Arela is configured per project. But you may want to support multiple – maybe not initially. At least mention in docs if only the first workspace is indexed.
	•	Parallel requests: If the user somehow sends a new question while one is generating (maybe by not disabling UI), you could end up with interleaved outputs. Our cancellation logic handles one case. Alternatively, queue them: but likely better to restrict to one at a time to avoid confusion (Copilot Chat doesn’t let you start a second query until first is done or cancelled).
	•	Tool access: Arela has multi-agent possibly calling tools (like DeepSeek, maybe it can run code?). If any part of Arela tries to execute code or shell commands, be very careful. Running user code automatically could be a security issue. Probably that’s not intended here, but just flagging: e.g., if the assistant can create files or run them, make sure to ask user confirmation.
	•	API Limits: Hitting OpenAI’s requests per minute or tokens per minute limits will cause errors. Implement backoff as discussed and consider aggregating multiple quick user questions into one queue to avoid spamming the API (though interactive chat usually isn’t that fast).
	•	Model hallucination: The AI might sometimes give incorrect answers about the code. Encourage verification by maybe providing file links. As a future improvement, you could hyperlink filenames in the answer to open that file in editor (there’s a way to post a command to open a file: vscode.open command with URI). Not a pitfall per se, but something to manage expectations: highlight that Arela’s answers might not always be 100% correct and user should review.
	•	Marketplace compliance: If publishing, ensure you’re not bundling disallowed binaries or dependencies with known vulnerabilities. Also, do not collect user data without consent (which we are not). And double-check your usage of branding – calling it “Arela Copilot” might conflict with GitHub’s trademark on “Copilot”; naming it just Arela is likely fine.

⸻

Resources and References

Below are some useful references and resources related to building AI-powered VS Code extensions and using the relevant APIs:
	•	VS Code Webview API Documentation – Explains how to create and work with webviews ￼ ￼. Covers messaging, theming, and security best practices for webviews.
	•	VS Code Chat Participant API Guide – If you want to integrate with VS Code’s native chat UX in the future ￼ ￼. Includes an example of extending the built-in Chat view.
	•	OpenAI API Reference – Official docs for Chat Completion API (for formatting messages, parameters like max_tokens, etc.) ￼.
	•	Anthropic API and SDK Docs – Guide for using Claude’s API with the Node SDK (as shown in Bronson Dunbar’s tutorial) ￼ ￼.
	•	Builder.io Blog on Streaming – “Stream OpenAI Chat Completions in JavaScript”, shows a browser-side perspective on streaming which we adapted for Node ￼ ￼.
	•	Stack Overflow Q&A on OpenAI Streaming – The thread “OpenAI Completion Stream with Node.js” where solutions for streaming with the OpenAI Node SDK are discussed ￼ ￼.
	•	VS Code Extension Samples – For general extension patterns (not AI specific). E.g., Microsoft’s vscode-webview-ui-toolkit on GitHub shows how to build webview UIs with React and the toolkit ￼. There’s also an official sample for a webview-based cat coding extension on VS Code’s repo.
	•	Continue (continuedev) – An open source VS Code extension for AI assistance (Chat, Agents) ￼. You can check their GitHub to see how they implement streaming and UI (though it may be quite complex).
	•	Sourcegraph Cody – Another example (partially open source) of an AI code assistant. The README of their VS Code extension ￼ ￼ describes features. They might not show all code, but their approach to context (Enhanced Context via embeddings) could be insightful.
	•	GitHub Copilot Chat Blog – “The Life of a Prompt” by S. Banerjee on Microsoft’s dev blog ￼ ￼. It provides a behind-the-scenes of Copilot Chat’s architecture: how it gathers workspace context, goes through a proxy, streams responses back. A great high-level overview that mirrors what we implement (minus the proxy since we call API directly).
	•	Elios Struyf’s Blog – He has many articles on VS Code webview techniques (like simplifying message passing, using secret storage, etc.) ￼ ￼.

Using these references, you can deepen understanding or troubleshoot specific pieces (for example, CSP setup or secret storage usage).

⸻

Testing Strategy

Testing an AI extension poses some challenges due to external dependencies (the AI APIs). However, you can still test much of the logic in isolation:
	•	Unit Test Memory and Context Logic: Write unit tests for functions like context assembly (e.g., given a query, ensure the expected files are chosen from ProjectMemory). Since Arela’s core is already tested (324 tests passing as you mentioned), focus on the glue code. If you can simulate a ProjectMemory with a small set of entries and verify that MemoryRouter picks the right ones for certain queries, that’s good.
	•	Mocking API calls: You could create a mock openai object that returns a preset stream of tokens for a known prompt. For instance, in test, replace generateWithOpenAI with one that emits a couple of fake tokens (“Hello”, “world”) and then done. This way you can test the webview message flow without hitting real API. Use dependency injection: pass a flag or use a different implementation when NODE_ENV=test.
	•	Integration Test with VS Code Test Runner: VS Code provides a harness to launch an actual VS Code instance with your extension and run tests (see vscode-test npm package). You can write a test that programmatically opens the chat panel (vscode.commands.executeCommand('arela.openChat')), then uses vscode.window.activeTextEditor to simulate typing a message. However, since the UI is in a webview, programmatic input is tricky. You might instead directly call your extension’s internal functions: e.g., directly call handleUserQuery("Hello") and wait for some result. Because the extension is running, you can reach its exported functions or use vscode.commands.executeCommand to simulate an action (if you expose a command that triggers a certain response).
	•	Manual Testing: This will be a big part. Run the extension in dev mode and try various scenarios:
	•	Ask a simple question (no code context).
	•	Ask something about the code that you expect it to find (to test ProjectMemory).
	•	Try a multi-hop question like the auth flow example and see if your decomposition logic works (log subqueries).
	•	Test feedback: click thumbs-up/down if you implemented, and check that FeedbackLearner’s data changed (maybe output to console for now).
	•	Try weird inputs (empty message, extremely long message, non-English queries) to see if any part breaks (e.g., JSON parse might fail on some Unicode, though unlikely).
	•	If possible, test on Windows, Mac, Linux at least once each (especially because of native modules – they might fail on one OS; e.g., better-sqlite3 might not load on Alpine Linux, etc.).
	•	Performance Testing: Not formal, but observe memory usage (via VS Code Process Explorer) when using the extension. Ensure no obvious leaks (each new conversation doesn’t leave behind orphan processes or increasing RAM that never frees).
	•	User Testing: If you have colleagues, let them try a pre-release. Often they will use it differently and catch edge cases (like copy-pasting multi-line code into the question, or resizing the panel which might break layout, etc.).

Since the answers from the AI can vary, automated testing of the exact output is not reliable (unless you set the model to a deterministic mode, which the APIs allow via temperature=0 and fixed prompts). You could do that for testing: use a fixed prompt and check the substring of answer contains expected text. But it’s fragile because model versions change.

Focus testing on your code’s outputs: did it send the right messages, did it load the right files, etc. You can instrument your code with logs (perhaps behind a debug flag) and use those logs in tests to verify behavior.

Finally, test the negative paths: if no API key, does it show the prompt to enter key? If the API returns an error, does it show an error message in chat UI?

By covering these bases, you can be confident in quality when releasing Arela VS Code AI Assistant. Good luck, and happy coding with AI!

⸻

sources:
	•	VS Code Webview API documentation ￼ ￼
	•	VS Code SecretStorage example ￼
	•	OpenAI streaming example (StackOverflow) ￼ ￼
	•	Anthropic streaming example ￼ ￼
	•	GitHub Copilot Chat internals (DevBlog) ￼ ￼