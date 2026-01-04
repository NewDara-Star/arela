# Memory Slice

## Purpose
Handles persistence of session memory to SCRATCHPAD.md.

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_update` | Updates SCRATCHPAD.md with session progress |

## Files
- `mcp-tools.ts` - MCP tool for updating scratchpad
- `scratchpad.ts` - File operations for scratchpad

## Usage
AI calls `arela_update` at the END of a work session to save:
1. What was accomplished
2. Decisions made
3. Next steps

This creates persistent memory that survives across sessions.
