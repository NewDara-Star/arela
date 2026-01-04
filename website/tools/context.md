# arela_context

Load project identity and session memory.

## Purpose

This is the **first tool AI should call** at the start of every session. It loads:

1. `AGENTS.md` — Project rules and identity
2. `SCRATCHPAD.md` — Session history and memory

## Parameters

None.

## Returns

Combined text containing both files:

```
📁 Project: /path/to/project

## AGENTS.md (Project Rules)
[contents of AGENTS.md]

## SCRATCHPAD.md (Session Memory)
[contents of SCRATCHPAD.md]
```

## Example Usage

In your IDE, the AI might say:

> "Let me read the project context first..."

And call `arela_context` to understand:
- What rules it should follow
- What happened in previous sessions
- Current state of the project

## When to Use

- **Always** at the start of a new session
- After a long pause in conversation
- When you say "Read context" or similar

## Implementation

Located in `src/mcp/server.ts`:

```typescript
const agents = await fs.readFile(agentsPath, "utf-8");
const scratchpad = await fs.readFile(scratchpadPath, "utf-8");

let contextText = `📁 Project: ${projectPath}\n\n`;
contextText += `## AGENTS.md\n\n${agents}\n\n`;
contextText += `## SCRATCHPAD.md\n\n${scratchpad}\n`;
```

## Related Tools

- [arela_update](/tools/update) — Write to scratchpad
- [arela_status](/tools/status) — Quick health check
