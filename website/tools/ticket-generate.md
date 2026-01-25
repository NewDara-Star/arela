# arela_ticket_generate

Generate an implementation ticket from a JSON PRD feature.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prdPath` | string | Yes | Path to JSON PRD (e.g., `spec/prd.json`) |
| `featureId` | string | Yes | Feature ID (e.g., `FEAT-001`) |
| `outputDir` | string | No | Output directory (default: `spec/tickets`) |

## Returns

JSON with the ticket ID and file path.

## Notes
- JSON PRDs are treated as external source-of-truth artifacts.
- Tickets are generated in markdown using the Ticket Format from `AGENTS.md`.
- Tickets include YAML frontmatter (`id`, `feature`, `status`) for dashboard tracking.
