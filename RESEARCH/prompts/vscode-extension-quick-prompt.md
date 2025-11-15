# VS Code Extension - Quick Research Prompt

**For:** ChatGPT & Gemini  
**Purpose:** Fast, focused research on VS Code extension essentials

---

## Quick Prompt (Copy-Paste Ready)

```
I'm building a VS Code extension for an AI coding assistant (like Cursor/Copilot). I have an existing TypeScript CLI tool with:
- Code summarization (AST + LLM)
- Semantic search (RAG)
- Multi-agent orchestration
- MCP server (already works in Windsurf)

I need to build a VS Code extension with:
1. Chat interface (sidebar panel)
2. Hover tooltips (AI summaries on hover)
3. Semantic search panel
4. Right-click context menu
5. Inline code suggestions

Key questions:

1. **Architecture:** Should I use WebView or native VS Code components for the chat UI?

2. **Integration:** How do I reuse my existing TypeScript codebase (`src/context-router.ts`, `src/summarization/`, etc.) in the extension?

3. **Native Modules:** How do I bundle tree-sitter and better-sqlite3 (native modules) in a VS Code extension?

4. **Chat UI:** What's the best way to implement a chat interface with Markdown rendering and syntax highlighting?

5. **Hover Provider:** How do I implement hover tooltips that show AI-generated summaries with <100ms latency?

6. **Performance:** How do I avoid blocking the UI during heavy operations (indexing, AI calls)?

7. **MCP Integration:** Can I run my existing MCP server inside the extension, or should it be a separate process?

8. **Examples:** What are the best VS Code extensions to study for reference (GitHub Copilot, Cursor, etc.)?

Please provide:
- Architecture recommendations
- Code examples for chat UI and hover provider
- Best practices for performance
- Step-by-step setup guide
- Common pitfalls to avoid

Focus on practical, production-ready solutions. Include code examples in TypeScript.
```

---

## Why This Prompt Works

**Concise:** Gets to the point quickly  
**Specific:** Focuses on our exact needs  
**Actionable:** Asks for code examples and step-by-step guides  
**Practical:** Emphasizes production-ready solutions

---

## Expected Response Time

- **ChatGPT:** 2-3 minutes for comprehensive answer
- **Gemini:** 2-3 minutes for comprehensive answer

---

## What to Look For in Responses

1. **Architecture clarity** - WebView vs native components
2. **Code examples** - Actual TypeScript code
3. **Performance tips** - How to keep it fast
4. **Integration strategy** - How to reuse existing code
5. **Best practices** - What successful extensions do

---

## Next Steps After Research

1. Review both ChatGPT and Gemini responses
2. Compare recommendations
3. Create architecture document
4. Build proof-of-concept
5. Create implementation tickets
6. Start building v5.0.0

---

**Use this for quick research, use the full prompt for comprehensive guidance!** 🚀
