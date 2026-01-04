# Context Slice

## Purpose
Manages reading and providing project context (AGENTS.md + SCRATCHPAD.md) to AI via MCP.

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_context` | Returns both AGENTS.md and SCRATCHPAD.md content |
| `arela_status` | Quick project status overview |

## Files
- `mcp-tools.ts` - MCP tool implementations
- `types.ts` - TypeScript types for context data

## Usage
AI calls `arela_context` at the START of every session to understand:
1. Project rules (from AGENTS.md)
2. Current state (from SCRATCHPAD.md)
