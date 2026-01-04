# Getting Started

## Prerequisites

- Node.js 18+
- An MCP-compatible IDE (Cursor, Windsurf, Claude Desktop, etc.)
- Optional: Ollama (for semantic search)
- Optional: OpenAI API key (for Focus & Translate)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/NewDara-Star/arela.git
cd arela
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Configure Your IDE

Create or edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "arela": {
      "command": "node",
      "args": ["/path/to/arela/dist/src/cli.js", "mcp"],
      "env": {
        "CWD": "/path/to/your/project"
      }
    }
  }
}
```

### 5. Create Project Files

Create `AGENTS.md` in your project root:

```markdown
# AGENTS.md

## Project Rules
1. Read SCRATCHPAD.md at session start
2. Update SCRATCHPAD.md after significant work
3. Verify facts before stating them
```

Create `SCRATCHPAD.md`:

```markdown
# SCRATCHPAD.md

**Last Updated:** [date]

## Current Session
- Started new project
```

## Optional: Enable All Features

### Semantic Search (Ollama)

```bash
# Install Ollama
brew install ollama

# Start Ollama
ollama serve

# Arela will auto-pull the embedding model
```

### Focus & Translate (OpenAI)

Create `.env` in the arela folder:

```
OPENAI_API_KEY=sk-your-key-here
```

## Verify Installation

```bash
# Run the test suite
npm run test
```

## 6. Start Your First Session
+
+ **CRITICAL:** At the start of every session, you must initialize the context.
+
+ Ask your AI:
+ > "Run `arela_context` to load the project rules."
+
+ This loads `AGENTS.md` and `SCRATCHPAD.md` into the AI's memory.
+
+ ## Next Steps

- [View Dashboard](/dashboard) — See your live codebase graph
- [Core Concepts](/guide/concepts) — Understand the philosophy
- [Tools Reference](/tools/) — Learn each MCP tool
