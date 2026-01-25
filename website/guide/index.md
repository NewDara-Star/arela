# What is Arela?

Arela is **The AI's Memory Layer for Vibecoding** — a minimal MCP-based system that solves context persistence for natural language software development.

## The Problem

When you chat with an AI about your codebase:
- It forgets everything between sessions
- It hallucinates about files it hasn't read
- It can't track what it changed or why
- You repeat the same context over and over

## The Solution

Arela provides an MCP tool suite that gives AI:

1. **Memory** — Persistent storage in `SCRATCHPAD.md`
2. **Identity** — Project rules in `AGENTS.md`
3. **Verification** — Must check facts before stating them
4. **Understanding** — Graph analysis of code dependencies
5. **Discovery** — Semantic search to find relevant code
6. **Focus** — Summarization to manage context window
7. **Translation (internal)** — Convert natural language to execution plans

## How It Works

```
┌─────────────────────────────────────────────────┐
│                   Your IDE                       │
│  (Cursor, Windsurf, Claude Desktop, etc.)       │
└─────────────────────┬───────────────────────────┘
                      │ MCP Protocol
                      ▼
┌─────────────────────────────────────────────────┐
│                 Arela v5                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Context │ │ Memory  │ │ Verify  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Graph  │ │ Vector  │ │  Focus  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Translate*│ │ Status  │ │   ...   │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
*Translate is internal-only (not exposed as an MCP tool yet).
                      │
                      ▼
              Your Codebase
```

## Next Steps

- [Getting Started](/guide/getting-started) — Install and configure Arela
- [Core Concepts](/guide/concepts) — Understand the philosophy
- [Workflow (11 Steps)](/guide/workflow) — How you run Arela end-to-end
- [Agent Prompts](/guide/prompts) — Identity prompts for each role
- [Tools Reference](/tools/) — Learn each MCP tool
