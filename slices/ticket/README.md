# Ticket Slice

## Purpose
Generate implementation tickets from JSON PRDs (e.g., `spec/prd.json`).

Tickets include YAML frontmatter with `id`, `feature`, and `status` (default `open`) for dashboard tracking.

## MCP Tools
| Tool | Description |
|------|-------------|
| `arela_ticket_generate` | Generate a ticket for a single feature from a JSON PRD |

## Files
- `generator.ts` - Ticket generation logic
- `ops.ts` - Public API
- `types.ts` - Types
