# VS Code AI Agent Research Prompt

**Date:** 2025-11-15  
**Purpose:** Research how to build a complete AI agent inside a VS Code extension  
**Target:** ChatGPT & Gemini for comprehensive guidance

---

## Prompt for ChatGPT & Gemini

```
I'm building a VS Code extension with a complete AI agent (like GitHub Copilot Chat or Cursor). I need comprehensive guidance on building the chat interface, AI integration, and real-time streaming.

## Context

**What I'm Building:**
An AI-powered coding assistant called Arela that runs entirely inside VS Code as an extension.

**Current State:**
- CLI tool with 324 tests passing (production-ready)
- Hexi-Memory system (6-layer context management)
- Code summarization (AST + LLM)
- Multi-agent orchestration (Codex, Claude, DeepSeek, Ollama)
- Learning from feedback (dynamic weight adjustment)
- Rules system (30+ rules in `.arela/rules/`)
- Persona system (`arela-cto.md` - CTO personality)

**What I Have Built (TypeScript/Node.js - 151 files, 2046 functions, 324 tests passing):**

**Memory System (6 layers - 380 lines):**
- `src/memory/hexi-memory.ts` - HexiMemory class (orchestrates all 6 layers)
- `src/memory/session.ts` - SessionMemory class (459 lines, current conversation)
- `src/memory/project.ts` - ProjectMemory class (654 lines, codebase knowledge)
- `src/memory/user.ts` - UserMemory class (617 lines, user preferences)
- `src/memory/vector.ts` - VectorMemory class (212 lines, semantic search/RAG)
- `src/memory/graph.ts` - GraphMemory class (604 lines, dependency graph)
- `src/memory/governance.ts` - GovernanceMemory class (298 lines, audit trail)

**Context & Routing (164 lines):**
- `src/context-router.ts` - ContextRouter class (routes queries to memory layers)
- `src/meta-rag/router.ts` - MemoryRouter class (layer selection)
- `src/meta-rag/classifier.ts` - QueryClassifier class (query type detection)

**Code Summarization (1,566 lines total):**
- `src/summarization/code-summarizer.ts` - CodeSummarizer class (197 lines)
- `src/summarization/extractor/ast-extractor.ts` - ASTExtractor class (598 lines, tree-sitter)
- `src/summarization/synthesizer/llm-synthesizer.ts` - LLMSynthesizer class (271 lines)
- `src/summarization/cache/semantic-cache.ts` - SemanticCache class (224 lines)

**Learning System (353 lines):**
- `src/learning/feedback-learner.ts` - FeedbackLearner class (278 lines)
  - Tracks helpful/not helpful feedback
  - Adjusts layer weights (+10%/-10%)
  - Detects common mistake patterns
  - Stores in Governance layer

**Multi-Hop Reasoning (739 lines):**
- `src/reasoning/decomposer.ts` - QueryDecomposer class (311 lines)
- `src/reasoning/multi-hop-router.ts` - MultiHopRouter class (293 lines)
- `src/reasoning/combiner.ts` - ResultCombiner class (135 lines)

**Persona & Rules:**
- `src/persona/templates/arela-cto.md` - AI persona (CTO personality)
- `.arela/rules/` - 30+ enforcement rules (pragmatic-visionary, security-first, etc.)

**Total Codebase:**
- 151 TypeScript files
- 2,046 functions
- 824 imports
- 324 tests passing
- Production-ready

**What I Need to Build:**
A VS Code extension that has its own AI agent with chat interface, streaming responses, and integration with my existing systems.

---

## Real-World Use Cases (How It Will Work)

### Use Case 1: User Asks Question
```
User types in chat: "How does authentication work?"

Extension flow:
1. Get user message from WebView
2. Load context from HexiMemory (using ContextRouter)
   - Query SessionMemory for recent conversation
   - Query ProjectMemory for auth-related code
   - Query VectorMemory for semantic search
   - Query GraphMemory for dependencies
3. Classify query type (QueryClassifier → "PROCEDURAL")
4. Route to relevant layers (MemoryRouter → Vector, Graph, Project)
5. Construct AI prompt with:
   - Persona from arela-cto.md
   - Rules from .arela/rules/
   - Context from memory layers
6. Stream response from OpenAI/Anthropic
7. Display tokens in WebView as they arrive
8. Store conversation in SessionMemory
9. Track feedback (FeedbackLearner)
```

### Use Case 2: Complex Multi-Hop Query
```
User types: "How does auth flow work from login to dashboard?"

Extension flow:
1. Detect complexity (QueryDecomposer)
2. Break into sub-queries:
   - "What is the login endpoint?"
   - "How is the token generated?"
   - "How is the session created?"
   - "What is the dashboard route?"
3. Execute each hop (MultiHopRouter)
4. Combine results (ResultCombiner)
5. Stream unified response to WebView
```

### Use Case 3: Code Summarization
```
User hovers over function in editor

Extension flow:
1. Get function at cursor position (VS Code API)
2. Check cache (SemanticCache)
3. If cache miss:
   - Extract AST (ASTExtractor)
   - Synthesize summary (LLMSynthesizer)
   - Store in cache
4. Display tooltip with summary
```

### Use Case 4: Learning from Feedback
```
User clicks "Not Helpful" on AI response

Extension flow:
1. Record feedback (FeedbackLearner)
2. Prompt for corrections:
   - "Which layers should have been used?"
   - "What was the correct query type?"
3. Adjust weights (+10% correct, -10% incorrect)
4. Store in GovernanceMemory (audit trail)
5. Show updated stats in UI
```

---

## Core Requirements

### 1. Chat Interface (WebView)

**Requirements:**
- Sidebar panel with chat UI (like Copilot Chat)
- User can type messages and send
- AI responses stream token-by-token (not all at once)
- Markdown rendering with syntax highlighting
- Code blocks with copy button
- Conversation history (scrollable)
- Loading indicators during AI calls
- Error messages when AI fails

**UI Elements:**
- Input box at bottom
- Send button (or Enter to send)
- Message bubbles (user vs AI)
- Syntax-highlighted code blocks
- Copy button on code blocks
- Timestamps on messages
- Clear conversation button

### 2. AI Streaming Integration

**Requirements:**
- Integrate OpenAI API (GPT-4o-mini) for AI responses
- Integrate Anthropic API (Claude) as alternative
- Stream responses token-by-token (Server-Sent Events or streaming API)
- Display tokens as they arrive (not wait for full response)
- Handle API keys securely (VS Code secrets storage)
- Manage rate limits and retries
- Show token usage and costs
- Fallback to Ollama (local) when offline or API fails

**AI Providers:**
- Primary: OpenAI (gpt-4o-mini)
- Alternative: Anthropic (claude-3-5-sonnet)
- Fallback: Ollama (llama3.2, qwen2.5)

### 3. Context Management

**Requirements:**
- Load context from my existing Hexi-Memory system
- Include current file content
- Include user's selection/cursor position
- Include relevant code from workspace
- Manage token limits (don't exceed context window)
- Prioritize most relevant context

**Context Sources:**
- Current file (active editor)
- User selection
- Hexi-Memory (6 layers: Session, Project, User, Vector, Graph, Governance)
- Workspace files (via semantic search)

### 4. WebView Communication

**Requirements:**
- Send messages from extension → WebView (AI responses)
- Send messages from WebView → extension (user input)
- Handle async operations (AI calls in background)
- Update UI from background tasks
- Cancel ongoing AI requests
- Handle errors gracefully

### 5. Integration with Existing Systems

**Requirements:**
- Load and use Hexi-Memory for context
- Load rules from `.arela/rules/` and enforce them
- Load persona from `arela-cto.md` and inject into system prompt
- Use FeedbackLearner to track helpful/not helpful
- Use Multi-Hop Router for complex queries
- Orchestrate other agents (Codex, Claude) when needed

### 6. Performance & UX

**Requirements:**
- Don't block UI during AI calls (async/background)
- Show progress indicators (loading spinner, typing indicator)
- Cancel ongoing requests if user sends new message
- Retry failed requests automatically
- Handle errors with user-friendly messages
- Fast response time (<2s for simple queries)

---

## Research Questions

### Part 1: Chat Interface Architecture

**Q1.1:** What's the best architecture for a chat interface in VS Code?
- WebView with React/Vue/Svelte?
- WebView with vanilla JavaScript?
- Native VS Code components (TreeView)?
- Pros/cons of each approach?

**Q1.2:** How do I create a WebView panel in VS Code?
- WebViewPanel API?
- How to register the panel?
- How to show/hide the panel?
- How to persist state across sessions?

**Q1.3:** How do I render Markdown with syntax highlighting in WebView?
- Which library to use (marked.js, markdown-it)?
- How to add syntax highlighting (Prism.js, highlight.js)?
- How to style code blocks?
- How to add copy button to code blocks?

**Q1.4:** How do I handle user input in WebView?
- Text input field at bottom?
- Send button vs Enter key?
- How to prevent form submission?
- How to focus input after sending?

**Q1.5:** How do I display streaming responses in real-time?
- Append tokens as they arrive?
- Update last message bubble?
- Smooth scrolling to bottom?
- Handle partial Markdown (incomplete code blocks)?

### Part 2: AI Streaming Integration

**Q2.1:** How do I integrate OpenAI streaming API in VS Code extension?
- Use `openai` npm package?
- How to stream responses (Server-Sent Events)?
- How to handle streaming in Node.js?
- Code example for streaming chat completion?

**Q2.2:** How do I integrate Anthropic streaming API?
- Use `@anthropic-ai/sdk` npm package?
- How to stream responses?
- How to handle streaming in Node.js?
- Code example for streaming messages?

**Q2.3:** How do I manage API keys securely in VS Code?
- VS Code secrets storage API?
- How to prompt user for API key?
- How to store and retrieve securely?
- How to handle missing API keys?

**Q2.4:** How do I handle rate limits and errors?
- Detect rate limit errors (429)?
- Retry with exponential backoff?
- Show user-friendly error messages?
- Fallback to alternative provider?

**Q2.5:** How do I show token usage and costs?
- Track tokens used per request?
- Calculate costs (OpenAI pricing)?
- Display in UI (status bar or chat)?
- Warn user when approaching limits?

### Part 3: WebView Communication

**Q3.1:** How do I send messages from extension to WebView?
- `webview.postMessage()` API?
- Message format (JSON)?
- How to handle different message types?
- Code example?

**Q3.2:** How do I send messages from WebView to extension?
- `vscode.postMessage()` in WebView?
- `webview.onDidReceiveMessage()` in extension?
- How to handle async responses?
- Code example?

**Q3.3:** How do I stream AI responses to WebView?
- Send each token as separate message?
- Batch tokens for performance?
- How to signal end of stream?
- How to handle errors mid-stream?

**Q3.4:** How do I update WebView from background tasks?
- AI call runs in background (async)?
- Update WebView as tokens arrive?
- How to avoid blocking UI?
- Code example?

### Part 4: VS Code API Integration

**Q4.1:** How do I get current file content?
- `vscode.window.activeTextEditor` API?
- How to read file content?
- How to get file path?
- How to watch for changes?

**Q4.2:** How do I get user's selection?
- `editor.selection` API?
- How to get selected text?
- How to get cursor position?
- How to get line numbers?

**Q4.3:** How do I access workspace files?
- `vscode.workspace.findFiles()` API?
- How to read file contents?
- How to search across files?
- How to handle large workspaces?

**Q4.4:** How do I show notifications and progress?
- `vscode.window.showInformationMessage()`?
- `vscode.window.withProgress()` for long operations?
- Status bar items?
- Progress indicators in WebView?

### Part 5: Integration with Existing Code

**Q5.1:** How do I import and use my existing TypeScript code?
- Import from `src/memory/hexi-memory.ts`?
- Import from `src/context-router.ts`?
- Do I need to refactor anything?
- How to handle async operations?

**Q5.2:** How do I load files from disk in extension?
- Load `.arela/rules/*.md` files?
- Load `arela-cto.md` persona?
- Use Node.js `fs` module?
- Handle file paths correctly?

**Q5.3:** How do I bundle native modules (tree-sitter, better-sqlite3)?
- These are native Node.js modules
- How to include in `.vsix` package?
- Do I need to rebuild for different platforms?
- Alternative solutions?

**Q5.4:** How do I handle dependencies?
- Use existing `package.json` dependencies?
- Add new dependencies for extension?
- Bundle size considerations?
- How to optimize?

### Part 6: Performance & Optimization

**Q6.1:** How do I avoid blocking the UI?
- Run AI calls in background?
- Use Web Workers?
- Use async/await properly?
- Best practices?

**Q6.2:** How do I handle cancellation?
- User sends new message while AI is responding?
- Cancel ongoing API request?
- AbortController API?
- Clean up resources?

**Q6.3:** How do I optimize for large codebases?
- Lazy loading?
- Incremental indexing?
- Pagination for results?
- Memory management?

**Q6.4:** How do I cache responses?
- Cache AI responses for same queries?
- Cache code summaries?
- Where to store cache (workspace storage)?
- Invalidation strategy?

### Part 7: Examples & Best Practices

**Q7.1:** What are the best open-source AI chat extensions to study?
- Continue.dev (open source AI assistant)
- Cody (Sourcegraph's AI assistant)
- Tabnine Chat
- Any others?

**Q7.2:** How does GitHub Copilot Chat work?
- Architecture (if documented)?
- How do they handle streaming?
- How do they render Markdown?
- Best practices they follow?

**Q7.3:** What are VS Code extension best practices for AI assistants?
- UX patterns?
- Performance optimization?
- Error handling?
- User settings/configuration?

**Q7.4:** What are common pitfalls to avoid?
- WebView security issues?
- Memory leaks?
- API key exposure?
- Performance problems?

---

## Specific Technical Questions

**T1:** How do I implement streaming chat with OpenAI in a VS Code WebView?
- Complete code example from extension to WebView
- Handle streaming responses
- Display tokens as they arrive
- Handle errors

**T2:** How do I render Markdown with syntax-highlighted code blocks in WebView?
- Which libraries to use?
- How to style code blocks?
- How to add copy button?
- Complete code example

**T3:** How do I securely store and retrieve API keys in VS Code?
- VS Code secrets API
- Prompt user for API key
- Store securely
- Retrieve for API calls
- Complete code example

**T4:** How do I communicate between extension and WebView for chat?
- Send user message from WebView → extension
- Call AI API in extension
- Stream response back to WebView
- Update UI in real-time
- Complete code example

**T5:** How do I bundle tree-sitter and better-sqlite3 (native modules) in extension?
- These require native compilation
- How to include in `.vsix`?
- Cross-platform support?
- Alternative solutions?

**T6:** How do I load and inject my persona/rules into AI system prompt?
- Load `arela-cto.md` from disk
- Load rules from `.arela/rules/`
- Construct system prompt
- Inject into OpenAI/Anthropic API
- Complete code example

**T7:** How do I implement "Cancel" for ongoing AI requests?
- User sends new message while AI responding
- Cancel previous request
- Clean up resources
- Start new request
- Complete code example

**T8:** How do I show typing indicator while AI is thinking?
- Display "Arela is typing..." in chat
- Show loading spinner
- Update when response starts
- Complete code example

---

## What I Need from You

Please provide:

### 1. Architecture Recommendations
- Best approach for chat UI (React vs vanilla vs native)
- WebView vs alternative approaches
- Folder structure for extension code
- Separation of concerns (extension host vs WebView)

### 2. Complete Code Examples

**Example 1: Chat Interface Setup**
```typescript
// How to create WebView panel
// How to load HTML/CSS/JS
// How to handle lifecycle
```

**Example 2: AI Streaming Integration**
```typescript
// How to stream from OpenAI
// How to stream from Anthropic
// How to handle tokens
// How to send to WebView
```

**Example 3: WebView Communication**
```typescript
// Extension side: send/receive messages
// WebView side: send/receive messages
// Handle async operations
```

**Example 4: Context Loading**
```typescript
// Get current file content
// Get user selection
// Load from Hexi-Memory
// Construct context for AI
```

**Example 5: Error Handling**
```typescript
// Handle API errors
// Handle rate limits
// Show user-friendly messages
// Retry logic
```

### 3. Best Practices
- Security (API keys, WebView CSP)
- Performance (async, caching, optimization)
- UX (loading states, error messages, cancellation)
- Testing (how to test WebView, how to test AI integration)

### 4. Step-by-Step Implementation Guide
1. Scaffold extension
2. Create WebView panel
3. Implement chat UI
4. Integrate OpenAI streaming
5. Connect extension ↔ WebView
6. Load context from Hexi-Memory
7. Inject persona and rules
8. Handle errors and edge cases
9. Optimize performance
10. Package and test

### 5. Common Pitfalls & Solutions
- What mistakes do people make?
- How to avoid them?
- Debugging tips
- Performance issues

### 6. Resources & References
- Official VS Code extension docs
- OpenAI streaming docs
- Anthropic streaming docs
- Example extensions (GitHub links)
- Community best practices
- Tutorials and guides

---

## Success Criteria

The extension should:
- ✅ Have a chat interface that feels like Copilot/Cursor
- ✅ Stream AI responses in real-time (token-by-token)
- ✅ Render Markdown with syntax-highlighted code
- ✅ Load context from my existing Hexi-Memory system
- ✅ Use my persona and rules
- ✅ Handle errors gracefully
- ✅ Work offline (fallback to Ollama)
- ✅ Be fast (<2s response time)
- ✅ Not block the UI
- ✅ Be secure (API keys in secrets storage)

---

## Constraints

- Must work with existing TypeScript codebase
- Must support OpenAI, Anthropic, and Ollama
- Must handle native modules (tree-sitter, better-sqlite3)
- Must be production-ready (error handling, logging)
- Must be fast and responsive
- Must work offline

---

## Expected Output

Please provide comprehensive guidance including:

1. **Architecture document** with diagrams (Mermaid)
2. **Complete code examples** for all components
3. **Step-by-step implementation guide**
4. **Best practices** for AI chat extensions
5. **Common pitfalls** and how to avoid them
6. **Resource links** to docs and examples
7. **Testing strategy** for WebView and AI integration

Focus on practical, production-ready solutions with real code examples.

Thank you!
```

---

## Additional Context (If Needed)

**Existing Codebase Structure:**
```
arela/ (151 files, 2046 functions, 324 tests)
├── src/
│   ├── memory/                  # 6-layer memory system (3,643 lines)
│   │   ├── hexi-memory.ts       # HexiMemory class (380 lines)
│   │   ├── session.ts           # SessionMemory (459 lines)
│   │   ├── project.ts           # ProjectMemory (654 lines)
│   │   ├── user.ts              # UserMemory (617 lines)
│   │   ├── vector.ts            # VectorMemory/RAG (212 lines)
│   │   ├── graph.ts             # GraphMemory (604 lines)
│   │   └── governance.ts        # GovernanceMemory (298 lines)
│   ├── context-router.ts        # ContextRouter (164 lines)
│   ├── meta-rag/
│   │   ├── router.ts            # MemoryRouter (layer selection)
│   │   └── classifier.ts        # QueryClassifier (query types)
│   ├── summarization/           # Code summarization (1,566 lines)
│   │   ├── code-summarizer.ts   # CodeSummarizer (197 lines)
│   │   ├── extractor/
│   │   │   └── ast-extractor.ts # ASTExtractor (598 lines)
│   │   ├── synthesizer/
│   │   │   └── llm-synthesizer.ts # LLMSynthesizer (271 lines)
│   │   └── cache/
│   │       └── semantic-cache.ts # SemanticCache (224 lines)
│   ├── learning/                # Learning system (353 lines)
│   │   └── feedback-learner.ts  # FeedbackLearner (278 lines)
│   ├── reasoning/               # Multi-hop (739 lines)
│   │   ├── decomposer.ts        # QueryDecomposer (311 lines)
│   │   ├── multi-hop-router.ts  # MultiHopRouter (293 lines)
│   │   └── combiner.ts          # ResultCombiner (135 lines)
│   └── persona/
│       └── templates/
│           └── arela-cto.md     # AI persona
├── .arela/
│   ├── rules/                   # 30+ enforcement rules
│   └── memory/
│       ├── graph.db             # SQLite (dependency graph)
│       ├── session.db           # SQLite (conversation)
│       ├── project.db           # SQLite (codebase knowledge)
│       └── user.db              # SQLite (preferences)
└── package.json
```

**Key Classes I Need to Import in Extension:**
```typescript
// These are production-ready and tested
import { HexiMemory } from './memory/hexi-memory.js';
import { ContextRouter } from './context-router.js';
import { CodeSummarizer } from './summarization/code-summarizer.js';
import { FeedbackLearner } from './learning/feedback-learner.js';
import { QueryDecomposer } from './reasoning/decomposer.js';
import { MultiHopRouter } from './reasoning/multi-hop-router.js';
import { QueryClassifier } from './meta-rag/classifier.js';
import { MemoryRouter } from './meta-rag/router.js';
```

**Key Dependencies:**
- openai (for GPT-4o-mini)
- @anthropic-ai/sdk (for Claude)
- ollama (for local models)
- tree-sitter (AST parsing - native module)
- better-sqlite3 (database - native module)

---

## How to Use This Prompt

1. **Copy entire prompt above**
2. **Paste into ChatGPT or Gemini**
3. **Save response to:** `RESEARCH/vscode-ai-agent-chatgpt.md` or `RESEARCH/vscode-ai-agent-gemini.md`
4. **Review and extract:**
   - Architecture decisions
   - Code examples
   - Best practices
   - Implementation steps

---

**This prompt focuses specifically on building the AI agent with chat interface, streaming, and integration with existing systems.** 🚀
