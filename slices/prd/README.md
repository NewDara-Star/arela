# PRD Slice

The **PRD Slice** manages Product Requirement Documents - the "source code" of the Natural Language Programming paradigm.

## Philosophy

> "The PRD is not documentation; it is the source of truth from which the application is derived."

In Arela v5, Markdown PRDs function as Abstract Syntax Trees (ASTs). The YAML frontmatter carries compilation state, and the structured sections map to specialized agents.

If you keep JSON PRDs (e.g., `spec/prd.json`), treat them as external source-of-truth artifacts. The PRD slice can now parse JSON PRDs for feature extraction.

## MCP Tools

| Tool | Action | Purpose |
|------|--------|---------|
| `arela_prd` | `list` | Find all PRDs in project |
| `arela_prd` | `parse` | Parse PRD and extract sections |
| `arela_prd` | `status` | Get PRD status and progress |
| `arela_prd` | `create` | Create new PRD from template |
| `arela_prd` | `parse-json` | Parse JSON PRD (`spec/prd.json`) |
| `arela_prd` | `json-features` | List features in JSON PRD |
| `arela_prd` | `json-feature` | Get a feature by ID |

## Frontmatter Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique requirement ID (e.g., REQ-001) |
| `title` | string | Human-readable title |
| `type` | enum | `feature` \| `bugfix` \| `refactor` |
| `status` | enum | `draft` \| `approved` \| `implemented` \| `verified` |
| `priority` | enum | `high` \| `medium` \| `low` |
| `context` | string[] | VSA scope paths (globs) |
| `tools` | string[] | Permitted MCP tools |
| `handoff` | object | Next agent configuration |

## Section-to-Agent Mapping

| Section | Agent | Output |
|---------|-------|--------|
| `## User Stories` | Test Agent | Gherkin `.feature` files |
| `## Data Models` | Architect Agent | TypeScript interfaces |
| `## API Endpoints` | Backend Agent | Route handlers |
| `## UI Design` | Frontend Agent | React components |
| `## Non-Functional` | DevOps Agent | Infrastructure config |

## Files

- `types.ts` - TypeScript interfaces + Zod schemas
- `parser.ts` - Markdown parsing + frontmatter extraction
- `ops.ts` - Business logic (list, parse, status, create)
