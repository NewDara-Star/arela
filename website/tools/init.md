# arela init

Bootstrap a repo so it is ready for Arela.

## Usage

```bash
arela init
```

## What it does
- Creates/updates `.mcp.json` for the current repo
- Writes the constitution into `AGENTS.md`
- Writes a Claude-friendly copy into `.claude/CLAUDE.md` (overwrites)
- Copies `prompts/` into the repo
- Scaffolds `website/` (dashboard site) into the repo
- Creates `spec/prd.json` and `spec/stack.json` placeholders
- Creates `SCRATCHPAD.md` if missing
- Creates `task.md` if missing
- Adds `.arela/` and `.mcp.json` to `.gitignore` (if missing)
- Creates `.arelaignore` with privacy defaults
- Writes `.windsurfrules` and `.cursorrules`, and updates `~/.gemini/GEMINI.md` if it exists
- Runs graph indexing first, then vector indexing (Graph → RAG)
- Exports dashboard data to `.arela/dashboard.json` and `website/public/dashboard.json`
- Starts the MCP server in the background

## Notes
- Indexing requires Ollama; init will attempt to start it.
- After init, paste your PRD and stack into `spec/prd.json` and `spec/stack.json`.
