# IDE Integration

Get the most out of Arela by integrating it deeply with your AI IDE.

## The Two Integration Points

### 1. MCP Configuration (Tools)

This connects Arela's **tools** to your IDE. Add to `.mcp.json` in your project:

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

Or run `arela init` inside the repo to generate `.mcp.json` automatically.

Some IDEs (Codex extension, Claude Code) manage MCP servers via their own CLI/config files. See the IDE-specific sections below for those setups.

### 2. User Rules (Personality + Governance)

This injects Arela's **rules and persona** into every AI session. **Copy the contents of `AGENTS.md` into your IDE's user rules file.**

## IDE-Specific Instructions

### Antigravity (Google)

1. Open `~/.gemini/GEMINI.md`
2. Paste the entire contents of `AGENTS.md`
3. Every new chat will have the rules pre-loaded

```bash
# Quick copy command
cat /path/to/your/project/AGENTS.md > ~/.gemini/GEMINI.md
```

### Windsurf (Codeium)

1. Create `.windsurfrules` in your project root
2. Paste the contents of `AGENTS.md`
3. Windsurf will read this file for project-specific rules

```bash
cp AGENTS.md .windsurfrules
```

### Cursor

1. Open Settings → Rules for AI
2. Paste the contents of `AGENTS.md`
3. Rules apply to all chats in that workspace

### Claude Desktop

1. Create a project in Claude
2. Add `AGENTS.md` as a file in the project
3. Claude will reference it in conversations

### VS Code (Codex extension)

Codex stores MCP config in `~/.codex/config.toml`, shared between the CLI and IDE extension.

**CLI (recommended):**
```bash
codex mcp add arela --env CWD=/path/to/your/project -- node /path/to/arela/dist/src/cli.js mcp
```

**Manual config (`~/.codex/config.toml`):**
```toml
[mcp_servers.arela]
command = "node"
args = ["/path/to/arela/dist/src/cli.js", "mcp"]
[mcp_servers.arela.env]
CWD = "/path/to/your/project"
```

To open the config from the Codex extension: gear icon → Codex Settings → Open config.toml.

### Claude Code

**CLI (recommended):**
```bash
claude mcp add arela node /path/to/arela/dist/src/cli.js mcp
```

Claude Desktop can also connect MCP servers via Settings > Developer.

## Why This Matters

Without user rules integration:
- AI starts each session "blank"
- Must call `arela_context` to learn rules
- Relies on AI reading and following AGENTS.md

With user rules integration:
- Rules are in the **system prompt**
- AI knows your rules before you say anything
- Governance is enforced at the deepest level

## The Enforcement Stack

| Layer | File | Purpose |
|-------|------|---------|
| **System Prompt** | IDE user rules | Rules always visible |
| **MCP Tools** | `.mcp.json` | Context, verify, search, etc. |
| **Session Guard** | `server.ts` | Blocks tools until context read |
| **Pre-commit Hook** | `.git/hooks` | Reminds to update SCRATCHPAD |

## Recommended Setup

1. **Configure MCP** (gives AI tools)
2. **Copy AGENTS.md to user rules** (gives AI personality + governance)
3. **Run `arela_context` at session start** (loads project state)
4. **Run `arela_update` at session end** (saves progress)

This combination gives you:
- ✅ Full MCP tool access
- ✅ CTO persona in every response
- ✅ Governance rules pre-loaded
- ✅ Cross-session memory persistence

## Keeping Rules in Sync

When you update `AGENTS.md`, remember to:

1. Update your IDE's user rules file
2. Commit the changes to git
3. The pre-commit hook will remind you to update SCRATCHPAD

Consider adding this to your workflow:
```bash
# After editing AGENTS.md
cp AGENTS.md ~/.gemini/GEMINI.md  # or your IDE's rules file
git add AGENTS.md
git commit -m "Updated project rules"
```
